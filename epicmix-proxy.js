var http = require('http');
var https = require('https');

var proxy = http.createServer(function (req, res) {
  console.log(req.connection.remoteAddress + ": " + req.url + ", Cookie was " + req.headers['cookie']);
  req.headers['host'] = 'www.epicmix.com';
  req.headers['cookie'] = req.headers['x-cookie'];
  
  var remote_req = https.request({
    hostname: 'www.epicmix.com',
    host: 'www.epicmix.com',
    port: 443,
    method: req.method,
    headers: req.headers,
    path: '/vailresorts/sites/epicmix/api/mobile' + req.url
  });
  
  
  req.on('data', function(chunk) { remote_req.write(chunk, 'binary'); });
  req.on('end', function() { remote_req.end(); });
  
  remote_req.on('response', function(remote_res) { 
    if (remote_res.statusCode == 302) {
      res.writeHead(404, 'Just Kidding It Was A 302');
      res.end('Would have been a 302, but I saved you from yourself');
      return;
    }
    remote_res.headers['x-set-cookie'] = remote_res.headers['set-cookie'];
    res.writeHead(remote_res.statusCode, remote_res.headers);
    remote_res.on('data', function(chunk) { res.write(chunk, 'binary'); });
    remote_res.on('end', function() { res.end(); });
  });
  
  remote_req.on('error', function(e) {
    res.writeHead(500, 'Error: The Nus');
    res.end(e.message);
  });
});
proxy.listen(8081);