//jshint esversion:6

require("dotenv").config();

const express = require("express");

const bodyParser = require("body-parser");

const ejs = require("ejs");

const mongoose = require("mongoose");

const encrypt = require("mongoose-encryption");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});

userSchema.plugin(encrypt, {secret: process.env.ENCRYPT_KEY, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res) {

    res.render("home");

});

app.get("/login", function(req, res) {

    res.render("login");

});

app.get("/register", function(req, res) {

    res.render("register");

});

app.post("/register", function(req, res) {

  const newUser = User({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save(function(err){
    if(!err)
      res.render("secrets");
    else
      console.log(err);
  });

});

app.post("/login", function(req, res){

  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err, userFound){

    if(err)
      console.log("This was the error: " + err);
    else{

      if(userFound){

          if(userFound.password === password)
            res.render("secrets");

      }else{


      }// ends if(userFound)

    } // ends if(err)

  });

});

let port = process.env.PORT;

if( port == null || port == "")
  port = 3000;

app.listen(port, function() {
  console.log("Server started on port 3000");
});
