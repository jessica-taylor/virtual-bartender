var http = require('http');
var fs = require('fs');
var path = require('path');

var static = require('node-static');

var staticServer = new static.Server('./website');

http.createServer(function(req, res) {
  req.addListener('end', function() {
    staticServer.serve(req, res);
  }).resume();
}).listen(1337);

console.log('Server running at 127.0.0.1:1337');
