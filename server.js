
var favicon = require('serve-favicon');
var path = require('path');
var https = require('https');
var fs = require('fs');
var express = require('express');
var port     = process.env.PORT || 61570;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');

var User       = require('./app/models/user');
var configDB = require('./config/database.js');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://realcom_mongoadmin:xxxxxxxxx@localhost:31419/chat234', {auth:{authdb:"admin"}}, function(err) {
    if (err)
    { throw err;}
    console.log('DB connected ' + configDB.url);
});

require('./config/passport')(passport); // pass passport for configuration
var options = {
    key: fs.readFileSync('../../.config/letsencrypt/live/walterklaus.de/privkey.pem'),
    cert: fs.readFileSync('../../.config/letsencrypt/live/walterklaus.de/cert.pem')
};
// set up our express application
var app = express();
var server = https.createServer(options, app);
app.use(favicon(__dirname + '/icons/favicon.ico'));
io = require('socket.io').listen(server);
// Make io accessible to our router
app.use(function(req,res,next){
    req.io = io;
    next();
});
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs'); // set up ejs for templating
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/'));
app.use(express.static(__dirname + '/public'));
// required for passport
app.use(session({
    secret: 'kokokolaba', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport
// charts
//var chart      = require('./app/chart.js')(app, passport);

var proId = "";
var profileRemoved = "";
var sockUser;
// initialize Sites on server start


app.io = io.sockets.on('connection', function(socket) {
    if(socket.handshake.url.toString().indexOf('socket.io/?proId') > -1){
        proId = socket.handshake.url.toString().slice(18, 42);

        console.log('Handshake Url: ' + socket.handshake.url.toString());
        socket.join(proId);
        User.findOne({'_id' :  proId }, function (err, user) {
            if (err) {
                throw(err);
            }
            sockUser = user;
        });
        if(!sockUser || sockUser == undefined){
            return;

        }
        if(!sockUser.profileRemoved == ""){
            socket.broadcast.to(sockUser.profileRemoved).emit('profileLinked','');
            sockUser.profileRemoved = "";
            sockUser.save();
        }
    }
    socket.on('message', function (message) {
        //log('Got message: ', message);
        // For a real app, should be room only (not broadcast)

        socket.broadcast.emit('message', message);
    });
    socket.on('profileNew', function (id, exid) {
        // log('Got message: ', message);
        // For a real app, should be room only (not broadcast)

        socket.room(id).emit('profileLinkedAndRemoved', id, exid);
    });


    socket.on('contact',function(caller,callee){
        console.log('Contact caller: ' + caller +' callee: ' + callee);
        io.sockets.in(callee).emit('contact', caller, callee)//todo: durch socket ersetzen
    });
    socket.on('nowBusy',function(userBusy){
        User.findOne({'chat.name' :  userBusy }, function (err, user) {
            if(err){
                throw(err);
            }
            for(var i = 0; i < user.chat.length; i++){
                if(user.chat[i].name == userBusy){
                    user.chat[i].isBusy = true;
                    user.save(function(err) {
                        if(err)
                            throw(err)});
                }
            }
        });
        socket.broadcast.emit('nowBusy',userBusy);
    });
    socket.on('nowUnbusy',function(userUnbusy){
        User.findOne({'chat.name' :  userUnbusy }, function (err, user) {
            if(err){
                throw(err);
            }
            for(var i = 0; i < user.chat.length; i++){
                if(user.chat[i].name == userUnbusy){
                    user.chat[i].isBusy = false;
                    user.save(function(err) {
                        if(err)
                            throw(err)});
                }
            }
        });
        console.log('unbusy: ' + userUnbusy)
        socket.broadcast.emit('nowUnbusy',userUnbusy);
    });
    socket.on('nowOnline', function(chatName, socketId){
        console.log('Chatter online: ' + chatName);
        User.findOne({'chat.name' :  chatName }, function (err, user) {//Benutzer als online melden
            if(err){
                throw(err);
            }
            for(var i = 0; i < user.chat.length; i++){
                if(user.chat[i].name == chatName){
                    user.chat[i].isOnline = true;
                    user.chat[i].socketId = socketId;
                    user.save(function(err) {
                        if(err)
                            throw(err)});
                }
            }
        });
        socket.broadcast.emit('nowOnline',chatName);
    });
    socket.on('accountActive', function(chatName){
        console.log('chatName: ' + chatName);
        User.findOne({'chat.name' :  chatName }, function (err, user) {//Benutzer als online melden
            if(err){
                throw(err);
            }
            for(var i = 0; i < user.chat.length; i++){
                if(user.chat[i].name == chatName){
                    user.chat[i].isActive = true;
                    user.save(function(err) {
                        if(err)
                            throw(err)});
                }
            }
        });
        //io.sockets.emit('isAccountActive',chatName);
    });
    socket.on('accountInactive', function(chatName){
        User.findOne({'chat.name' :  chatName }, function (err, user) {//Benutzer als online melden
            if(err){
                throw(err);
            }
            for(var i = 0; i < user.chat.length; i++){
                if(user.chat[i].name == chatName){
                    user.chat[i].isActive = false;
                    user.save(function(err) {
                        if(err)
                            throw(err)});
                }
            }
        });
        //io.sockets.emit('isAccountActive',chatName);
    });
    socket.on('hangup', function(hangupName){
        socket.broadcast.emit('hangup', hangupName);
    });
    socket.on('nowOffline', function(chatName){
        console.log('now offline');
        User.findOne({'chat.name' :  chatName }, function (err, user) {//Benutzer als offline melden
            if(err){
                throw(err);
            }
            for(var i = 0; i < user.chat.length; i++){
                if(user.chat[i].name == chatName){
                    user.chat[i].isOnline = false;
                    user.save(function(err) {
                        if(err)
                            throw(err)});
                }
            }
        });
        socket.broadcast.emit('nowOffline',chatName);
    });
    socket.on('createDialogRoom', function(dialogRoom){//each chatter creates a dialogRoom when entering the chatroom
        socket.join(dialogRoom);// when offering a call caller invites callee to join callers room

    });
    socket.on('joinContactRoom', function(dialogRoom){
        socket.join(dialogRoom);
    });
    socket.on('create or join', function (room) {
        io.sockets.in(room).emit('join', room);

    });
    socket.on('newChatter', function(data){
        socket.broadcast.emit('newChatter',data);
    });
    socket.on('removedChatter', function(removedChatter){
        socket.broadcast.emit('removedChatter',removedChatter);
    });
    socket.on('file', function(fileSize, fileName){
        socket.broadcast.emit('file',fileSize, fileName);

    });
    socket.on('disconnect',function(data){
        if(socket.id == undefined){
            return;
        }
        User.findOne({'chat.socketId' :  socket.id }, function (err, user) {//Benutzer als offline melden
            if(err){
                throw(err);
            }
            if(user == null){
                return;
            }
            var chatName;
            for(var i = 0; i < user.chat.length; i++){
                if(user.chat[i].socketId == socket.id){
                    user.chat[i].isOnline = false;
                    user.chat[i].socketId = null;
                    chatName = user.chat[i].name;
                    user.save(function(err) {
                        if(err)
                            throw(err)});
                }
                socket.broadcast.emit('disconnected', data, chatName); // Verbindung verloren  chatroom
            }
        });
    });
});

server.listen(61570);
console.log('Server listens');