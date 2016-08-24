var http = require('http'),
    wss = require('ws').Server,
    fs = require('fs'),
    webexec = require('./');

var server = http.createServer(function(request, response) {
  response.writeHead(200, {'Content-Type': 'text/html'});
  fs.createReadStream('index.html').pipe(response);
});

new wss({
  server: server,
  verifyClient: function(info) {
    // IMPORTANT: verify origin header here
    // return info.origin == 'https://your.domain.here';
    return true;
  }
}).on('connection', webexec.connectHandler('Timer', [
  '/bin/sh',
  'timer.sh', {
    name: 'Format',
    options: [
      {name: 'ISO 8601', value: '-Iseconds'},
      {name: 'RFC 2822', value: '-R'},
      {name: 'UTC', value: '-u'},
      {name: 'UNIX Timestamp', value: '+%s'}
    ]
  }
]));

server.listen(1234, undefined, undefined, function() {
  console.log('Listening on port 1234');
});
