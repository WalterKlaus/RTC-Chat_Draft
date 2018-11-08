// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID': 'xxxxxxxxxxxx', // your App ID
        'clientSecret': 'xxxxxxxxxxxxxxxxxxxxxxxxx', // your App Secret
        'profileURL': 'https://graph.facebook.com/v2.5/me?fields=first_name,last_name,email',
        'callbackURL' 	: 'https://walterklaus.de:61570/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey' 		: 'your-consumer-key-here',
        'consumerSecret' 	: 'your-client-secret-here',
        'callbackURL' 		: 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID': '659609766228-xxxxxxxxxxxx.apps.googleusercontent.com',
        'clientSecret': 'xxxxxxxxxxxxxxxxxxx',
        'callbackURL': 'https://walterklaus.de:61570/auth/google/callback'
    }

};
