const express = require('express');
const socket = require('socket.io');
const bodyParser = require('body-parser');
const fs = require('fs');

var exports = module.exports;

var app = express();

var port = process.env.PORT || '80';

var server = app.listen(port, function() {
  console.log('listening on port ' + port);
});

app.get('/spellSuggestion', function(req, res) {
  res.sendFile(__dirname + '/public/suggestSpell.html');
});

app.use(bodyParser.urlencoded({
  extended: true
}));
app.post('/spellSuggestion', function(req, res) {

  fs.appendFile('suggestions.txt', '\nSpell Name: ' + req.body.spellName + '\nSpell Type: ' + req.body.spellType + '\nEffect: ' + req.body.effect + '\nRequester Ip: ' + req.ip + '\nRequest Headers: ' + JSON.stringify(req.headers) + '\n=====', function(err) {
    if (err) {
      console.log(err);
    }
  });

  res.redirect(303, '/thanks.html');
});

app.get('/credits', function(req, res) {
  res.sendFile(__dirname + '/public/credits.txt');
});

app.get('/wiki', function(req, res) {
  res.sendFile(__dirname + '/public/wiki/wiki.html');
});

app.use('/', express.static('public'));

exports.io = socket(server);