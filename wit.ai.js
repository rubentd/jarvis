var http = require('http');

function Witai(host, port, clientToken){
	this.host = host;
	this.port = port;
	this.token = clientToken;

	this.request = function(options, callbacks){

		var output = '';
		var req = http.request(options, function(res){
			var output = '';
			res.setEncoding('utf8');

			res.on('data', function (chunk) {
	            output += chunk;
	        });

	        res.on('end', function() {
	        	callbacks.onEnd(output);
	        });
		});

		req.on('error', function(){
			callbacks.onError();
		});

		req.end();
	}

	this.start = function(callbacks){
		var path = '/start?access_token=' + this.token;

		var options = {
			host: this.host,
		    port: this.port,
		    path: path,
		    method: 'GET',
		    headers: {
		        'Content-Type': 'application/json'
		    }
		};

		this.request(options, callbacks);
		
	}

	this.stop = function(callbacks){
		var path = '/stop';

		var options = {
			host: this.host,
		    port: this.port,
		    path: path,
		    method: 'GET',
		    headers: {
		        'Content-Type': 'application/json'
		    }
		};

		this.request(options, callbacks);

	}

	this.text = function(text, callbacks){
		var path = '/text?q=' + text + '&access_token=' + this.token;
		
		var options = {
			host: this.host,
		    port: this.port,
		    path: path,
		    method: 'GET',
		    headers: {
		        'Content-Type': 'application/json'
		    }
		};

		this.request(options, callbacks);
	}
}

module.exports = Witai;