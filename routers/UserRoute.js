const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const async = require('async');
const crypto = require('crypto');
const nodeMailer = require('nodemailer')



function isAuthenticatedUser(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash('error_msg', "please login first to access this page");
    res.redirect('/')
}


router.get('/', (req, res)=>{
    res.render('login')
})

router.get('/signup', (req, res)=>{
    res.render('signup')
})

router.get('/changepassword',isAuthenticatedUser, (req, res)=>{
    res.render('changepassword')
});

router.get('/forgetpassword', (req, res)=>{
    res.render('forgetpassword')
});

router.get('/dashboard', isAuthenticatedUser,(req, res)=>{
    res.render('dashboard')
});

router.get('/logout',isAuthenticatedUser,(req, res)=>{
    req.logOut();
    req.flash('success_msg', 'You have been logged out');
    res.redirect('/')
});

router.get('/reset/:token', async (req, res)=>{
    try{
        const token = req.params.token
        const user = await User.findOne({resetPasswordToken:token, resetPasswordTokenExpired:{$gt: Date.now()}});
        if(!user){
            req.flash('error_msg', 'Password reset token is invalid or has been expired! ');
            return res.redirect('/forgetpassword')
        }
        res.render('newpassword', {token:token})
    }catch(err){
        req.flash('error_msg', 'Error: '+err)
    }
    
})




// Login Routes
router.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/',
    failureFlash: 'Invalid Email or Password, Try Again!!'
}))

// Signup Routes
router.post('/signup', async (req, res)=>{
    try{
        let {name, email, password} = req.body;
        let userSchema = {
            name: name,
            email:email
        };

        await User.register(userSchema, password, (err, user)=>{
            if(err){
                req.flash('error_msg', "Error: "+err);
                return res.redirect('/signup');
            }
             passport.authenticate('local') (req, res, ()=>{
                req.flash("success_msg", "Register Successful!");
                return res.redirect('/');
            })
        })
    }catch(e){
        console.log(e)
    }
       
    
});

// Forget Password Routes
router.post('/forgetpassword', (req, res)=>{
    const recoverPassword = '';

    async.waterfall([
        (done)=>{
            crypto.randomBytes(30, (err, buf)=>{
                let token = buf.toString('hex');
                done(err, token);
            });
        },

        (token, done)=>{
            User.findOne({email: req.body.email}).then((user)=>{
                if(!user){
                    req.flash('error_msg', 'User Does not exists in database');
                    return res.redirect('/forgetpassword');
                }
                user.resetPasswordToken = token;
                user.resetPasswordTokenExpired = Date.now() + 1800000;
                user.save(err=>{
                    done(err, token, user)
                })
            }).catch(err=>{
                req.flash('error_msg', 'ERROR: '+ err);
                res.redirect('/forgetpassword');
            })
        },

        (token, user)=>{
            let smptTranport = nodeMailer.createTransport({
                service: 'Gmail',
                auth:{
                    user: process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_PASSWORD
                }
            });

            let mailOptions = {
                to: user.email,
                from: 'Ajeet M webprojectjs7@gmail.com',
                subject: 'Recovery Password',
                text: 'Please Click the Following Link to recover Your Password: \n\n' +
                        'http://'+req.headers.host+'/reset/'+token+'\n\n'+
                        'If You did not request thid, please ignore this email'
            };

            smptTranport.sendMail(mailOptions, err=>{
                req.flash('success_msg', 'Email send the further instructions. Please check that');
                res.redirect('/forgetpassword')
            })
        }

    ], err =>{
        if(err) res.redirect('/forgetpassword');
    })
});

// Reset Password Routes
router.post('/reset/:token', (req, res)=>{
    const token = req.params.token;
    const {password, cpassword} = req.body;
    async.waterfall([
       (done)=>{
        User.findOne({resetPasswordToken: token, resetPasswordTokenExpired: {$gt: Date.now()}}).then(user=>{
            if(!user){
                req.flash('error_msg', 'Password token is invalid or has been expired!');
                return res.redirect('/forgetpassword')
            }
            if(password !== cpassword){
                req.flash('error_msg', 'Password do not match');
                return res.redirect('/forgetpassword')
            }

            user.setPassword(password, err=>{
                user.resetPasswordToken = undefined;
                user.resetPasswordTokenExpired= undefined;

                user.save(err=>{
                    req.logIn(user, err=>{
                        done(err, user);
                    })
                })
            })
        }).catch(err=>{
            req.flash('error_msg', 'Error '+err);
            res.redirect('/forgetpassword')
        })
       }, 

       (user)=>{
           let smptTranport = nodeMailer.createTransport({
               service: 'Gmail',
               auth:{
                   user: process.env.GMAIL_EMAIL,
                   pass: process.env.GMAIL_PASSWORD
               }
           });

           let mailOptions = {
               to: user.email,
               from: 'Ajeet K webporjectjs7@gmail.com',
               subject: 'Confirmation Password Reset',
               text: 'Hello '+user.name+'\n\n'+
               'this is the confirmation that the password for Your account has been changed'
           }

           smptTranport.sendMail(mailOptions, err=>{
               req.flash('success_msg', 'Reset Password successful ');
               res.redirect('/');
           })
       }

    ], err=>{
        res.redirect('/')
    })
});

// Change Password Routes
router.post('/changepassword', async(req, res)=>{
    try{
        const {password, cpassword} = req.body;
        if(password !== cpassword){
            req.flash('error_msg', 'Password and Confirm password do not match');
            return res.redirect('/changepassword');
        }
        const user = await User.findOne({email: req.user.email});
        await user.setPassword(password, async err=>{
            await user.save()
            req.flash('success_msg', 'Password change successfull');
            res.redirect('/dashboard');
        })

    }catch(e){
        req.flash('error_msg', 'Old Password or Confirm password do not match');
        res.redirect('/changepassword');
    }
});


module.exports = router;