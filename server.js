var nconf = require('nconf'),
	mongoose = require('mongoose'),
	express = require('express'),
	logger = require('morgan'),
	app = express(),
	errorHandler = require('errorhandler'),
	path = require('path'),
	favicon = require('serve-favicon'),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	MongoStore = require('connect-mongo')(session),
	bodyParser = require('body-parser'),
	ejs = require('ejs'),
	passport = require('passport'),
	FB = require('fb');

/** facebook util **/
FB.genericCallback = function(callback){
	return function(res){
		if(!res || res.error) {
		   callback(res ? res.error : error);
	  	}else{
			callback(null, res);
		}
	};
};

/** config **/
nconf.argv()
   .env()
   .file({ file: 'config.json' });
var conf_env = "ENV_" + nconf.get("ENV");
console.log("Loading configuration: " + conf_env);
var env = nconf.get(conf_env);

/** models **/
var User = require('./models/User.js')(mongoose, FB);
function sendSMS(callback, user){

}

/** database **/
console.log('Configuring database: ');

// Connection
var dbUrl = nconf.get("MONGO_URL");
console.log('Database URL: ' + dbUrl);
var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function() {
	//connected
	console.log("Connected to " + dbUrl);
});
mongoose.connect(dbUrl);

/** session **/
app.use(session({
	resave: true,
	saveUninitialized: true,
	secret: nconf.get("SESSION_SECRET"),
	store: new MongoStore({mongooseConnection: mongoose.connection})
}));

/** logging **/
app.use(logger('dev'));

/** cookies **/
app.use(cookieParser());

/** post **/
app.use(bodyParser());

/** error handler **/
app.use(errorHandler());

/** favicon **/
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

/** hoiio **/
// init hoiio sdk with app_id and access_token
var hoiio_config = nconf.get("HOIIO"), hoiio = require('./hoiio.js')(hoiio_config["APP_ID"], hoiio_config["ACCESS_TOKEN"], hoiio_config["NUMBER"]);

/** authentication **/
//FACEBOOK
require('./oauth_facebook.js')(app, User, passport, nconf.get("PROVIDER_FACEBOOK"));

//session
function assertLoggedIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

function logout(req, res){
	req.logout();
	res.redirect('/login');
}

/** templating **/
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'templates'));
app.engine('html', ejs.renderFile);

/** static **/
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/images', express.static(__dirname + '/images'));
app.use('/public', express.static(__dirname + '/public'));

/** routes **/
app.get('/', assertLoggedIn, function(req, res){
	if(req.user.phone == ""){
		res.redirect('/register-phone');
	}else{
		res.redirect('/request-rescue');
	}
});
app.get('/login', function(req, res){
	res.render('login', {user : null});
});
app.get('/register-phone', assertLoggedIn, function(req,res){
	res.render('register-phone', {err : null, user : req.user || null});
});
app.post('/register-phone', function(req,res){
	req.user.generateOTP(function(err, user){
		if(err){
			res.render('register-phone', {user: req.user || null, err : err});
		}else{
			console.log("SENT TO " + user.OTP.phone);
			hoiio.sendSMS(function(){
				res.render('index', {err: null, user : req.user || null, action: "OTP"});
			}, user.OTP.phone, 'AWKWARD TURTLE RESCUER REGISTRATION Following is your one-time password: ' + user.OTP.number);
			res.redirect('/check-otp');
		}
	}, req.body.phone);
});
app.get('/request-rescue', assertLoggedIn, function(req, res){
	res.render('request-rescue', {user : req.user || null});	
});
app.get('/check-otp', assertLoggedIn, function(req, res){
	res.render('check-otp', {user : req.user || null});	
});
app.post('/check-otp', function(req, res){
	req.user.checkOTP(function(err){
		if(err){
			res.render('register-phone', {user: req.user || null, err : err});
		}else{
			res.redirect('/');
		}
	}, req.body.OTP_number);
});

//call
app.get('/reset',function(req,res){
	User.remove({}, function(){
		res.send('reset');
	});
});
app.get('/test',function(req,res){
	hoiio.makeCall(function(err){
		res.send("Attempted call " + err);
	}, req.user.phone);	
});
app.get('/api/call', function(req, res){
	var seconds = 30;
	setTimeout(function(){
		hoiio.makeCall(function(err){
			console.log("Attempted call ", err);
		}, req.user.phone);
	}, 1000 * seconds);
	res.send(JSON.stringify({phone : req.user.phone, seconds : seconds}));
});

// login
// see oauth_facebook.js

// logout
app.get('/logout', logout);

// html example
app.get('/html', function(req, response){
	response.status(200);
	response.set('Content-Type', 'text/html');
	response.end('<html><body>' +
	'<h1>Hello</h1>' +
	'</body></html>'
	);
});

/** listen **/
port = env.PORT;
app.listen(port, function(){
	console.log('The server is running, ' +' port: %s',
	port);
});

//express-validator
//https