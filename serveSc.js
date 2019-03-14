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
mongoose.connect('mongodb://realcom_mongoadmin:xxxxxxxxx@localhost:31419/chat234?authSource=admin', {useNewUrlParser: true }, function(err) {
    if (err)
    { throw err;}
    console.log('DB connected ');
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
//app.use(function(req,res,next){
//    req.io = io;
//    next();
//});
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
var underUsl = [];
underUsl.isUnder = false;
durationUslCurr = 0;
durationUslTot = 0;
var tot = [{agents: 0, amount: 0}];
var strAdjust = '';
var strAdjustHeadcount = '';
var strAdjustDuration = '';
var adjust = 0;
var adjustDuration = 0;
var adjustHeadcount = 0
//tot.agents = 0;
var strAvgCt = '';
var totWaitTime;
var totCallTime;
var totTalkTime;
var serverStartTime = new Date();
var isRecording = false;
var recStartTime;
var max;
var aba = 0;
var genCalls = 0;
var fPrep;
function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}
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
Sites.aggregate([
    {
        $group: {
            '_id': null,
            'agents': {$sum: '$agentsCount'},
            'amount': {$sum: '$callAmount'} // amount könnten wir hier weglassen. Mal schaun
        }
    }
],function (err, t) {
    if(err){
        console.log('TAerr: ', err);
    }
    max = t[0].agents + Math.floor(Math.random()*(t[0].agents / 7));// verhältnismässig oder absolut ???
});
var csvHeadSet;
setInterval(generateCalls, 500);
var oldMax = 0;
var dur = 0;
var maxDuration = 570000; //initial
function generateCalls() {
    Calls.count({}, function( err, count){
        if(err) throw err;
        if(max != oldMax){
            oldMax = max;
            console.log('max: ', max);
        }
        if(count < max-(Math.random()*max/10)){
            //console.log('maxRand', max-(Math.random()*max/10));
            var newCall = new Calls();
            var jetzt = new Date();
            var dann = new Date(jetzt.getTime() + 50000 + (Math.random() * maxDuration)); // maxDuration
            dur = dann - jetzt;
            var selSite = sites[Math.floor(Math.random() * sites.length)];
            newCall.actAgents = 20;
            Sites.findOne({name: selSite}, function (err, s) {
//
                if(err){
                    console.log(err);
                    if(s == null){
                        console.log('no Site', selSite);
                        return;
                        throw err;
                    }
                }
                newCall.actAgents = s.agentsCount;
            })
                .then(function (err) {
                    if(newCall.actAgents == 20){
                        //console.log('selSite: 20 ::', selSite, ' /', newCall.actAgents);// Die schmiessen wir raus
                        return;
                    }
                    //console.log('selSite: ::', selSite, ' /', newCall.actAgents);
                    newCall.incomingCall = jetzt;
                    newCall.endingCall = dann;
                    newCall.lang = langs[Math.floor(Math.random() * langs.length)];
                    newCall.site = selSite;
                    newCall.line = lines[Math.floor(Math.random() * lines.length)];
                    newCall.waitTime = 0;
                    newCall.duration = dur;
                    newCall.callTaken = false;
                    newCall.save()
                        .then(function () {
                            genCalls += 1;
                        })
                    ;
                })
            ;
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
            if(!c.callTaken){
                aba += 1;
            }
            // hier können wir einen virtuellen ACD-Report erstellen, falls gewünscht
            if(isRecording){
                var csv;
                var data = c.site +
                    ';' + c.actAgents +
                    ';' + c.line +
                    ';' + c.lang +
                    ';' + c.incomingCall.toLocaleString() +
                    ';' + (c.duration / 1000).toFixed(0) +
                    ';' + (c.waitTime / 1000).toFixed(0) +
                    ';' + c.callTaken + '\n';

                try {
                    fPrep += data;
                } catch (err) {
                    console.log('appendErr2');
                    /* Handle the error */
                }


            }

            c.remove()
                .then(function () {
                })
                .catch(function(err){
                    console.log('remove error: ', err);
                });
        });
    })
        .then(loopCalls);
};

async function asyncSave(obj) {
    console.log('asyncSave', obj.name);
    await obj.save();
};

function loopCalls() {
    // oldest first / fifo

    // for await test

    //for await (const s of Sites.find())(
    //    console.log('site: ' , s.name);
    //)
    //const cursor = Sites.find().cursor();
    //for (let s = await cursor.next(); s != null; s = await cursor.next()) {
    //    console.log(s.symbol, price);
    //    await s.save();
    //}

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

                s.save()
                    .then(function (sObj) {
                        var ind = 0;
                        calls.forEach( function (c) { // waiting or not? Ab hier haben wir den einzelnen call
                            ind += 1;
                            c.callTaken =   (ind <= s.agentsCount) ? true     : false;
                            c.waitTime =    (c.callTaken) ? ((c.waitTime > 0) ? c.waitTime  : 0)  : new Date() - c.incomingCall;
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
                    langs.forEach( function (l) {
                        // debugger;
                        Calls.count({lang: l, callTaken: false, site: s.name}, function (err, count) {


                            s.callsWaiting.forEach(function (w) {
                                if(w.lang == l){
                                    w.count = count;
                                    //w.save(function (err) {
                                    //    if(err){
                                    //        console.log('err: ', err);
                                    //    }
                                    //});
                                    //await s.save();

                                    asyncSave(s);
                                    //s.save();
                                }
                            });
                            //s.agentsBusy.forEach(function (b) {
                            //    if(b.lang == l){
                            //        b.count = count;
                            //        //b.save()
                            //        //    .then(function () {
                            //        //    })
                            //        //;
                            //        // await s.save();
                                   asyncSave(s);
                            //        //s.save();
                            //    }
                            //});
                        })
                        //asyncSave(s);
                        //.then(function () {
                        //    Calls.count({lang: l, callTaken: true, site: s.name}, function (err, count) {
                        //    });
//
                        //})

                        ;
                    })
                    Calls.aggregate([
                        {$match: {callTaken: false, site: s.name}},
                        {$group:{_id: 0, average: {$avg: '$waitTime'}}}
                    ], function (err, a) {
                        if(a[0] != undefined){
                            s.avgWaitTime = a[0].average;
                        }
                    });
                    Calls.aggregate([
                        {$match: {waitTime: {$gte: 45000}, site: s.name, callTaken: false}},
                        {$count:'under45'}
                    ], function (err, a) {
                        if(a[0] != undefined){
                            s.serviceLevel = (100-((a[0].under45/s.callAmount)*100)).toFixed(1);
                        }
                    });

                });

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
            if(SLoa[0] != undefined){
                avgSL = SLoa[0].SLoverAll;
                if(avgSL < 95){
                    if(!underUsl.isUnder){
                        underUsl.dtStart = new Date();
                    }
                    underUsl.isUnder = true;
                    durationUslCurr = new Date() - underUsl.dtStart;
                }else{
                    if(underUsl.isUnder){
                        underUsl.isUnder = false;
                        durationUslTot += durationUslCurr;
                    }
                }
            }
        });
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
                strAvgCt =  d.getUTCMinutes() + ':' + addZero(d.getUTCSeconds());
            }
        });
        Sites.aggregate([
            {
                $group: {
                    '_id': null,
                    'agents': {$sum: '$agentsCount'},
                    'amount': {$sum: '$callAmount'}
                }
            }
        ],function (err, t) {
            if(err){
                console.log('TAerr: ', err);
            }
            tot = t;
        });

        var d = new Date(1000*Math.round(maxDuration/1000));
        strDur =  d.getUTCMinutes() + ':' + addZero(d.getUTCSeconds());
        io.sockets.emit('event', sitesInfo, avgSL.toFixed(1), strAvgCt, tot, serverStartTime.toLocaleString(), durationUslCurr, durationUslTot, strAdjust, strAdjustDuration, strAdjustHeadcount, max, strDur, aba, genCalls);
    });
};
// retrieve callAmount etc for our client table
app.io = io.sockets.on('connection', function(socket) {
    socket.on('adjust', function (val) {
        strAdjust = val;
        adjust = Number(val);
        max += max / 100 * adjust;
        console.log('adj: ' , max);
        socket.broadcast.emit('adjust', val);
    });
    socket.on('adjustDuration', function (val) {
        strAdjustDuration = val;
        adjustDuration = Number(val);
        maxDuration += maxDuration / 100 * adjustDuration;
        socket.broadcast.emit('adjustDuration', val);
    });
    socket.on('adjustHeadcount', function (val) {
        strAdjustHeadcount = val;
        adjustHeadcount = Number(val);
        Sites.find({}, function(err, sites){
            sites.forEach(function(s){
                s.agentsCount +=  s.agentsCount * adjustHeadcount / 100;
                s.agentsCount = s.agentsCount.toFixed(0);
                s.save(function(err){
                    if(err) throw err;
                });
            });
        });
        socket.broadcast.emit('adjustHeadcount', val);
    });
    socket.on('recStartedAt', function (val){
        isRecording = false;
        console.log('recStarted');
        socket.broadcast.emit('recStartedAt', val);

        fPrep = '';
        isRecording = true;
    });
    socket.on('recStopped', function () {

        isRecording = false;
        console.log('rec stopped');
        socket.broadcast.emit('recStoppedByClient');
        var f = '../../comBase/acd.csv';
        if(fs.existsSync(f)){
            fs.unlinkSync(f);
            console.log('unlinked');
        }
        if(fs.existsSync(f)){
            console.log('not unlinked');
        }
        if(fPrep == ''){
            return;
        }
        try{
            fs.appendFileSync(f, 'site, actAgents, line, lang, incomingCall, duration, waitTime, taken\n' + fPrep);
            console.log('The "data to append" was appended to file!', fPrep);
        }catch(e){
            console.log('err occured on append: ', e);
            throw(e);
        }
    });
    socket.on('unloaded', function () {
        if(io.sockets.length < 1){
            isRecording = false;
            console.log('unload');
        }
    });
});
server.listen(port);
console.log('Server listens on port: ', port);

