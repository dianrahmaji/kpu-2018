const express = require('express');
const config = require('../config');
const crypto = require('crypto');
const secrect = 'abcdefg';
const router = express.Router();

router.get('/', function(req, res, next) {
  res.send('Unauthorized');
});

router.post('/login-admin', (req, res, next) => {
  if(req.body.username != null || req.body.username != "" || req.body.username != undefined){
    req.db.collection('db_admin').findOne({username: req.body.username}, function(err, result) {
      if(err){console.log("PERHATIAN: ",err);}
      if(!result){
        res.json({ success: false, message: 'Authentication failed. username tidak terdaftar.' });
      }
      else if (result){
        if(req.body.password != crypto.createDecipher("SHA256", secrect).update(result.password).final("ascii")){
          res.json({ success: false, message: 'Authentication failed. Password salah.' });
        }else{
            res.json({ success: true, message: 'Selamat Datang.'});
        }
      }
    });
  }
});

router.post('/submit', (req, res, next) => { 
});

module.exports = router;
