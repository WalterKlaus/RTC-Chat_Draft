// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({
    cmProfileId      : String,
    profileOnline    : Array,
    isProfileMod     : Boolean,
    profileRemoved   : String,
    profileLinked    : { type: Number, default: 0},
    local            : {
        email        : String,
        password     : String
    },
    facebook         : {
        id           : String,
        token        : String,
        email        : String,
        name         : String,
        friends      : Array
    },
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    },
    chat         	    : [{
        name            : String,
        socketId        : String,
        isActive        : Boolean,
        isOnline        : Boolean,
        isCamOn         : Boolean,
        isMicOn         : Boolean,
        isSketchOn      : Boolean,
        isDataChannel   : Boolean,
        isDesktop       : Boolean,
        isFileTransfer  : Boolean,
        isBusy          : Boolean
    }]
});

// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
