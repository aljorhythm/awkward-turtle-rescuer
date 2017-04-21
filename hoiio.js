var querystring = require('querystring'),
	https = require('https'),
	hoiio_server = 'secure.hoiio.com';

function makeHttpsPostRequest(options, dataString, callback){
	var req = https.request(options, (res) => {
		console.log(`STATUS: ${res.statusCode}`);
		console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
		res.setEncoding('utf8');
		res.on('data', (chunk) => {	console.log(`BODY: ${chunk}`); callback(null, chunk);});
		res.on('end', () => {console.log('No more data in response.')});
	});
	req.on('error', (e) => {
	  	console.log(`problem with request: ${e.message}`);
	  	callback(e);
	});
	// write data to request body
	req.write(dataString);
	req.end();
}
/** 
	sender_name
		this is the number to call from.
**/
var Hoiio = function(appId, accessToken, sender_name){
	this.appId = appId;
	this.accessToken = accessToken;
	this.senderName = sender_name;
};
Hoiio.prototype = {
	getOptions : function(additionalOptions){
		var options = {
		  hostname: hoiio_server,
		  port: 443,
		  method: 'POST'
		};
		for(var key in additionalOptions){
			options[key] = additionalOptions[key];
		}
		return options;
	},
	getPostData : function(additionalData){
		var data = {
		  'app_id' : this.appId,
		  'access_token' : this.accessToken,
		  'sender_name' : this.senderName
		};
		for(var key in additionalData){
			data[key] = additionalData[key];
		}
		return data;
	},
	getPostDataString : function(additionalData){
		return querystring.stringify(this.getPostData(additionalData));
	},
	sendSMS : function(callback, dest, msg){
		makeHttpsPostRequest(this.getOptions({path: '/open/sms/send'}),
							this.getPostDataString({'dest' : dest, 'msg' : msg}),
							callback);
	},
	makeCall : function(callback, dest){
		if(!dest || dest.trim() == ""){
			callback("invalid dest");
		}else{
			var additionalData = {'dest' : dest, "caller_id" : "private", "msg" : "Awkward turtle rescuer is here to save you! Take your chance and run out of here now!"};
			makeHttpsPostRequest(this.getOptions({path: '/open/ivr/start/dial'}),
								this.getPostDataString(additionalData),
								callback);
		}
	},
	test: function(callback){
		//this.sendSMS('+6581617398', 'getting there...', callback);
		this.makeCall('+6598774429', callback);
	}
};

module.exports = function(appId, accessToken, sender_name){
	return new Hoiio(appId, accessToken, sender_name);
};