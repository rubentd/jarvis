var jarvis = {};

jarvis.config = require('./config.js');

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
var Witai = require("./wit.ai.js");
var sys = require('sys')
var exec = require('child_process').exec;

/*
 * Initialize components
 */ 
jarvis.init= function(){
	jarvis.mode = 'idle';
	jarvis.volume = 75;

	jarvis.initSpotify();
	jarvis.initTelegram();
	jarvis.wit = new Witai(jarvis.config.witai.host, jarvis.config.witai.port, jarvis.config.witai.clientToken);

	jarvis.listen();

	//read eval print loop
	jarvis.startRepl();
}

/*
 * Jarvis methods
 */ 

jarvis.startRepl = function(){
	
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

	jarvis.wit.text(input, {
		onEnd: function(output){
			jarvis.processIntent(JSON.parse(output), callback);
		}, 
		onError : function(){
			callback('Error in witai request');
		}
	});

	
};

jarvis.listen = function(callback){

	jarvis.wit.start({
		onEnd: function(output){
			setTimeout(function(){
				jarvis.stopListening(function(output){
					jarvis.say(output);
				});
				jarvis.setVolume(jarvis.volume);
			}, 2000);
		},
		onError: function(){
			console.log('Error in witai request');
			jarvis.say('Error in witai request');
		}
	});

};

jarvis.stopListening = function(callback){
	
	jarvis.wit.stop({
		onEnd: function(output){
			if(output){
				var outputObject;
				try{
					outputObject = JSON.parse(output);
				}catch(e){
					console.log(output);
				}
				jarvis.processIntent(outputObject, callback);
			}
			jarvis.listen(); //Start listening again
		},
		onError: function(){
			jarvis.say('Error in witai request');
		}
	});

};

jarvis.say = function(something){ //I'm giving up on you
	if(something){
		jarvis.speak(null, something);
		console.log(something);
	}
};

jarvis.isAwake = function(){
	return jarvis.mode == 'awake';
};

jarvis.shellCommand = function(command){
	exec(command, puts);
};

jarvis.setVolume = function(volume){
	jarvis.volume = volume;
	jarvis.shellCommand("vol " + jarvis.volume);
};

jarvis.processIntent = function(command, callback){
	
	if(command && command.outcomes && command.outcomes.length){
		var outcome = command.outcomes[0];
		var intent = outcome.intent;
		
		//just awake commands
		if(jarvis.isAwake()){	
			switch(intent){
				case 'play':
					jarvis.setVolume(jarvis.volume);
					if(outcome.entities && outcome.entities.music_text.length
						&& command._text.indexOf('play') != -1){

						var musicText = outcome.entities.music_text[0].value;
						jarvis.findMusic(musicText, callback);
					}
					break;
			}
		}

		//all mode mode commands
		switch(intent){
			case 'pause':
				jarvis.stopMusic(callback);
				break;
			case 'greeting':
				jarvis.mode = 'awake';
				jarvis.sayHi(callback);
				jarvis.shellCommand('vol 20');
				break;
			case 'volume':
				//TODO improve
				if(outcome.entities && outcome.entities.number.length){
					var number = outcome.entities.number[0].value;
					jarvis.setVolume(number, callback);
				}
		}
		
	}
};

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

	jarvis.mode = 'idle';
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

function puts(error, stdout, stderr) {
	if(error){
		sys.puts(error);
	}
}
