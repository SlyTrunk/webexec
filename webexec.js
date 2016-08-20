var spawn = require('child_process').spawn;

exports.connectHandler = function(name, command) {
  
  var clients = [], job = {};

  var broadcast = function(message, exclude) {
    message = JSON.stringify(message);
    clients.forEach(function(client) {
      if (client != exclude)
        client.send(message);
    });
  };
  
  return function(ws) {
    
    clients.push(ws);
    
    ws.on('message', function(message) {
      try {
        message = JSON.parse(message);
        switch (message.command) {
          case 'start':
            if (job.process) return;
            job.log = '';
            job.args = message.args.slice(0);
            job.process = spawn('/usr/bin/env', command.map(function(part) {
              if (typeof part == 'string') return part;
              return message.args.shift();
            }));
            job.process.stdout.on('data', function(data) {
              job.log += data = data.toString();
              broadcast({out: data});
            });
            job.process.stderr.on('data', function(data) {
              console.log(data.toString());
            });
            job.process.on('close', function() {
              broadcast({state: 'stopped'});
              job = {};
            });
            broadcast({state: 'running', args: job.args}, ws);
            break;
          case 'stop':
            if (!job.process) return;
            job.process.kill('SIGKILL');
            job = {};
            broadcast({state: 'stopped'}, ws);
            break;
          case 'pause':
            if (!job.process || job.paused) return;
            job.process.kill('SIGSTOP');
            job.paused = true;
            broadcast({state: 'paused'}, ws);
            break;
          case 'resume':
            if (!job.process || !job.paused) return;
            job.process.kill('SIGCONT');
            job.paused = false;
            broadcast({state: 'running'}, ws);
            break;
        }
      } catch (e) {
        console.log('error parsing incoming message: '+e+'\n'+message);
      }
    });
    
    ws.onclose = function() {
      clients.splice(clients.indexOf(ws), 1);
    };
    
    ws.send(JSON.stringify({
      name: name,
      state: job.process ? job.paused ? 'paused' : 'running' : 'stopped',
      fields: command.reduce(function(fields, field) {
        if (typeof field == 'object')
          fields.push(field);
        return fields;
      }, [])
    }));
    
    if (job.process)
      ws.send(JSON.stringify({args: job.args, out: job.log}));
  };
};