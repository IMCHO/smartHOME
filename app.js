const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

var SerialPort = require("serialport");
var serialPort = new SerialPort("COM6", { baudRate: 9600 });
const Readline = SerialPort.parsers.Readline;
const parser = new Readline();
const { Sensor, Formula } = require('./models');

require('dotenv').config();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const { sequelize } = require('./models');

const app = express();
sequelize.sync();

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

serialPort.pipe(parser);
serialPort.open(() => {
  console.log("접속되었습니다.");
  //console.log(serialPort.read(8));
  parser.on('data', async (data) => {
    //console.log("data received: " + data);
    const sensor = data.split('/');
    //console.log(sensor[0]);
    //console.log(sensor[1]);

    var num = parseInt(sensor[1]);
    var r = 0.7;

    try {
      const humi = await Sensor.findAll({
        attributes: ['humidity', 'temperature'],
        order: [['id', 'DESC']],
        limit: 4,
      });

      //console.log(humi[3].humidity);
      //console.log(num);
      if (humi) {
        for (var s in humi) {
          //console.log(humi[s].humidity);
          //console.log(Math.pow(r, parseInt(s) + 1) * humi[s].humidity);
          num += (Math.pow(r, parseInt(s) + 1) * humi[s].humidity);

          //console.log(num);
        }
        //console.log(sensor[2]);
        if(sensor[2].substr(0,1)=='d'){
          //console.log('okokokokok');
          var disTemp = humi[0].temperature;
          var disHumi = humi[0].humidity;
          var discomfort = (9 / 5 * disTemp - 0.55 * (1 - disHumi / 100) * (9 / 5 * disTemp - 26) + 32);
          var dis = 1;
          if (discomfort >= 80) dis = 4;
          else if (discomfort >= 75) dis = 3;
          else if (discomfort >= 68) dis = 2;
          else dis = 1;

          var dry = 1;
          if (humi[0].humidity <= 25 && humi[1].humidity <= 25) dry = 3;
          else if (humi[0].humidity <= 35 && humi[1].humidity <= 35) dry = 2;
          else dry = 1;

          Formula.create({
            drying_index:dry,
            discomfort_index:dis,
          });

          Formula.findOne({
            order:[['id','DESC']],
          }).then((data)=>{
            //console.log(data.drying_index);
            serialPort.write(data.drying_index.toString());
            //serialPort.write("1");
          }).catch((err)=>{
            console.error(err);
          });
          
          /*
          serialPort.write(dryData.drying_index, (err, result) => {
  
          });*/
        }
      }
    } catch (error) {
      console.error(error);
    }
    //console.log(num);
    num *= (1 - r);
    //console.log(num);
    //console.log(discomfort);
    try {
      await Sensor.create({
        temperature: parseInt(sensor[0]),
        humidity: parseInt(sensor[1]),
        effectiveHumi: num,
      });
    } catch (error) {
      console.log(error);
    }
  });
});
