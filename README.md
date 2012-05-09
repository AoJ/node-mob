

# mob

A simple toolkit for parallelizing node.js apps over several processes, built on top of the `cluster` module.

    $ npm install mob

### usage

A mob-based app runs as two or more processes - the Kingpin (master), and one or more Mobsters (workers).

The **Kingpin**'s only function is to **keep the cluster running** by launching and reviving children,
and to **route messages** between them. It should contain no application logic whatsoever,
which is to ensure that bugs in your app don't end up crashing your server, but just temporarily break the affected child process.

**Mobsters** are the actual workers that run your **application logic**.
Mobsters have different **roles**, so the application breaks down in several worker types,
each of which specializes in different functionality, and exports it to the cluster just like a CommonJS module exports its API.

The main script will look like this:

**main.js**
```javascript

require('mob')
  .start('myapp') //  starts the app and sets the process.title prefix for all processes.
  .base(module)   //  optional, all roles will have their paths resolved relatively to this module.

  //  .role() accepts three parameters:
  //  - the name of the role to be used with `mob.require()`;
  //  - the module to require in child processes assigned with this role;
  //  - any options, currently only the number of worker processes to spin up and keep alive.

    .role('back',  "./background-worker.js", {workers: 4})
    .role('front', "./http-server.js", {workers: 2});
```

`$ node main` will launch this script in as a Kingpin,
which in turn will launch the 6 specialized child processes,
in this case 4 background workers and 2 frontend processes.

**background-worker.js**
```javascript

console.log('Background worker ' + process.pid + ' running.' );

exports.foo = function () {
  console.log('Bar! My pid is ' + process.pid);
};
```

**http-server.js**
```javascript

var mob = require('mob');

//  Get a remoting proxy to the 'back' role's interface.
var back = mob.require('back');

//  Because mob is based on cluster,
//  all 2 'http-server' processes share the same server handle:

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');

  console.log('Server ' + process.pid + ' served an http request.');

  //  This will call foo on any one of the 4 'back' processes.
  back.foo();

  //  The proxy load-balances between all 4 processes, so
  //    next time `back.foo();` gets called it might hit a different process.

}).listen(1337, "127.0.0.1");
console.log('Server ' + process.pid + ' running at http://127.0.0.1:1337/');
```


# mobsters!

### exchanging messages

`mob.require()` is built on a very simple message-exchange mechanism
powered by `process.send()` and `worker.send()`. This mechanism is also exposed to application code in Mobster processes.

To send a message to all processes, do:
```javascript
require('mob')
    .send( myobj );
```

To send a message to all `back` processes, you could:
```javascript
require('mob')
    .all('back').send( myobj );
```

To send a message to a random `back` process:
```javascript
require('mob')
    .any('back').send( myobj );
```

Finally, to target a particular process by `pid`, do:
```javascript
require('mob')
    .pid( somepid ).send( myobj );
```

To listen for messages:
```javascript
require('mob').on('message', handler);
```

Keep in mind that messages are passed around as JSON, so this is only good for exchaning data.


### mobster export proxies

`mob.require()` is not `require()` -
you are not dealing with the `module.exports` object directly, but with a proxy.
**Only functions are proxied**, any other exported properties are ignored.

Mobster proxies created with `mob.require()` load-balance between workers,
which means Mobsters' exports are only good if they are stateless.
If you want to reuse state,
for example because you're using an in-process key/value store like node-dirty or divan,
you should extract it in its own Mobster with only one worker.


### passing callbacks

The `mob.require()` facility supports exchanging callbacks between processes, but two major limitations apply.

First, currently **a callback can be invoked only once**, after which it is de-referenced
and any further messages pushing data to that callback will be ignored.

Also, **make sure you do call back**, or else you will leak memory,
as each callback is retained locally in the calling process and transported over to the other process
as a numeric ID - and if you do not call back, this hard reference currently does not get collected.


# license

MIT.

