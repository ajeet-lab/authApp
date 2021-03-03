require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


// Model import
const User = require('./models/User')

// Mongodb connection
mongoose.connect(process.env.DATABASE_LOCAL, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>console.log('Database Connected'));

app.use(session({
    secret: 'this',
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({usernameField: "email"},User.authenticate()))
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser())

// Flash
app.use(flash())

// Set template
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Middleware Body-Parser
app.use(express.urlencoded({extended:true}));
app.use(express.json());


app.use((req, res, next)=>{
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.user;
    next();
})

// Set Midleware Routers
const UserRoute = require('./routers/UserRoute')
app.use('/', UserRoute)


app.listen(process.env.PORT, ()=>console.log("Servar Started"))