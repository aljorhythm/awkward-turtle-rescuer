FacebookStrategy = require('passport-facebook').Strategy;
module.exports = function(app, User, passport, oauth_fb_config){
  console.log("Configuring OAuth Provider Facebook");
  passport.use(new FacebookStrategy({
      clientID: oauth_fb_config["APP_ID"],
      clientSecret: oauth_fb_config["APP_SECRET"],
      callbackURL: "/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      console.log("Redirected from FB ", profile);
      profile.accessToken = accessToken; profile.name = profile.displayName;
      User.findOrCreate(profile.id, profile, function(err, user) {
          if (err) { return done(err); }
          done(null, user);
      });
    }
  ));
  passport.serializeUser(function(user, done) {
      done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findOne({id: id}, function(err, user) {
      done(err, user);
    });
  });
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/auth/facebook', passport.authenticate('facebook', {scope: oauth_fb_config["SCOPE"]}));
  app.get('/auth/facebook/callback', 
    passport.authenticate('facebook',{scope: oauth_fb_config["SCOPE"], successRedirect: '/', failureRedirect: '/' }));

  console.log("Configured OAuth Provider Facebook");
};