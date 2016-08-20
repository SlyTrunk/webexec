# webexec

Webexec makes it easy to build a web interface for linux commands. Simply define your shell command and arguments and webexec builds a web page with a form and websocket endpoint that lets you run the command and stream its output from a web browser. You can also pause and resume a command (using SIGSTOP and SIGCONT) from the web interface.

<img src="https://raw.githubusercontent.com/SlyTrunk/webexec/master/screenshot.png" alt="screenshot">

## Setup

The `webexec` module exports a `connectHandler` function that instantiates a websocket connect handler function for use with the [ws](https://www.npmjs.com/package/ws) websocket library:

```javascript
connectHandler: function(name, command, options)
```

* `name` (string) is your command's name for display purposes
* `command` is an array of strings or objects making up your command
    * strings are fixed parts of the command per [`child_process.spawn args`](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options)
    * objects of the form `{name: '(field name)'}` become text fields in the UI whose string value is inserted here
    * objects of the form `{name: '(field name)', options: [{name: '(name)', value: '(value)'}, ...]}` become select fields whose string value is inserted here
* `options` is an optional object with the following keys and default values:
    * `cwd` (string), provided to `child_process.spawn`, defaults to client script's own working directory
    * `maxLogLength` (number), in characters, of program output to store in memory; defaults to `10000`

Here's an example generating a connect handler for a command that tails server logs:

```javascript
var onConnect = require('webexec').connectHandler('Server Logs', [
  'tail', '-F', {
    name: 'Log',
    options: [
      {name: 'Access', value: '/var/log/nginx/access.log'},
      {name: 'Error', value: '/var/log/nginx/error.log'}
    ]
  }
]);
```

In addition to attaching the websocket connect handler to a `ws.WebSocketServer` object, you must serve the UI front-end [`index.html`](https://github.com/SlyTrunk/webexec/blob/master/index.html) via `http`. The javascript on that page will connect to the websocket endpoint at the same host and path.

See [`server.js`](https://github.com/SlyTrunk/webexec/blob/master/server.js) for a complete example of a standalone webexec server. You can launch this server by running `npm start` in the project directory.
