const Sequelize = require('sequelize');             // MYSQL을 효과적으로 사용하기 위해 sequelize 패키지 사용
const env = process.env.NODE_ENV || 'development';  // 환경변수 설정
const config = require('../config/config')[env];    // config 폴더의 config.json에서 설정한 데이터베이스 파일 관련 정보 사용

const db = {};

const sequelize = new Sequelize(                              // 위에서 불러온 config 변수를 통해 데이터베이스 파일명과 아이디, 비밀번호 설정
  config.database, config.username, config.password, config,
);

db.sequelize = sequelize;
db.Sequelize = Sequelize;     // sequelize 사용

db.Sensor = require('./sensor')(sequelize, Sequelize);
db.Formula = require('./formula')(sequelize, Sequelize);    // sensor.js와 formula.js 사용

module.exports = db;