

### mob

A simple toolkit for parallelizing node.js apps over several processes,
built on top of the built-in `cluster` module,
which is in turn based on `child_process`.

    $ npm install mob


### usage

A mob-based app runs as two or more processes - the Kingpin (master), and one or more Mobsters (workers).

The **Kingpin**'s only function is to **keep the cluster running** by launching and reviving children,
and to **route messages** between them. It should contain no application logic whatsoever,
which is to ensure that bugs in your app don't end up crashing your server, but just temporarily break the affected child process.

**Mobsters** are the actual workers that run your **application logic**.
Mobsters can have different **roles**,
so that you can break up your application into various worker types,
each of which specializes in different functionality
and exports in to the cluster just like a CommonJS module exports its API.

The main script of a mob-based app looks like this:

**main.js**
```javascript

require('mob')
  .start('myapp') //  starts the app and sets the process.title prefix for all processes.
  .base(module)   //  optional, all roles will have their paths resolved relatively to this module.

  //  .role() accepts three parameters:
  //  - the name of the role to be used with `mob.require()`;
  //  - the module to require in child processes assigned with this role;
  //  - any options, currently only the number of worker processes to spin up and keep alive.

    .role('back',  "./background-jobs.js", {workers: 4})
    .role('front', "./http-server.js", {workers: 2});

```

`$ node main` will launch this script in a master process,
which in turn launches 6 specialized child processes,
4 for some expensive background job and 2 frontend processes.

**background-jobs.js**
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


### limitations

`mob.require()` is not `require()` -
you are not dealing with the `module.exports` object directly, but with a proxy.
**Only functions are proxied**, any other exported properties are ignored.

Mobster proxies created with `mob.require()` load-balance between workers,
which means Mobsters' exports are only good if they are stateless.
If you want to reuse state,
for example because you're using an in-process key/value store like node-dirty or divan,
you should extract it in its own Mobster with only one worker.

Callbacks as are supported, so long as each callback is invoked only once.
Also, make sure you do call back, because otherwise you might run into some garbage collection issues,
as each callback is retained locally in the calling process and transported over to the other process
as a numeric ID - and if you do not call back, this hard reference currently does not get collected.


### license

MIT.

