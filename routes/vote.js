const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.send('Unauthorized');
});

router.post('/login', (req, res, next) => {
  if(req.body.nim != null || req.body.nim != "" || req.body.nim != undefined){
    req.db.collection('db_pemilih').findOne({nim: Number(req.body.nim)}, function(err, result) {
      if(err){console.log("PERHATIAN: ",err);}
      if(!result){
        res.json({ success: false, message: 'Authentication failed. NIM tidak terdaftar.' });
      }
      else if (result){
        if(req.body.password != result.password){
          res.json({ success: false, message: 'Authentication failed. Password salah.' });
        }else{
          if(result.sudahMemilih){
            res.json({ success: false, message: 'Anda sudah melakukan voting.', pernahMemilih: true});
          }
          else{
            let payload = {
              nim: result.nim
            }
            var token = jwt.sign(payload, config.secret, {expiresIn: 60});
            res.json({ success: true, message: 'Selamat Datang.', token: token});
          }
        }
      }
    });
  }
});

router.post('/submit', (req, res, next) => {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, config.secret, function(err, decoded) {      
      if (err) {
        res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        if(req.body.nim == decoded.nim){
          req.db.collection('db_kandidat').update({no_urut: Number(req.body.no_urut)}, { $inc: { suara: 1}}, function(err, result){
            if(err) {console.log("PERHATIAN: ",err);}
            else{
              req.db.collection('db_kandidat').update({ no_urut: Number(req.body.no_urut)}, { $set: {last_updated: Date.now()}}, function(err, res){
                if(err) {console.log("PERHATIAN: ",err);}
                else{
                  req.db.collection('db_pemilih').update({nim: Number(req.body.nim)}, {$set: {sudahMemilih: true}}, function(err, result){
                    if(err) {console.log("PERHATIAN: ",err);}
                  });
                }
              });
            }
          });  
          res.json({ success: true, message: 'Terima kasih sudah memilih.' });
        }
        else{
          res.json({ success: false, message: 'Invalid token data' });
        }
      }
    });
  } 
  else {
    res.status(403).send({ success: false, message: 'No token provided.'});
  }
});

module.exports = router;
