module.exports = function(app, passport) {

    var accounts =[];
    var enterChatName="";
    var regChatName = "";
    var LinkAccount = '';
    var profileOnline;
    var profileInstance;
    var User       = require('../app/models/user');

    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs', { message: req.flash('loginMessage') });
    });


    // PROFILE SECTION =========================
    app.get('/profile', isLoggedIn, function(req, res) {
        var User       = require('../app/models/user');
        var msg = '';
        if(!req.user){
            res.redirect('/');
            return;
        }

        User.findOne({'_id' :  req.user._id }, function (err, user) {
            if (err) {
                throw(err);
            }

            res.render('profile.ejs', {
                layout:false,
                user: req.user,
                accounts: req.user.chat,
                profileId: req.user._id,
                message: msg
            });

        });
    });
    app.post('/profile', function(req, res) {
        if(req.body.enterchatuser){
            enterChatName = req.body.enterchatuser;
            res.redirect('/chatroom/' + enterChatName);
            return;
        }
        var chatuser = req.user;
        for(i=0;i<chatuser.chat.length; i++){
            if(chatuser.chat[i].name == req.body.chatuser){
                chatuser.chat.splice(i,1);
            }
        }
        chatuser.save(function(err) {

            if(err){
                throw(err);
            }
            req.io.emit('removedChatter',[{name: req.body.chatuser}]);
            res.redirect('/profile?removedChatter' + req.body.chatuser);
        });
    });


    // CHART SECTION =========================
    app.get('/chart',  function(req, res) {
        //var data       = require('../app/chart.js');
        res.render('chart.ejs');
    });
    // CHECK NAME ===============================
    // show the namer form
    app.get('/namer',isLoggedIn, function(req, res) {
        res.render('namer.ejs', { message: req.flash('loginMessage') });
    });

    app.post('/namer', isLoggedIn, function(req, res) {

        if(!req.user || !req.body.email){
            return;
        }
        User.findOne({ 'chat.name' :  req.body['email'] }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                throw(err);
            var newChatUser = req.user;
            // if no user is found
            if (!user){
                regChatName = req.body['email'];
                // Wir haben jetzt einen authorisierten user, dem wir ein ChatKonto zuweisen

                req.user.chat.push({name : regChatName});
                req.user.chat.sort();
                newChatUser.save(function(err) {
                    if (err)
                        throw err;
                });
                var proId = req.user._id;
                //req.io.emit('newChatter', {regChatName, proId});
                res.redirect('/profile?newChatter' + regChatName);
            }
            else{
                res.render('namer.ejs', { message : 'Desired Nickname already in use. Try again', user : req.body['email']});
            }
        });
    });


    app.get('/chatroom/:chatter', isLoggedIn, function(req, res) {
        enterChatName = req.param("chatter");
        var userlist =[];
        var isOnline = false;
        var isBusy = false;
        User.findOne({'_id' :  req.user._id }, function (err, user) {//Benutzer als online anmelden
            if(err){
                throw(err);
            }
            //enterChatName = req.body.chatUser;
            for(var i = 0; i < user.chat.length; i++){
                if(user.chat[i].name == enterChatName){
                    if(user.chat[i].isOnline){
                        var msg = 'Chatter is already online';
                        res.render('profile.ejs', {
                            layout:false,
                            user: req.user,
                            accounts: req.user.chat,
                            profileId: req.user._id,
                            message: msg
                        });
                        return;
                    }
                    user.chat[i].isOnline = true;
                    user.save();
                }
            }
        });
        User.find({}, function (err, users) {
            for(var u = 0; u < users.length; u++){ // Find all users
                for(var i = 0; i < users[u].chat.length; i++){
                    if(users[u].chat[i].name && users[u].chat[i].name != enterChatName){
                        isOnline = false;
                        if(users[u].chat[i].isOnline){
                            isOnline = true;
                        }
                        isBusy = false;
                        if(users[u].chat[i].isBusy){
                            isBusy = true;
                            console.log('busy: ' + users[u].chat[i].name);
                        }
                        userlist.push({"name" : users[u].chat[i].name, "userOnline" : isOnline, "userBusy" : isBusy});
                    }
                }
            }
            userlist.sort('name');// TODO: sort doesn't work

            res.render('chatroom.ejs', {
                profileId: req.user._id,
                chatuser : enterChatName,
                userlist : userlist
            });
        });

    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // locally --------------------------------
    // LOGIN ===============================
    // show the login form
    app.get('/login', function(req, res) {
        res.render('login.ejs', { message: req.flash('loginMessage') });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // SIGNUP =================================
    // show the signup form
    app.get('/signup', function(req, res) {
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // facebook -------------------------------

    // send to facebook to do the authentication
    app.get('/auth/facebook',function(req,res,next){
            if(req.user){
                req.flash('loginMessage','Cannot open multiple profileUIs in the same browser as we support session and persistent login!' +
                    ' If you intend to manage profiles simultaneously on the same machine, please try to open the UI in a browser of another vendor to continue.');
                res.redirect('/');
            }
            else{
                return next();
            }
        },
        passport.authenticate('facebook', { scope : ['email'] }));

    // handle the callback after facebook has authenticated the user
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/profile',
            failureRedirect : '/',
            failureFlash : true // allow flash messages
        }));

    // google ---------------------------------

    // send to google to do the authentication
    app.get('/auth/google', function(req,res,next){
            if(req.user){
                req.flash('loginMessage','Cannot open multiple profileUIs in the same browser as we support session and persistent login!' +
                    ' If you intend to manage profiles simultaneously on the same machine, please try to open the UI in a browser of another vendor to continue.');
                res.redirect('/');
            }
            else{
                return next();
            }
        },
        passport.authenticate('google', { scope : ['profile', 'email'] }));

    // the callback after google has authenticated the user
    app.get('/auth/google/callback',
        passport.authenticate('google',{ failureRedirect: '/', failureFlash : true  }),
        function (req, res) {
            //debugger;
            //req.flash('loginMessage', 'Can\'t connect already linked profiles!');
            res.redirect('/profile');
        }
    );

// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

    // locally --------------------------------
    app.get('/connect/local', function(req, res) {
        res.render('connect-local.ejs', { message: req.flash('loginMessage') });
    });
    app.post('/connect/local', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // facebook -------------------------------

    // send to facebook to do the authentication
    app.get('/connect/facebook',  passport.authenticate('facebook', {
            scope : ['email', 'publish_actions'],
            failureRedirect : '/profile',
            failureFlash : true // allow flash messages
        }),
        function (req, res) {
            res.redirect('/profile?profileLinked');
        });


    // google ---------------------------------

    // send to google to do the authentication
    app.get('/connect/google', passport.authenticate('google', {
            scope : ['profile', 'email'],
            failureRedirect : '/profile',
            failureFlash : true // allow flash messages
        }),
        function (req, res) {
            res.redirect('/profile?profileLinked');
        }
    );



// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

// changed to unlink completely

// local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user            = req.user;
        if(!user.google.id && !user.facebook.id) {
            req.io.emit('removedChatter', user.chat); // notify chatroom
            req.io.emit('profileRemoved', req.user.id); // notify profile
            user.remove(function(err){
                if(err){
                    throw(err);
                }
                res.redirect('/');
            });
        }
        else{
            user.local.email    = undefined;
            user.local.password = undefined;
            user.isProfileMod = true;
            user.profileLinked -= 1;
            user.save(function(err) {
                if(err)
                    throw(err);
                //req.io.emit('profileUnlinked', user.id);
                res.redirect('/profile?unlinked');
            });
        };
    });

// facebook -------------------------------
    app.get('/unlink/facebook',isLoggedIn,  function(req, res) {
        var user            = req.user;
        if(!user.google.id && !user.local.email) {
            req.io.emit('removedChatter', user.chat);// notify chatroom
            req.io.emit('profileRemoved', req.user.id); // notify profile
            user.remove();
            res.redirect('/');
        }
        else{
            user.facebook = undefined;
            user.isProfileMod = true;

            user.profileLinked -= 1;
            user.save(function(err) {
                if(err)
                    throw(err);
                //req.io.emit('profileUnlinked', user.id);
                res.redirect('/profile?unlinked');
            });
        };
    });

    app.get('/invite/facebook', isLoggedIn, function(req, res) {
        var friends = req.user.facebook.friends;
        if(!friends){
            return;
        }
        res.render('invite-facebook.ejs',{
            friends : friends
        });
    });


// google ---------------------------------
    app.get('/unlink/google', isLoggedIn, function(req, res) {
        var user          = req.user;
        if(!user.local.email && !user.facebook.id) {
            req.io.emit('profileRemoved', req.user.id);// notify profile
            req.io.emit('removedChatter', user.chat); // notify chatroom
            user.remove();
            res.redirect('/');
        }
        else{
            user.google = undefined;
            user.isProfileMod = true;
            user.profileLinked -= 1;
            user.save(function(err) {
                if(err)
                    throw(err);
                //req.io.emit('profileUnlinked', user.id);
                res.redirect('/profile?unlinked');
            });
        };
    });

};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    //debugger;
    if (req.isAuthenticated()){
        return next();

    }
    res.redirect('/');
}
