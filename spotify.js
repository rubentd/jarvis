var spotify = require('spotify')({ 
	appkeyFile: 'spotify_appkey.key' 
});

var ready = function()  {
    var query = process.argv[2];
    console.log(query);

    var search = new spotify.Search(query);
		search.execute( function(err, searchResult) {
		var track = searchResult.getTrack(0);
		spotify.player.play(track);
	});

};

spotify.on({
    ready: ready
});

spotify.login('12124180430', process.env.SPOTIFY_PASS, false, false);
