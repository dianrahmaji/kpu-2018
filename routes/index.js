const express = require('express');
const router = express.Router();
const bcrypt= require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const shortid = require('shortid');
const convertExcel = require('excel-as-json').processFile;
const multer = require('multer');
const config = require('../config');
const generatePassword = require('password-generator');
var mongoose = require('mongoose');
const crypto = require('crypto');
const secrect = 'abcdefg';
mongoose.connect(config.database);

var Schema = mongoose.Schema;
var adminSchema = new Schema({
  username: String,
  password: String
});
var SuperSchema = new Schema({
  username: String,
  password1: String,
  password2: String,
  password3: String
})
var addmin = mongoose.model('User', adminSchema, 'db_admin');
var addsumin = mongoose.model('Super',SuperSchema, 'db_superadmin');

var isValidPassword = function(user, password){
  return bcrypt.compareSync(password, user.password);
}

var isSuperValidPassword = function(user, password1, password2, password3){
  return bcrypt.compareSync(password1, user.password1) && bcrypt.compareSync(password2, user.password2) && bcrypt.compareSync(password3, user.password3);
}

function isAdmin (req, res, next) { 
  if(req.user.role == "user"){
  return next(); 
  } 
  else{ 
  req.flash('denied', "Invalid user authorization"); 
  res.redirect(307, '/'); 
  } 
  };
function adminAuthenticated(req, res, next) {
  if (req.user.role == "admin" || req.user.role == "superadmin"){
    return next();
  }
  else if (req.user.role == "superadmin"){
    res.redirect('/login-superadmin');
  }
  else {
	res.redirect('/login-admin');
  }
}

router.get('/login-admin', function(req, res, next) {
  res.render('login-admin');
});

router.get('/genpassword', isAdmin, (req, res, next) => {
  req.db.collection('db_pemilih').find({}).limit(4).sort({createdAt: -1}).toArray(function(err, result){
    if (!err){
      res.render('genpassword', {title: 'Dashboard', data: result});
    }
    else{
      res.render('genpassword', {title: 'Dashboard'});
    }
  });
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

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '.xlsx')
  }
});
var upload = multer({dest: './public/uploads/'});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } 
  else {
    res.redirect('/');
  }
}

// function adminAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) {
//     return next();
//   }
//   else {
//     res.redirect('/login-admin');
//   }
// }


/* GET Routes*/
router.post('/createsuperadmin', ensureAuthenticated, (req, res, next) => { 
  if(req.body.username == undefined){ 
  res.json({status: 400, message: "Isi Username dengan benar"}); 
  } 
  else if(req.body.password1 == undefined){ 
  res.json({status: 400, message: "Isi Password 1 dengan benar"}); 
  } 
  else if(req.body.password2 == undefined){ 
  res.json({status: 400, message: "Isi Password 2 dengan benar"}); 
  } 
  else if(req.body.password3 == undefined){ 
  res.json({status: 400, message: "Isi Password 3 dengan benar"}); 
  } 
  else{ 
  req.db.collection('db_superadmin').findOne({username: req.body.username}, function(err, result){ 
  if(!err){ 
  if(result != null){ 
  res.json({status: 400, message: "Username sudah digunakan"}); 
  } 
  else{ 
  let data = { 
  username: req.body.username, 
  password1: bcrypt.hashSync(req.body.password1, bcrypt.genSaltSync(10), null), 
  password2: bcrypt.hashSync(req.body.password2, bcrypt.genSaltSync(10), null), 
  password3: bcrypt.hashSync(req.body.password3, bcrypt.genSaltSync(10), null), 
  createdAt: Date.now() 
  } 
  req.db.collection('db_superadmin').insertOne(data, function(err, result){ 
  if(!err){ 
  console.log("PERHATIAN", data); 
  res.json({status: 200, data: data}); 
  }else{ 
  res.json({status: 400, message: "Error menginput data"}); 
  } 
  }); 
  } 
  } 
  else{ 
  res.json({status: 500, message: "Internal Server Error"}); 
  } 
  }); 
  } 
  });
  router.get('/superadmin', adminAuthenticated, (req, res, next) => { 
    req.db.collection('db_superadmin').find({}).limit(4).sort({createdAt: -1}).toArray(function(err, result){ 
        if (!err){ 
        res.render('superadmin', {title: 'Dashboard', data: result}); 
        } 
        else{ 
        res.render('superadmin', {title: 'Dashboard'}); 
        } 
      }); 
    });  
  router.get('/', (req, res, next) => {
    if(req.user.role == 'admin' || req.user.role == 'superadmin'){
      req.db.collection('db_pemilih').count(function(err, result){
        if(err){
          console.log(err);
          res.render('index', {title: 'Dashboard'});
        } 
        else {
          let total = result;
          req.db.collection('db_pemilih').find({sudahMemilih: true}).count(function(err, result){
            if(err){
              console.log(err);
              res.render('index', {title: 'Dashboard'});
            }
            else  {
              let sudahMilih = result;
              let belumMilih = total - result;
              res.render('index', { title: 'Dashboard', total: total, sudahMemilih: sudahMilih, belumMemilih: belumMilih});
            }
          });
        }
     });
    }else{
      res.render('login', {title: 'Unauthorized'});
    }
  });
// router.get('/adsmin', (req, res, next)=> )
  router.get('/login-admin', (req, res, next) => {
    res.render('login-admin');
  });

  router.get('/login-superadmin', (req, res, next) => {
    res.render('login-superadmin');
  });

  router.get('/genpassword', adminAuthenticated, (req, res, next) =>{
    req.db.collection('db_pemilih').find({}).limit(4).sort({createdAt: -1}).toArray(function(err, result){
      if (!err){
        res.render('genpassword', {title: 'Dashboard', data: result});
      }
      else{
        res.render('genpassword', {title: 'Dashboard'});
      }
    });
  });

  router.get('/logout', ensureAuthenticated, (req, res, next) => {
    req.logout();
    res.redirect('/');
  });

  router.get('/admin', adminAuthenticated, (req, res, next) => {
    req.db.collection('db_admin').find({}).limit(4).sort({createdAt: -1}).toArray(function(err, result){
      if (!err){
        res.render('admin', {title: 'Dashboard', data: result});
      }
      else{
        res.render('admin', {title: 'Dashboard'});
      }
    });
  });

  router.get('/input', adminAuthenticated, (req, res, next) => {
    req.db.collection('db_pemilih').find({}).limit(4).sort({createdAt: -1}).toArray(function(err, result){
      if (!err){
        res.render('input', {title: 'Dashboard', data: result});
      }
      else{
        res.render('input', {title: 'Dashboard'});
      }
    });
  });

  router.get('/lihat', adminAuthenticated, (req, res, next) => {
    req.db.collection('db_pemilih').find({}).sort({angkatan: -1, nim: 1}).toArray(function(err, result){
      if(!err){
        let totalPemilih = result.length; //total data
        let pageSize = 10; //mau dibagi berapa data per page
        let banyakPage = Math.round(totalPemilih/pageSize); //berarti butuh sekian page
        let currentPage = 1; //index page sekarang
        let dataArray = []; //data per page
        let data = [];
        //split list into groups
        while (result.length > 0) {
          dataArray.push(result.splice(0, pageSize)); //pecah result per pageSize
        }
  
        //set current page if specifed as get variable (eg: /?page=2)
        if (typeof req.query.page !== 'undefined') {
          currentPage = req.query.page;
        }
        //show list of students from group
        data = dataArray[currentPage - 1];
        res.render('daftar', 
        {
          title: 'Daftar',
          totalPemilih: totalPemilih,
          dataArray: dataArray, 
          pageSize: pageSize,
          banyakPage: banyakPage,
          currentPage: currentPage,
          data: data});
      }
      else{
        res.render('daftar', {title: 'Daftar'});
     }
    });
  });

router.get('/download', adminAuthenticated, (req, res, next) => {
  req.db.collection('db_pemilih').find({}).toArray(function(err, result) {
    if(err) {console.log(err);}
    else{
      res.xls('data_pemilih.xlsx', result);
    }
  });
});

router.get('/search', adminAuthenticated, (req, res, next) => {
  let searchString = req.query.s;
  req.db.collection('db_pemilih').find({$or:
  [
    {nama:{$regex:searchString, $options:'i'}},
    {nim:{$regex:searchString, $options:'i'}}]}).toArray(function(err, result){
      if(!err){
        res.render('pencarian', 
        {
          title: 'Daftar',
          data: result});
      }
      else{
        res.render('pencarian', {title: 'Daftar'});
      }
    }); 
});


/** POST Routes. */
router.post('/auth', passport.authenticate('local', {failureRedirect:'/', failureFlash: true}), (req, res) => {
  res.redirect('/');
});

router.post('/perhitungan', adminAuthenticated, (req, res, next) => {
  bcrypt.compare(req.body.password, config.password, function(err, result){
    if(!err) {
      if(result){
        req.db.collection('db_kandidat').find({}).toArray(function(err, result){
          if(err){console.log(err);}
          let hasil = [];
          let terbesar = 0;
          for(let i = 0; i<result.length; i++){
            let data = {};
            data.no_urut = result[i].no_urut;
            data.nama = result[i].nama;
            data.perolehan_suara = result[i].suara;
            if(data.perolehan_suara > terbesar){
              terbesar = data.perolehan_suara;
            }
            
            hasil.push(data);
          }

          let patokan = Math.round((terbesar + 10)/10)*10;
          res.render('perhitungan', {title: "Rekapitulasi Suara", data: JSON.stringify(hasil), terbesar:terbesar, patokan: patokan});
        });
      }else{
        res.redirect('/');
      }
    }else{
      res.redirect('/');
    }
  });
});

router.post('/delete', adminAuthenticated, (req, res, next) => {
  req.db.collection('db_pemilih').findOne({nim: Number(req.body.nim)}, function(err, output) {
    if(err){
      console.log(err);
    }
    if(output.sudahMemilih){
      res.json({success:false});
    }
    else{
      req.db.collection('db_pemilih').remove({nim: Number(req.body.nim)}, function(err, result){
        if(err){console.log(err);}
        if(result){
          res.json({success: true});
        }
        else{
          res.json({success: false});
        }
      });
    }
  });
});

router.post('/import', adminAuthenticated, upload.single('excel'), (req, res, next) => {
  console.log(req.file);
  convertExcel(req.file.destination+req.file.filename, null, {omitEmptyFields: true}, (err, data) =>{
    if(err) {console.log('error', err);}
    else{
      data.forEach((item) => {
        item.createdAt = Date.now();
        item.sudahMemilih = false;
        req.db.collection('db_pemilih').findOne({nim: item.nim}).then(function(result){
          if(result != null){
            console.log("PERHATIAN: NIM: "+item.nim+" | Skipped");
          }
          else{
            req.db.collection('db_pemilih').insertOne(item).then(function(result){
              console.log("PERHATIAN: NIM: "+item.nim+" | OK");
            });
          }
        });
      })
    }
  });
  res.send('OK');
});

router.post('/submit', isAdmin, (req, res, next) => {
  if(req.body.nim == undefined || req.body.nim.length != 5){
    res.json({status: 400, message: "Isi nim dengan benar"});
  }
  else{
    req.db.collection('db_pemilih').findOne({nim: Number(req.body.nim)}, function(err, result){
      if(!err){
        if(result != null){
          if(!result.sudahMemilih){
          req.db.collection('db_pemilih').update({nim: Number(req.body.nim)}, {$set: {password: generatePassword(7, false), createdAt : Date.now()}}, function(err, result){
            if(err) {console.log("PERHATIAN: ",err);}
            else {console.log("PERHATIAN", result);
                  res.json({status: 200, result});}
            });
          }
          else{
            res.json({status: 400, result : result});
          }
        }
        //else{
          //let data = {
            //nama: nama,
            //nim: Number(req.body.nim),
            //password: shortid.generate(),
            //sudahMemilih: false,
            //angkatan: Number(req.body.angkatan),
            //createdAt: Date.now()
          //}
          //req.db.collection('db_pemilih').insertOne(data, function(err, result){
            //if(!err){
              //console.log("PERHATIAN", data);
              //res.json({status: 200, data: data});
            //}else{
              //res.json({status: 400, message: "Error menginput data"});
            //}
          //});
        //}
      }
      else{
        res.json({status: 500, message: "Internal Server Error"});
      }
    });
  }
});

router.post('/createadmin', adminAuthenticated, (req, res, next) => {
  if(req.body.username == undefined || req.body.username.length < 6){
    res.json({status: 400, message: "Isi username dengan benar"});
  }
  else if(req.body.password == undefined){
    res.json({status: 400, message: "Isi password dengan benar"});
  }
  else{
    req.db.collection('db_admin').findOne({username: req.body.username}, function(err, result){
      if(!err){
        if(result != null){
            res.json({status: 400, message: "Username sudah digunakan"});
          }
          else{
            let data = {
            username: req.body.username,
            password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10), null),
            createdAt: Date.now()
          }
          req.db.collection('db_admin').insertOne(data, function(err, result){
            if(!err){
              console.log("PERHATIAN", data);
              res.json({status: 200, data: data});
            }else{
              res.json({status: 400, message: "Error menginput data"});
            }
          });
          }
      }
      else{
        res.json({status: 500, message: "Internal Server Error"});
      }
    });
  }
});
router.post('/login',
  passport.authenticate('login', { successRedirect: '/genpassword',
                                   failureRedirect: '/login-admin',
                                   failureFlash: true })
);
router.post('/superlogin',
  passport.authenticate('superlogin',{successRedirect: '/perhitungan',
                                      failureRedirect: '/login-superadmin',
                                      failureFlash: true }));
//ADMIN WEB AUTHECTICATION
passport.use('local', new LocalStrategy(
  {usernameField: 'password', passwordField: 'password'}, function(username, password, done){
    bcrypt.compare(password, config.password, function(err, res){
      if(!err) {
        if(res){
          console.log('SUKSES LOGIN');
          let user = {role: 'admin'};
          return done(null, user);
        }else{
          return done(null, false);
        }
      }else{
        return done(null, false);
      }
    });
}))

// passport/login.js
passport.use('login', new LocalStrategy({
  passReqToCallback : true
},
function(req, username, password, done) { 
  // check in mongo if a user with username exists or not
  addmin.findOne({ 'username' :  username }, 
    function(err, addmin) {
      // In case of any error, return using the done method
      if (err)
        return done(err);
      // Username does not exist, log error & redirect back
      if (!addmin){
        console.log('User Not Found with username '+username);
        return done(null, false, 
              req.flash('message', 'User Not found.'));                 
      }
      // User exists but wrong password, log the error 
      if (!isValidPassword(addmin, password)){
        console.log('Invalid Password');
        return done(null, false, 
            req.flash('message', 'Invalid Password'));
      }
      // User and password both match, return user from 
      // done method which will be treated like success
      let add = {role: 'user'};
      return done(null, add);
    }
  );
}));

passport.use('superlogin', new LocalStrategy({
  passReqToCallback : true
},
function(req, username, password1, password2, password3, done) { 
  // check in mongo if a user with username exists or not
  addsumin.findOne({ 'username' :  username }, 
    function(err, addsumin) {
      // In case of any error, return using the done method
      if (err)
        return done(err);
      // Username does not exist, log error & redirect back
      if (!addsumin){
        console.log('User Not Found with username '+username);
        return done(null, false, 
              req.flash('message', 'User Not found.'));                 
      }
      // User exists but wrong password, log the error 
      if (!isSuperValidPassword(addmin, password1, password2, password3)){
        console.log('Invalid Password');
        return done(null, false, 
            req.flash('message', 'Invalid Password'));
      }
      // User and password both match, return user from 
      // done method which will be treated like success
      let add = {role: 'superadmin'};
      return done(null, add);
    }
  );
}));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

module.exports = router;
