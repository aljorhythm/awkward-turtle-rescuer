var OTP_CONFIG = {
	TIMEOUT: 1000 * 60 * 7
};
// low inclusive high exclusive
function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}
var validator_notNull = [
	function (value){
		return typeof value != 'undefined' && value != null;
	},
	"{Path} cannot be empty"
];
module.exports = function(mongoose, FB){
	var userSchema = mongoose.Schema({
	    id: {type: String, validate: validator_notNull},
	    name: String,
	    accessToken: String,
	    phone: {type: String, default: ""},
	    OTP: {
	    	phone : String,
	    	number: String,
	    	date: Date,
	    	default: {}
	    }
	});
	userSchema.statics.findOrCreate = function(id, profile, callback){
		/**
			profile
				name
				id
				accessToken
		**/
		var User = this;
		this.findOne({id: id}, function(err, user){
			if(!user){
				new User({id: id, name: profile.name, accessToken: profile.accessToken}).save(callback);
			}else{
				// if accessToken changed
				if(user.accessToken != profile.accessToken){
					user.save({accessToken: profile.accessToken}, callback);
				}else{
					callback(err, user);
				}
			}
		});
	};
	// !!! node style callbacks
	var methods = {
		getFBProfile : function(callback){
			FB.setAccessToken(this.accessToken);
			FB.api(this.id, { fields: ['id', 'name', 'email'] }, FB.genericCallback(callback));
		},
		getFBFriendlists : function(callback){
			FB.setAccessToken(this.accessToken);
			FB.api(this.id + "/friendlists", FB.genericCallback(callback));
		},
		getFBFriends : function(callback){
			FB.setAccessToken(this.accessToken);
			FB.api(this.id + "/friends", FB.genericCallback(callback));
		},
		hasPhone: function(callback){
			callback(null, !!this.phone);
		},
		generateOTP: function(callback, phone){
			if(!phone.match(/^[689]\d{7}$/)){
				callback("Invalid phone number");
			}else{
				this.OTP = {
					number : randomInt(0, 10000),
					phone: "+65" + phone,
					data: new Date()
				};
				this.save().then(function(user){callback(null, user);});
			}
		},
		checkOTP: function(callback, number){
			var error = null, phone = this.phone;
			console.log("CHECK", this.OTP, number, this.OTP.number != number);
			if(!this.OTP || this.OTP.number != number){
				error = "One-time password mismatch";
			}else if(this.OTP.date - new Date() < OTP_CONFIG.TIMEOUT){
				error = "One-time password is expired";
			}else{
				phone = this.OTP.phone;
			}
			this.OTP = {}; this.phone = phone;
			this.save().then(function(user){
				callback(error, user);
			});
		}
	};
	userSchema.methods = methods;
	return mongoose.model('User', userSchema);
};