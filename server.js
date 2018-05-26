const express = require('express');
const socket = require('socket.io');
const ejs = require('ejs');
const fs = require('fs');

var exports = module.exports;

var spells;

fs.readFile(__dirname + '/spells.json', function(err, data) {
  if (err) {
    console.log(err);
  }
  spells = JSON.parse(data);
});

var app = express();

app.set('view engine', 'ejs');

var port = process.env.PORT || '80';

var server = app.listen(port, function() {
  console.log('listening on port ' + port);
});

app.get('/tutorial', function(req, res) {
  res.sendFile(__dirname + '/public/tutorial.html');
});

app.get('/credits', function(req, res) {
  res.sendFile(__dirname + '/public/credits.txt');
});

app.get('/wiki', function(req, res) {
  res.render(__dirname + '/public/wiki/wiki.ejs', {
    spells: spells
  });
});

app.use('/', express.static('public'));

exports.io = socket(server);