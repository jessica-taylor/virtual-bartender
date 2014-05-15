var http = require('http');
var fs = require('fs');
var path = require('path');

http.createServer(function(req, res) {
  var filePath = './website' + req.url;
  if (filePath == './website/') {
    filePath = './website/index.html';
  }

  var ext = path.extname(filePath);

  var contentType = 'text/html';

  switch (ext) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
  }

  fs.exists(filePath, function(exists) {
    if (exists) {
      fs.readFile(filePath, function(err, result) {
        if (err) {
          console.log(err);
          res.writeHead(500);
          res.end();
        } else {
          res.writeHead(200, {'Content-Type': contentType });
          res.end(result, 'utf-8');
        }
      });
    } else {
      res.writeHead(404);
      res.end('page not found');
    }
  });
}).listen(1337);

console.log('Server running at 127.0.0.1:1337');
