const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const cors = require("cors");
const session = require("express-session");
const PORT = process.env.PORT || 5000;
const {
  ensureAuthenticated,
  forwardAuthenticated,
} = require("./middleware/auth");
const User = require("./model/user");


//passport
const bcrypt = require('bcryptjs');
const passport = require('passport');

const app = express();
app.set("view engine", "ejs");

require("dotenv").config();




// DB Config
const db = require("./config/keys").mongoURI;


// Connect to MongoDB
mongoose
  .connect(db)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// middleware

require('./config/passport')(passport);



// Configure session management
app.use(
  session({
    secret: `${process.env.PASSPORT_SECRET}`,
    resave: true,
    saveUninitialized: true,
  })
);


//
// Passport middleware
app.use(passport.initialize());
app.use(passport.session());


app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


// globle variable

/// clinet side page route for ejs
app.get("/", ensureAuthenticated, function (req, res) {
  res.render("home");
});
app.get('/user-list', ensureAuthenticated,async (req, res) => {


  try {
    // Retrieve the list of users from the database using async/await
    const users = await User.find({});

    // Render an HTML page to display the list of users
    res.render('user_list', { users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching user list');
  }
});
// login route
app.get("/login", forwardAuthenticated, function (req, res) {
  const errorMessage = req.query.error;
  res.render("login",{ errorMessage });
});
// register route
app.get("/register", forwardAuthenticated, function (req, res) {
  const { name, email, password, confirm } = req.body;
  let errors = [];
  res.render("register", { errors, name, email, password, confirm });
});
// profile route
app.get("/profile", ensureAuthenticated, function (req, res) {
  res.render("profile",{ user: req.user });
});
// Logout route
app.post("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      // Handle the error, if any
      return next(err);
    }
    res.redirect("/login");
  });
});

////////////////////////////////////api's//////////////////////////////


// create user
app.post("/register", async (req, res) => {
  const { name, email, password, confirm } = req.body;
  let errors = [];

  if (!name) {
    errors.push({ param: "name", msg: "Please enter your name" });
  }
  if (!email) {
    errors.push({ param: "email", msg: "Please enter your email" });
  }
  if (!password) {
    errors.push({ param: "password", msg: "Please enter your password" });
  }
  if (!confirm) {
    errors.push({
      param: "confirm",
      msg: "Please enter your confirm password",
    });
  }

  if (password !== confirm) {
    errors.push({ param: "confirm", msg: "Passwords do not match" });
  }

  if (password?.length < 6) {
    errors.push({
      param: "password",
      msg: "Password must be at least 6 characters",
    });
  }

  // Password and email format validation with regex
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!passwordRegex.test(password)) {
    errors.push({
      param: "password",
      msg: "Password must contain at least one digit, one lowercase, and one uppercase letter. It must be at least 6 characters.",
    });
  }

  if (!emailRegex.test(email)) {
    errors.push({ param: "email", msg: "Invalid email format" });
  }
  if (errors.length > 0) {
    // If there are validation errors, render the registration form with error messages
    res.render("register", { errors, name, email, password, confirm });
  } else {
    const user = await User.findOne({ email: email });
    if (user) {
      errors.push({ param: "email", msg: "Email already exists" });
      res.render("register", { errors, name, email, password, confirm });
    } else {
    const newUser=  await new User({
        name,
        email,
        password,
      });
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => {
             console.log(
                'success_msg',
                'You are now registered and can log in'
              );
              res.redirect('login');
            })
            .catch(err => console.log(err));
        });
      });
    
  }
}
});


// Login api handle
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // If the login fails, redirect to the login page with an error query parameter
      return res.redirect('/login?error=' + info.message);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      return res.redirect('/');
    });
  })(req, res, next);
});


app.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
});
