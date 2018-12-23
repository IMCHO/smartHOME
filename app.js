const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

var SerialPort = require("serialport");
// node.js 서버와 아두이노 간의 시리얼 통신을 위해 npm에 있는 serialport 패키지를 설치 후 require()문으로 불러옴
var serialPort = new SerialPort("COM6", { baudRate: 9600 });
// 컴퓨터에 연결되어 있는 아두이노의 포트 정보(여기서는 COM6)를 첫번째 인자에 넣고, 보드레이트는 아두이노의 보드레이트를 기입
const Readline = SerialPort.parsers.Readline;
// 아두이노에서 오는 데이터를 \n을 기준으로 나누기 위해 파싱 함수 사용
const parser = new Readline();
// 위에서 등록한 파싱 함수를 parser라는 변수에 할당

const { Sensor, Formula } = require('./models');
// models 폴더에 있는 데이터베이스 정의 파일 sensor.js와 formula.js를 require() 함수로 불러옴

require('dotenv').config();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const { sequelize } = require('./models');
// MYSQL 데이터베이스 사용을 위해 models 폴더의 index.js에서 sequelize를 require() 함수로 불러옴

const app = express();
sequelize.sync(); // sequelize 사용을 시작

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('port', process.env.PORT || 8001);

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser('process.env.COOKIE_SECRET'));
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
}));
app.use(flash());

app.use('/', indexRouter);
app.use('/users', usersRouter);


// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 대기 중');
});

serialPort.pipe(parser);                      //  pipe() 함수를 통해 위에서 만든 parser 변수 사용
serialPort.open(() => {                       //  위에서 설정한 COM6 포트가 열리면 콜백함수 실행
  console.log("접속되었습니다.");
  parser.on('data', async (data) => {         //  아두이노에서 데이터를 보내면 콜백함수 실행
    const sensor = data.split('/');
    //  아두이노로부터 온 데이터가 data 변수에 저장이 되고 미리 설정해둔 delimeter(여기서는 /)를 기준으로 split
    var num = parseInt(sensor[1]);
    //  아두이노에서 '온도/습도/PIR센서감지유무' 이런 식으로 데이터를 보내왔으므로 split 이후 sensor[1]에 저장되는 정보는 습도 정보
    //  받는 데이터는 String 변수이기 때문에 데이터 가공을 위해 parseInt() 함수로 정수로 변환
    var r = 0.7;
    //  불쾌지수 계산을 위해 필요한 변수 설정

    try {
      const humi = await Sensor.findAll({         // sensor.js 데이터베이스에서 
        attributes: ['humidity', 'temperature','effectiveHumi'],  // humidity, temperature, effectiveHumi 컬럼을 
        order: [['id', 'DESC']],                  // id 기준 내림차순으로 
        limit: 4,                                 // 데이터 4개 추출해서 humi 변수에 저장
      });

      if (humi) {                                 // 위에서 성공적으로 데이터를 추출한 경우
        for (var s in humi) {                     // 데이터 4개를 한번에 가져왔으므로 for문 적용
          num += (Math.pow(r, parseInt(s) + 1) * humi[s].humidity);
          //  건조지수 공식을 적용하여 결과를 num 변수에 저장(아직 최종결과가 아님)
        }
        if (sensor[2].substr(0, 1) == 'd') {      // 세번째에 저장된 데이터가 d인 경우(PIR 센서가 사람을 감지한 경우)
          var disTemp = humi[0].temperature;
          var disHumi = humi[0].humidity;
          var discomfort = (9 / 5 * disTemp - 0.55 * (1 - disHumi / 100) * (9 / 5 * disTemp - 26) + 32);
          //  temperature와 humidity값을 가져와 불쾌지수 계산
          var dis = 1;
          if (discomfort >= 80) dis = 4;
          else if (discomfort >= 75) dis = 3;
          else if (discomfort >= 68) dis = 2;
          else dis = 1;
          // 불쾌지수 정도에 따라 등급 나눔

          var dry = 1;
          if (humi[0].effectiveHumi <= 25 && humi[1].effectiveHumi <= 25) dry = 3;
          else if (humi[0].effectiveHumi <= 35 && humi[1].effectiveHumi <= 35) dry = 2;
          else dry = 1;
          // 실효습도(effectiveHumi) 정도에 따라 건조지수 결정

          Formula.create({          // formula.js 데이터베이스의
            drying_index: dry,      // drying_index 컬럼과
            discomfort_index: dis,  // discomfort_index 컬럼에 값을 insert
          });

          Formula.findOne({                                   //  formula.js 데이터베이스에서
            order: [['id', 'DESC']],                          //  id 기준 내림차순으로 데이터를 하나 추출
          }).then((data) => {                                 //  추출된 값이 data변수에 저장
            serialPort.write(data.drying_index.toString());   //  write() 함수를 사용해 건조지수를 아두이노에게 다시 넘김
          }).catch((err) => {
            console.error(err);
          });
        }
      }
    } catch (error) {
      console.error(error);
    }
    
    num *= (1 - r);   // 최종으로 effectiveHumi(실효습도) 계산

    try {
      await Sensor.create({                 //  sensor.js 데이터베이스의
        temperature: parseInt(sensor[0]),
        humidity: parseInt(sensor[1]),
        effectiveHumi: num,                 //  각 컬럼에 값을 insert
      });
    } catch (error) {
      console.log(error);
    }
  });
});
