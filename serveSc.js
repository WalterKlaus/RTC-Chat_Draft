var favicon = require('serve-favicon');
var path = require('path');
var https = require('https');
var fs = require('fs');
var express = require('express');
var port     = process.env.PORT || 62246;
var mongoose = require('mongoose');
var passport = require('passport');
var configDB = require('./config/database.js');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://realcom_mongoadmin:xxxxxxxlocalhost:31419/chat234', {auth:{authdb:"admin"}}, function(err) {
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
app.set('view engine', 'ejs'); // set up ejs for templating
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/'));
app.use(express.static(__dirname + '/public'));
// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport
// Simulation
var Calls      = require('./app/models/calls');
var Sites      = require('./app/models/sites');
var sites = [
    'MS',   // same position as in our client tablerow[0]
    'BA',   // same position as in our client tablerow[1]
    'TA',   // same position as in our client tablerow[2]
    'MA',   // same position as in our client tablerow[3]
    'ND',   // same position as in our client tablerow[4]
    'SE'    // same position as in our client tablerow[5]
];
var langs = ['English',
    'German',
    'French',
    'Italian',
    'Spanish',
    'Russian',
    'Swedish'];
// hardware, customer service request, live issue, complaining, disruptive incident
var lines = ['HW',
    'CSV',
    'LI',
    'CO',
    'DI'
];
var avgSL = 100;
var avgCT = 0;
//var totAg;
//var totAm;
var tot;
var strAvgCt = '';
var totWaitTime;
var totCallTime;
var totTalkTime;
// Remove site info on server start
Sites.find({}, function(err, s){
    s.forEach(function(doc){
        doc.remove(function(err){
            if(err) throw err;
        });
    });
});
Calls.find({}, function (err,
                         calls) {
    calls.forEach( function (c) {
        c.remove(function(err){
            if(err) throw err;
        });
    });
});
// initialize Sites on server start
sites.forEach(function(name){
    var siteInfo    = new Sites();
    siteInfo.name = name;
    siteInfo.agentsCount = Math.floor(Math.random() * (56 - 42) ) + 42;
    //siteInfo.agentsCount = Math.floor(Math.random() * (20 - 5) ) + 5;
    langs.forEach(function (l) {
        var c = 0;
        siteInfo.agentsBusy.push(  {lang : l, count : 0});
        siteInfo.callsWaiting.push({lang : l, count : 0});
    });
    siteInfo.save(function (err) {
        if(err) throw err;
    });
});
setInterval(generateCalls, 500);
function generateCalls() {
    Calls.count({}, function( err, count){
        if(err) throw err;
        if(count < 330){
            var newCall = new Calls();
            var jetzt = new Date();
            var dann = new Date(jetzt.getTime() + 50000 + (Math.random() * 570000));
            newCall.incomingCall = jetzt;
            newCall.endingCall = dann;
            newCall.lang = langs[Math.floor(Math.random() * langs.length)];
            newCall.site = sites[Math.floor(Math.random() * sites.length)];
            newCall.line = lines[Math.floor(Math.random() * lines.length)];
            newCall.waitTime = 0;
            newCall.duration = dann - jetzt;
            newCall.callTaken = false; // hier können wir einen virtuellen ACD-Report erstellen, falls gewünscht
            // hung up???
            newCall.save();
        }
    })
        .then(removeCalls());
    ;
};
function removeCalls() {
    // remove hung up calls
    Calls.find({endingCall: {$lte: new Date()}}, function (err, calls) {
        if (err) throw (err);
        calls.forEach(function (c) {
            c.remove()
                .then(function () {

                    //console.log('remove succeeded:', c.id);
                })
                .catch(function(err){
                    console.log('remove error: ', err);
                });
        });
    })
        .then(loopCalls);
};
function loopCalls() {
    // oldest first / fifo
    Sites.find({}, function (err, sitesInfo) {
        if(err) throw err;
        sitesInfo.forEach( function (s) {
            var qc = Calls.find({site : s.name}, {}, { sort: { incomingCall : +1 } }); // general amount,eldest first
            qc.then(function (calls) { // query count
                var amount = calls.length; // totalAmount
                s.callAmount = amount;
                s.totalWaiting = (amount <= s.agentsCount) ? 0                   : amount - s.agentsCount ;
                s.totalBusy =   (amount >= s.agentsCount) ? s.agentsCount         : amount                ;
                s.agentsVacant = (amount >= s.agentsCount)           ? 0         : s.agentsCount - amount ;

                s.save(function (err) {
                    if(err){
                        console.log('saving Site err: ', err);
                    }
                    //console.log('first Info: ', s.totalWaiting,' / ', s.totalBusy,' / ',s.callAmount, 'diff.: ', s.callAmount-(s.totalBusy + s.totalWaiting));
                })
                    .then(function (err) {
                        var ind = 0;
                        calls.forEach( function (c) { // waiting or not? Ab hier haben wir den einzelnen call
                            //console.log('c:', c);
                            ind += 1;
                            c.callTaken =   (ind <= s.agentsCount) ? true     : false;
                            c.waitTime =    (c.callTaken) ? 0                   : new Date() - c.incomingCall;
                            c.save(function (err) {
                                if(err){
                                    console.log('e: ', err);
                                }
                            });
                        });

                    })
                ;
            })
                .then(function (err) {
                    if(err){
                        console.log('cSaveErr: ', err);
                    }
                    //console.log('after csave: ', calls[0]);
                    Calls.aggregate([
                        {$match: {callTaken: false, site: s.name}},
                        {$group:{_id: 0, average: {$avg: '$waitTime'}}}
                    ], function (err, a) {
                        if(a[0] != undefined){
                            //console.log('avg: ', a, ' / ', a[0].average);
                            s.avgWaitTime = a[0].average;
                        }
                    });
                    Calls.aggregate([
                        {$match: {waitTime: {$gte: 45000}, site: s.name}},
                        {$count:'under45'}
                    ], function (err, a) {
                        if(a[0] != undefined){
                            s.serviceLevel = (100-((a[0].under45/s.callAmount)*100)).toFixed(1);
                            //console.log('SL: ', s.serviceLevel.toFixed(1));
                        }
                    });

                    langs.forEach(function (l) {
                        Calls.count({lang: l, callTaken: false, site: s.name}, function (err, count) {
                            //console.log('SiteLangCount:', s.name, ' / ', l, ' / ', count);
                            s.callsWaiting.forEach(function (w) {
                                if(w.lang == l){
                                    w.count = count;
                                    w.save(function (err) {
                                        if(err){
                                            console.log('err: ', err);
                                        }
                                    });
                                }
                            });
                        })
                            .then(function () {
                                Calls.count({lang: l, callTaken: true, site: s.name}, function (err, count) {
                                    s.agentsBusy.forEach(function (b) {
                                        if(b.lang == l){
                                            b.count = count;
                                            b.save(function (err) {
                                                if(err){
                                                    console.log('err: ', err);
                                                }
                                            })
                                                .then(function () {
                                                    s.save(function (err) {
                                                        if(err){
                                                            console.log('err: ', err);
                                                        }
                                                        //console.log('afterSave: ', s);
                                                    });
                                                })
                                            ;
                                        }
                                    });
                                });

                            })

                        ;
                    })
                })
            ;
        });
        Sites.aggregate([
            {
                $group: {
                    '_id': null,
                    'SLoverAll': {$avg: '$serviceLevel'}
                }
            }
        ],function (err,SLoa) {
            if(err){
                console.log('err: ', err);
            }
            //console.log('slFirst: ', SLoa);
            if(SLoa[0] != undefined){
                //console.log('sl: ', SLoa[0].SLoverAll);
                avgSL = SLoa[0].SLoverAll;
            }
        });
        //'talkTimeOverAll': {$sum: {$substract: ['$callDuration', '$waitTime']}}
        Calls.aggregate([
            {
                $group: {
                    '_id': null,
                    'avgTalkTimeOverAll': {$avg: '$duration'}
                }
            }
        ],function (err, avgTalkTime) {
            if(err){
                console.log('TTerr: ', err);
            }
            if(avgTalkTime[0] != undefined){
                avgCT = avgTalkTime[0].avgTalkTimeOverAll;
                var d = new Date(1000*Math.round(avgCT/1000));
                function addZero(i) {
                    if (i < 10) {
                        i = "0" + i;
                    }
                    return i;
                }
                strAvgCt =  d.getUTCMinutes() + ':' + addZero(d.getUTCSeconds());
                console.log('callTime: ', strAvgCt );
            }
        });
        Sites.aggregate([
            {
                $group: {
                    '_id': null,
                    'totAgents': {$sum: '$agentsCount'},
                    'totAmount': {$sum: '$callAmount'}
                }
            }
        ],function (err, t) {
            if(err){
                console.log('TAerr: ', err);
            }
            console.log('tot: ', t);
            tot = t;
            //if(totAgents[0] != undefined){
            //    avgCT = avgTalkTime[0].avgTalkTimeOverAll;
            //    var d = new Date(1000*Math.round(avgCT/1000));
            //    function addZero(i) {
            //        if (i < 10) {
            //            i = "0" + i;
            //        }
            //        return i;
            //    }
            //    strAvgCt =  d.getUTCMinutes() + ':' + addZero(d.getUTCSeconds());
            //    console.log('callTime: ', strAvgCt );
            //}
        });

        //console.log('avgSl: ', avgSL);
        io.sockets.emit('event', sitesInfo, avgSL.toFixed(1), strAvgCt, tot);
    });
};
// retrieve callAmount etc for our client table
//app.io = io.sockets.on('connection', function(socket) {
//});
server.listen(port);
console.log('Server listens on port: ', port);
