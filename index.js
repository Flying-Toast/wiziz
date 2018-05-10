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
game.spells = [];
game.playerMap = new hashmap();
var config = {
  playerSpeed: 1 / 6 //pixels per millisecond
};
var spells = {
  fireSpell: {
    itemName: 'fireSpell'
  },
  freezeSpell: {
    itemName: 'freezeSpell'
  }
};

server.io.on('connection', function(socket) {

  socket.on('newGame', function(playerOptions) {

    if (game.players.indexOf(game.playerMap.get(socket.id)) !== -1) {
      game.players.splice(game.players.indexOf(game.playerMap.get(socket.id)), 1); //remove player from players array
      game.playerMap.delete(socket.id);
    }

    playerOptions.id = socket.id;
    newPlayer(playerOptions);
  });

  socket.on('disconnect', function() {
    if (game.players.indexOf(game.playerMap.get(socket.id)) !== -1) {
      game.players.splice(game.players.indexOf(game.playerMap.get(socket.id)), 1); //remove player from players array
    }
    game.playerMap.delete(socket.id);
  });

  socket.on('input', function(inputs) {
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      var player = game.playerMap.get(socket.id);
      if (player) {
        player.quedInputs.push(input);
      }
    }
  });

});

function newPlayer(options) {
  var player = new Player(helpers.randInt(0, game.map.width), helpers.randInt(0, game.map.height), options.nickname, options.id, [spells.fireSpell]);

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
  this.inputs = [];
  this.quedInputs = [];
  this.angle = 0;
  this.lastMove = 0;
  this.selectedItem = 0;
}

function ProjectileSpell(origin, target, speed, caster) {
  this.origin = origin; //where the spell is cast from, should be an object with x and y properties
  this.target = target; //where the spell should die, should be an object with x and y properties
  this.caster = caster; //player that casted the spell
  this.location = JSON.parse(JSON.stringify(origin)); //the current location of the spell, starts at origin
  this.lenToTarget = helpers.distance(this.target.x, this.target.y, this.origin.x, this.origin.y);
  this.lastMove = Date.now();
  this.speed = speed; //pixels per millisecond
  this.dead = false;
  this.die = function() {
    game.spells.splice(game.spells.indexOf(this), 1);
  };
}
ProjectileSpell.prototype.tick = function() {
  //movement
  var currentTime = Date.now();
  var dt = currentTime - this.lastMove;
  if (!this.dead) {
    this.location.x += (this.speed / this.lenToTarget * (this.target.x - this.origin.x)) * dt;
    this.location.y += (this.speed / this.lenToTarget * (this.target.y - this.origin.y)) * dt;
    this.lastMove = Date.now();
  }
  //check if spell should die:
  if (helpers.distance(this.location.x, this.location.y, this.origin.x, this.origin.y) >= this.lenToTarget) {
    this.location = this.target;
    this.dead = true;
    this.die();
  }
  //check collisions with player:
};

function SplashSpell(origin, target, speed, caster, explosionRadius, ttl) {
  ProjectileSpell.call(this, origin, target, speed, caster);
  this.explosionRadius = explosionRadius;
  this.ttl = ttl; //the time to live after the explosion
  this.die = function() { //// TODO: 

  };
}


function updateLoop() {
  var updatedGame = JSON.parse(JSON.stringify(game));
  updatedGame.playerMap = undefined;
  for (var i = 0; i < updatedGame.players.length; i++) {
    var currentPlayer = updatedGame.players[i];
    currentPlayer.inputs = undefined;
    currentPlayer.quedInputs = undefined;
  }

  server.io.emit('update', updatedGame);
}

function physicsLoop() {
  for (var i = 0; i < game.players.length; i++) {
    var player = game.players[i];


    for (var j = 0; j < player.inputs.length; j++) {
      var input = player.inputs[j];

      switch (input.type) {
        case 'move':
          if (player.lastMove !== 0) {
            var dt = Date.now() - player.lastMove;
          } else {
            dt = 0;
          }

          var lenToMouse = helpers.distance(input.facing.x, input.windowWidth / 2, input.facing.y, input.windowHeight / 2);
          player.x += (config.playerSpeed / lenToMouse * (input.facing.x - input.windowWidth / 2)) * dt;
          player.y += (config.playerSpeed / lenToMouse * (input.facing.y - input.windowHeight / 2)) * dt;
          player.lastMove = Date.now();
          player.angle = Math.atan2(input.facing.x - input.windowWidth / 2, -(input.facing.y - input.windowHeight / 2));
          break;
        case 'scroll':
          if (input.direction === 'left') {
            player.selectedItem -= 1;
          } else {
            player.selectedItem += 1;
          }
          if (player.selectedItem < 0) {
            player.selectedItem = player.inventory.length - 1;
          } else if (player.selectedItem > player.inventory.length - 1) {
            player.selectedItem = 0;
          }
          break;
        case 'cast':
          //cast selected spell
          break;
      }
      player.lastInput = input.id;
      player.inputs.splice(player.inputs.indexOf(input, 1));
    }
    player.inputs = player.quedInputs;
    player.quedInputs = [];

    if (player.x < 0) {
      player.x = 0;
    }
    if (player.x > game.map.width) {
      player.x = game.map.width;
    }
    if (player.y < 0) {
      player.y = 0;
    }
    if (player.y > game.map.height) {
      player.y = game.map.height;
    }
  }

  for (var i = 0; i < game.spells.length; i++) {
    var spell = game.spells[i];
    spell.tick();
  }
}

setInterval(physicsLoop, 20);
setInterval(updateLoop, 100);