

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

