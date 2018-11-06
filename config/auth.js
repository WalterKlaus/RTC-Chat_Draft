// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID': '416514945191813', // your App ID
        'clientSecret': '047111129c8a7eb2918de24a0d87c906', // your App Secret
        'profileURL': 'https://graph.facebook.com/v2.5/me?fields=first_name,last_name,email',
        'callbackURL' 	: 'https://walterklaus.de:61570/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey' 		: 'your-consumer-key-here',
        'consumerSecret' 	: 'your-client-secret-here',
        'callbackURL' 		: 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID': '659609766228-c3tq6s75n2vv388v2sdv2k67lekfqkvt.apps.googleusercontent.com',
        'clientSecret': 'FbEfno73kMnecXkpLetJLeR7',
        'callbackURL': 'https://walterklaus.de:61570/auth/google/callback'
    }

};
