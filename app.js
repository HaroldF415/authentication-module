//jshint esversion:6

require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({

  secret: "ThisIsOurSecret",
  resave: false,
  saveUninitialized: false

}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose); //, {usernameUnique: false}
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
passport.use(new GoogleStrategy({

    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/authentication-module",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

  },

  function(accessToken, refreshToken, profile, done) {
      console.log("GOOGLE PROFILE:" + profile);
      console.log("--------------------------------------------------------------------------");
       User.findOrCreate({ googleId: profile.id }, function (err, user) {
         return done(err, user);
       });

  }

));

passport.use(new FacebookStrategy({
    clientID: process.env.FB_APPID,
    clientSecret: process.env.FB_APPSECRET,
    callbackURL: "http://localhost:3000/auth/google/authentication-module"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    console.log("--------------------------------------------------------------------------");
    User.findOrCreate({ facebookId: profile.id }, function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));

app.get("/", function(req, res) {

    res.render("home");

});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/authentication-module",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ["profile"] }));

app.get('/auth/facebook/authentication-module',
  passport.authenticate('facebook', { successRedirect: '/secrets',
                                      failureRedirect: '/login' }));

app.get("/register", function(req, res) {

    res.render("register");

});

app.get("/login", function(req, res) {

    res.render("login");

});

app.get("/secrets", function(req, res) {

    // if(req.isAuthenticated())
    //   res.render("secrets");
    // else
    //   res.redirect("/login");

    User.find({secret: {$ne: null} }, function(err, foundUsers){
      if(err)
        console.log(err);
      else{
        if(foundUsers)
          res.render("secrets", {usersWithSecrets: foundUsers});
      }
    });

});

app.get("/logout", function(req, res){

  req.logout();
  res.redirect("/");

});

app.get("/submit", function(req, res){

  if(req.isAuthenticated())
    res.render("submit");
  else
    res.redirect("/login");

});

app.post("/register", function(req, res) {

  User.register({username: req.body.username}, req.body.password, function(err, newRegisterdUser){

    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    } // ends if(err)

  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  // using passport to login and authenticate the user
  req.login(user, function(err){

    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    } // ends if(err)

  }); // ends req.login()

}); // ends app.post()

app.post("/submit", function(req, res){

  const submittedSecret = req.body.secret;

  User.findById(req.user.id, function(err, foundUser){
    if(err)
      console.log(err);
    else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }

  });

});

let port = process.env.PORT;

if( port == null || port == "")
  port = 3000;

app.listen(port, function() {
  console.log("Server started on port 3000");
});
