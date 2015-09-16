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
Playlist = require('./playlist.js');
var wit = require('node-wit');
var fs = require('fs');
var sys = require('sys')
var exec = require('child_process').exec;


/*
 * Initialize components
 */ 
jarvis.init= function(){
	jarvis.volume = 70;

	jarvis.initSpotify();
	jarvis.initTelegram();
	
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
	    ready: function(){
	    	jarvis.playlists = jarvis.spotify.playlistContainer.getPlaylists();
	    }
	});
}

jarvis.interpretText = function(input, callback){
	
	input = input.replace('(', '').replace(')', '').replace('\n', '').toLowerCase();
	if(!input){
		return null;
	}

	wit.captureTextIntent(jarvis.config.wit.clientToken, input, function (err, res) {
      	if (err) {
      		callback("Error. " + err);
      	}
      	if(res){
      		jarvis.processIntent(res, callback);
      	}else{
      		callback('Sorry, I didn\'t get that');
      	}
  	});
	
};

jarvis.interpretAudio = function(audioFileName, callback){
	var stream = fs.createReadStream(audioFileName);
  	wit.captureSpeechIntent(jarvis.config.clientToken, stream, "audio/wav", function (err, res) {
      	if (err) {
      		callback("Error. " + err);
      	}
      	if(res){
      		jarvis.processIntent(res, callback);
      	}else{
      		callback('Sorry, I didn\'t get that');
      	}
  	});
}

jarvis.say = function(something){ //I'm giving up on you
	if(something){
		jarvis.speak(null, something);
		console.log(something);
	}
};


jarvis.shellCommand = function(command){
	exec(command, puts);
};

jarvis.setVolume = function(volume, callback){
	jarvis.volume = volume;
	jarvis.shellCommand("vol " + jarvis.volume);
	callback('Volume set to ' + jarvis.volume);
};

jarvis.processIntent = function(command, callback){
	
	if(command && command.outcomes && command.outcomes.length){
		var outcome = command.outcomes[0];
		var intent = outcome.intent;

		console.log(command);
		
		switch(intent){
			case 'play':
				if(outcome && outcome.entities && outcome.entities.music_text.length
					&& command._text.toLowerCase().indexOf('play') != -1){

					var musicText = outcome.entities.music_text[0].value;
					//Check playlists first
					var list = jarvis.getPlaylist(musicText);
					if(list){
						jarvis.playlist = new Playlist(list, jarvis.spotify.player, callback);
					}else{
						//find music
						jarvis.findMusic(musicText, callback);
					}
				}
				break;
			case 'pause':
				if(jarvis.playlist){
					jarvis.playlist.pause();
				}
				break;
			case 'unpause':
				if(jarvis.playlist){
					jarvis.playlist.resume();
				}
				break;
			case 'next':
				if(jarvis.playlist){
					jarvis.playlist.next();
				}
				break;
			case 'prev':
				if(jarvis.playlist){
					jarvis.playlist.prev();
				}
				break;
			case 'greeting':
				jarvis.sayHi(callback);
				break;
			case 'volume':
				if(outcome && outcome.entities && outcome.entities.number && outcome.entities.number.length){
					var number = outcome.entities.number[0].value;
					jarvis.setVolume(number, callback);
				}
				break;
		}
		
	}
};

jarvis.getPlaylist= function(name){
	for(var i = 0; i < jarvis.playlists.length; i++){
		var plName = jarvis.playlists[i].name;
		if(plName && plName.toLowerCase() == name.toLowerCase()){
			return jarvis.playlists[i];
		}
	}
	return null;
}

jarvis.sayHi = function(callback){
	var greetings = ['What can I help you with?', 'Hello', 'What can I do for you?'];
	var r = getRandomInt(0, greetings.length - 1);
	callback(greetings[r]);
}

jarvis.findMusic = function(song, callback){
	var query = song;
    var search = new jarvis.spotify.Search(song);
	
	search.execute( function(err, searchResult) {
		
		if(searchResult.totalTracks > 0){
			jarvis.playlist = new Playlist(searchResult, jarvis.spotify.player, callback);
		}else{
			callback('Music not found');
		}

	});

};

jarvis.stopMusic = function(callback){
	if(jarvis.playlist){
		jarvis.playlist.stop();
	}
}

jarvis.initTelegram = function(){

	jarvis.telegram.on('message', function (msg) {

		var chatId = msg.chat.id;

		if(jarvis.checkTelegramUser(msg.from.username)){
			
			if(msg.text){
				jarvis.interpretText(msg.text, function(response){
					console.log(response);
					jarvis.telegram.sendMessage(chatId, response);
				});
			}else if(msg.voice){
				var fileId = msg.voice.file_id;
				console.log('audio file ');
			}
			
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
