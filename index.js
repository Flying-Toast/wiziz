const server = require('./server.js');
const helpers = require('./helpers.js');
const xss = require('xss');
const readline = require('readline');
const hashmap = require('hashmap');

//stdin commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.on('line', function(line) {
  try {
    eval(line);
  } catch (err) {
    console.log(err);
  }
});
//////////////////////////////


var game = {};
game.players = [];
game.map = new Map(3000, 3000);
game.playerMap = new hashmap()

server.io.on('connection', function(socket) {

  socket.on('newGame', function(playerOptions) {
    playerOptions.id = socket.id;
    newPlayer(playerOptions);
  });

  socket.on('disconnect', function() {
    if (game.players.indexOf(game.playerMap.get(socket.id)) !== -1) {
      game.players.splice(game.players.indexOf(game.playerMap.get(socket.id)), 1); //remove player from players array
    }
  });

});

function newPlayer(options) {
  var player = new Player(helpers.randInt(0, game.map.width), helpers.randInt(0, game.map.height), options.nickname, options.id, []);

  if (!player.nickname) {
    player.nickname = 'Unnamed Sorcerer';
  }

  game.playerMap.set(player.id, player);
  game.players.push(player);
}

function Map(width, height) {
  this.width = width;
  this.height = height;
}

function Player(x, y, nickname, id, inventory) {
  this.x = x;
  this.y = y;
  this.nickname = xss(nickname.substring(0, 15));
  this.id = id;
  this.inventory = inventory;
}