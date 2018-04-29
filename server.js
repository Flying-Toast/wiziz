const express = require('express');
const socket = require('socket.io');

var exports = module.exports;

var app = express();

var port = process.env.PORT || '80';

var server = app.listen(port, function() {
  console.log('listening on port ' + port);
});

app.use('/', express.static('public'));

exports.io = socket(server);