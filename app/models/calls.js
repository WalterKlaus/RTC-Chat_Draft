// load the things we need
var mongoose = require('mongoose');

var callsSchema = mongoose.Schema({
    site                : String,
    line                : String,
    lang                : String,
    incomingCall        : Date,
    endingCall          : Date,
    duration            : Number,
    waitTime            : Number,
    callTaken           : Boolean
});

module.exports = mongoose.model('Calls', callsSchema);
