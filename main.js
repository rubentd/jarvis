var jarvis = {};

jarvis.config = require('./config.js');

var WITAI_HOST = 'localhost';
var WITAI_PORT = 9877
var WITAI_START = '/start?access_token=' + jarvis.config.witai.clientToken;
var WITAI_STOP = '/stop';
var WITAI_TEXT = '/text?q={query}&access_token=' + jarvis.config.witai.clientToken;
var TelegramBot = require('node-telegram-bot-api');

/*
 * Load required modules
 */

jarvis.spotify = require('spotify')({ 
	appkeyFile: jarvis.config.spotify.keyFile 
});
jarvis.telegram = new TelegramBot(jarvis.config.telegram.token, {polling: true});
jarvis.speak = require('say').speak;
jarvis.repl = require("repl");
var http = require('http');


/*
 * Initialize components
 */ 
jarvis.init= function(){
	jarvis.mode = 'idle';

	jarvis.initSpotify();
	jarvis.initTelegram();

	//jarvis.listen();
	jarvis.read();
}

/*
 * Jarvis methods
 */ 

jarvis.read = function(){
	jarvis.repl.start({
	    prompt: "jarvis:~$ ",
	    eval: function(input, context, filename, replCallback){
	    	jarvis.interpretText(input, function(result){
	    		replCallback(result);
	    	});
	    }	
	});
};

jarvis.initSpotify = function(){
	jarvis.spotify.login(jarvis.config.spotify.user, jarvis.config.spotify.pass, false, false);
	jarvis.spotify.on({
	    ready: function(){}
	});
}

jarvis.interpretText = function(input, callback){
	
	input = input.replace('(', '').replace(')', '').replace('\n', '').replace(/ /g, '+');
	if(!input){
		return null;
	}

	var witaiTextPath = WITAI_TEXT.replace('{query}', input);
	var options = {
		host: WITAI_HOST,
	    port: WITAI_PORT,
	    path: witaiTextPath,
	    method: 'GET',
	    headers: {
	        'Content-Type': 'application/json'
	    }
	};

	jarvis.interpretTextReq = http.request(options, function(res){
		var output = '';
		res.setEncoding('utf8');

		res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
        	jarvis.processIntent(JSON.parse(output), callback);
        });
	});

	jarvis.interpretTextReq.on('error', function(){
		callback('Error in witai request');
	});

	jarvis.interpretTextReq.end();
};

jarvis.listen = function(){

	var options = {
		host: WITAI_HOST,
	    port: WITAI_PORT,
	    path: WITAI_START,
	    method: 'GET',
	    headers: {
	        'Content-Type': 'application/json'
	    }
	};
	
	jarvis.listenReq = http.request(options, function(res){
		
		var output = '';
		res.setEncoding('utf8');

		res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
        	return jarvis.processIntent(JSON.parse(output));
        });

	});

	jarvis.listenReq.on('error', function(){
		return 'Error in witai request';
	});

	jarvis.listenReq.end();

	setTimeout(function(){
		jarvis.stopListening();
		jarvis.listen();
	}, 2000);
};

jarvis.stopListening = function(){
	jarvis.stopListeningReq = http.request({
		host: WITAI_HOST,
		port: WITAI_PORT,
		path: WITAI_STOP,
		method: 'GET'
	});

	jarvis.stopListeningReq.on('error', function(){
		jarvis.say('Error in witai request');
	});

	jarvis.stopListeningReq.end();
};

jarvis.say = function(something){ //I'm giving up on you
	if(something){
		console.log(something);
		jarvis.speak(null, something);
	}
};

jarvis.processIntent = function(command, callback){
	
	if(command.outcomes && command.outcomes.length){
		var outcome = command.outcomes[0];
		var intent = outcome.intent;

		switch(intent){
			case 'greeting':
				jarvis.mode = 'awake';
				jarvis.sayHi(callback);
				break;
			case 'play':
				var musicText = outcome.entities.music_text[0].value;
				result = jarvis.findMusic(musicText, callback);
				break;
			case 'pause':
				result = jarvis.stopMusic(callback);
				break;
		}
	}
}

jarvis.sayHi = function(callback){
	var greetings = ['Yes, sir', 'Hello', 'What can I do for you?'];
	var r = getRandomInt(0, greetings.length - 1);
	callback(greetings[r]);
}

jarvis.findMusic = function(song, callback){
	var query = song;
    var search = new jarvis.spotify.Search(song);
	
	search.execute( function(err, searchResult) {
		
		var track = searchResult.getTrack(0);
		
		if(track){
			jarvis.playTracks(track, callback);
		}else{
			callback('Music not found');
		}

	});

};

jarvis.playTracks = function(track, callback){
	var songName = track.name;
	var artist = track.artists[0].name;
	
	setTimeout( function(){
		jarvis.spotify.player.play(track);
	}, 2000);

	callback('Playing ' + songName + ' by ' + artist);

};

jarvis.stopMusic = function(callback){
	jarvis.spotify.player.stop();
	callback('Music stopped');
}

jarvis.initTelegram = function(){

	jarvis.telegram.on('text', function (msg) {

		var cmd = msg.text;
		var chatId = msg.chat.id;

		if(jarvis.checkTelegramUser(msg.from.username)){
			jarvis.interpretText(cmd, function(response){
				console.log(response);
				jarvis.telegram.sendMessage(chatId, response);
			});

		}else{
			jarvis.telegram.sendMessage(chatId, 'Sorry, I don\'t know you');
		}

	});
};

jarvis.checkTelegramUser = function(username){
	return jarvis.config.telegram.allowedUsers.contains(username);
}

jarvis.init();



//Helpers
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}
