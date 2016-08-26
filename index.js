var spawn = require('child_process').spawn;

exports.connectHandler = function(name, command, options) {
  
  if (!options) options = {};
  var maxLogLength = options.maxLogLength || 10000,
      clients = [],
      job = {};

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
            var args = command.map(function(part) {
              if (typeof part == 'string') return part;
              var arg = message.args.shift();
              if (part.options && !part.options.some(function(o) { return o.value+'' === arg; }))
                throw 'Invalid option for field '+part.name+': '+arg;
              return arg;
            });
            job.log = '';
            job.args = message.args.slice(0);
            job.process = spawn('/usr/bin/env', args, {cwd: options.cwd});
            job.process.stdout.on('data', function(data) {
              job.log += data = data.toString();
              if (job.log.length > maxLogLength) {
                var start = job.log.length - maxLogLength,
                    i = job.log.indexOf('\n', start);
                job.log = '[output truncated]\n'+job.log.substr(i < 0 ? start : i+1);
              }
              broadcast({out: data});
            });
            job.process.stderr.on('data', function(data) {
              console.log(data.toString());
            });
            job.process.on('close', function() {
              console.log('[process exited]');
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
        console.log('Error parsing incoming message: '+e);
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
