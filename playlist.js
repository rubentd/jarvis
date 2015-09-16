//creates a playlist from a spotify result and plays it with a spotify player

function Playlist(list, player, res){
	this.list = list;
	this.player = player;
	this.res = res; // function to print out the responses
	this.currentTrack = 0;
	this.numTracks = list.numTracks;
	this.isPlaying = false;
	var p = this;

	this.play = function(){
		var track = this.list.getTrack(this.currentTrack);

		var songName = track.name;
		var artist = track.artists[0].name;
		
		var p = this;
		setTimeout( function(){
			p.player.play(track);
			p.isPlaying = true;
		}, 2000);

		this.res('Playing ' + songName + ' by ' + artist);
	};

	this.pause = function(){
		this.player.pause();
		this.isPlaying = false;
		this.res('Music paused');
	};

	this.resume = function(){
		this.player.resume();
		this.isPlaying = true;
	};

	this.next = function(){
		this.player.stop();
		if(this.currentTrack < this.numTracks){
			this.currentTrack++;
			this.play();
		}else{
			this.res('End of playlist');	
		}
	}

	this.prev = function(){
		this.player.stop();
		if(this.currentTrack > 0){
			this.currentTrack--;
			this.play();
		}else{
			this.play();	
		}
	}

	this.player.on({
	    endOfTrack: function(){
	    	p.next();
	    }
	});

	this.play();

}

module.exports = Playlist;