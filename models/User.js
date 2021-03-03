const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose')

const userSchema = new Schema({
    name: {type:String, required:true},
    email: {type:String, required:true},
    password: {type:String, select:false},
    resetPasswordToken: {type: String},
    resetPasswordTokenExpired: {type: Date}
});


userSchema.plugin(passportLocalMongoose, {usernameField: "email"})

const User = mongoose.model('user', userSchema);
module.exports = User;