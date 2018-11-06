// load the things we need
var mongoose = require('mongoose');
// define the schema for our SC_Simulator site model
var siteSchema = mongoose.Schema({
    name                        : String,
    callAmount                  : {type : Number, default : 0},
    agentsCount                 : {type : Number, default : 0},
    agentsVacant                : {type : Number, default : 0},
    totalBusy                   : {type : Number, default : 0},
    totalWaiting                : {type : Number, default : 0},
    agentsBusy                  : [{lang : String, count : {type : Number, default : 0}}],
    callsWaiting                : [{lang : String, count : {type : Number, default : 0}}],
    avgWaitTime                 : {type : Number, default : 0},
    serviceLevel                : {type : Number, default : 100}
});
module.exports = mongoose.model('Sites', siteSchema);
