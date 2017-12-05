const express = require('express');
const hbs = require('hbs');
const hbsutils = require('hbs-utils')(hbs);
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const paginate = require('express-paginate');
const json2xls = require('json2xls');
const expressMongoDb = require('express-mongo-db');

var config = require('./config');
var index = require('./routes/index');
var vote = require('./routes/vote');

var app = express();
app.use(paginate.middleware(10, 1000));
app.use(json2xls.middleware);
app.use(expressMongoDb(config.database));

// view engine setup
hbs.registerPartials(__dirname + '/views/partials');
hbs.registerHelper('for', function(from, to, incr, block) {
  var accum = '';
  for(var i = from; i < to; i += incr)
      accum += block.fn(i);
  return accum;
});
hbs.registerHelper('ifCond', function (v1, operator, v2, options) {
      switch (operator) {
          case '==':
              return (v1 == v2) ? options.fn(this) : options.inverse(this);
          case '===':
              return (v1 === v2) ? options.fn(this) : options.inverse(this);
          case '!=':
              return (v1 != v2) ? options.fn(this) : options.inverse(this);
          case '!==':
              return (v1 !== v2) ? options.fn(this) : options.inverse(this);
          case '<':
              return (v1 < v2) ? options.fn(this) : options.inverse(this);
          case '<=':
              return (v1 <= v2) ? options.fn(this) : options.inverse(this);
          case '>':
              return (v1 > v2) ? options.fn(this) : options.inverse(this);
          case '>=':
              return (v1 >= v2) ? options.fn(this) : options.inverse(this);
          case '&&':
              return (v1 && v2) ? options.fn(this) : options.inverse(this);
          case '||':
              return (v1 || v2) ? options.fn(this) : options.inverse(this);
          default:
              return options.inverse(this);
      }
  });
hbsutils.registerWatchedPartials(__dirname + '/views/partials');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret:'s3cr3t',
  saveUninitialized: true,
  resave: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use('/', index);
app.use('/vote', vote);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.redirect('/');
});

//database connnection
/**
MongoClient.connect(config.database, function(err, database){
    if(!err){
      console.log("Connected to db");
      app.locals.db = database;
    }else{
      console.log('Failed to connect to db');
    }
});
**/
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
