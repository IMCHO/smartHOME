var express = require('express');
var router = express.Router();

//var ledStatus = false;



router.get('/', function (req, res, next) {
  //ledStatus = ledStatus ? false : true;
  //console.log(serialPort.read());
  /*serialPort.write(ledStatus ? "1" : "0", (err, result) => {
  
  });*/
  
  res.render('index', { title: 'Express' });
});

module.exports = router;
