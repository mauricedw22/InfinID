
var LocalStrategy = require('passport-local').Strategy;
var User = require('../app/models/user.js');
const crypto = require("crypto");
var StellarSdk = require('stellar-sdk');

module.exports = function(passport){

	const server = new StellarSdk.Server('https://horizon.stellar.org');
	StellarSdk.Network.usePublicNetwork();

	//GD7KW42SLGQQY2V6YTLKTFIN5Q4VEXUBX3M3ASTOOZQFIUFVCNKPFNBR
  const destination = StellarSdk.Keypair.random()

  passport.serializeUser(function(user, done){

    done(null, user.id);

  });

  passport.deserializeUser(function(id, done){

     User.findById(id, function(err, user){

	     done(err, user);

	   })

  });

  //Passport Signup logic

  passport.use('local-signup', new LocalStrategy({

    usernameField: 'phone',
		passwordField: 'password',
	  passReqToCallback: true

   }, function(req, phone, password, done){

    process.nextTick(function(){

	  User.findOne({'local.phone':phone}, function(err, user){

	    if(err)
		  return done(err);

		if(user){

		  return done(null, false, req.flash('signupMessage', 'That email is taken already.'));

		}else{

					var public = destination.publicKey();
					var secret = destination.secret();

					//var algorithm = 'aes256';
					var withdrawPassword = req.body.withdrawPassword;

					//var key = crypto.createCipher(algorithm, withdrawPassword);
					//var str = key.update(secret, 'utf8', 'hex') + key.final('hex');
					//console.log(str); 

					var newUser = new User();
					newUser.local.phone = req.body.phone;
					newUser.local.password = newUser.generateHash(password);
					newUser.local.withdrawPassword = withdrawPassword;
					newUser.local.key0 = public; //destination.publicKey();
					newUser.local.key1 = secret; //str
					// More user object properties need to be added here.....

					newUser.save(function(err){

						if(err)
						throw err;

					return done(null, newUser);

		  });

		}

	  });

	});

}));

  //Passport Login logic
  passport.use('local-login', new LocalStrategy({

    usernameField: 'phone',
	  passwordField: 'password',
	  passReqToCallback: true

    }, function(req, phone, password, done){

	  User.findOne({'local.phone':phone}, function(err, user){

	    if(err)
		  return done(err);

		if(!user)
		  return done(null, false, console.log('User not found in DB!'));

	 	if(!user.validPassword(password))
		  return done(null, false, req.flash('loginMessage', 'Ooops! Wrong password!'));

		return done(null, user);

	  });

	}));


};
