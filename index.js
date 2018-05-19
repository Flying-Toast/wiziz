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
game.effectAreas = [];
game.playerMap = new hashmap();
var config = {
  playerSpeed: 1 / 6, //pixels per millisecond
  playerRadius: 65,
  playerStartHealth: 1000,
  xpModel: function(checkLevel) {
    return (Math.pow(checkLevel - 1, 2) * 100);
  } //returns the amount of xp needed to get to [checkLevel] param
};
var spells = { //inventory items
  fireSpell: function() {
    return (new Spell('fireSpell', 700));
  },
  freezeSpell: function() {
    return (new Spell('freezeSpell', 5000));
  },

  blindSpell: function() {
    return (new Spell('blindSpell', 4000));
  }

};
var spellEnts = { //spell entities
  fireSpell: {
    name: 'fireSpell',
    speed: 1,
    range: 700,
    radius: 10,
    type: 'projectile',
    effect: function(affectedPlayer) {
      affectedPlayer.health -= 100;
    }
  },
  freezeSpell: {
    name: 'freezeSpell',
    speed: 0.7,
    range: 500,
    radius: 10,
    effectWearOff: 3000,
    type: 'projectile',
    effect: function(affectedPlayer) {
      if (affectedPlayer.movementSpeed !== 0) {
        affectedPlayer.movementSpeed = 0;
        setTimeout(function() {
          affectedPlayer.movementSpeed = config.playerSpeed;
        }, this.effectWearOff);
      }
    }
  },
  blindSpell: {
    name: 'blindSpell',
    speed: 0.7,
    range: 700,
    type: 'splash',
    explosionRadius: 140,
    ttl: 4000,
    radius: 10,
    effectWearOff: 2000,
    playerCoolDown: 100, //delay between repetitions of effectArea affecting a certain player
    effect: function(affectedPlayer) { //effect of explosion area
      if (!affectedPlayer.blinded) {
        affectedPlayer.blinded = true;
        setTimeout(function() {
          affectedPlayer.blinded = false;
        }, this.effectWearOff);
      }
    },
    color: 'rgba(0, 0, 0, 0.6)'
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
  if (options.nickname !== undefined) {
    var player = new Player(helpers.randInt(0, game.map.width), helpers.randInt(0, game.map.height), options.nickname, options.id, [spells.fireSpell()], config.playerStartHealth);

    if (!player.nickname) {
      player.nickname = 'Unnamed Sorcerer';
    }

    game.playerMap.set(player.id, player);
    game.players.push(player);
  }
}

function Map(width, height) {
  this.width = width;
  this.height = height;
}

function Player(x, y, nickname, id, inventory, health) {
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
  this.health = health;
  this.maxHealth = health; //maxHealth shouuld start at initial health, so the player has 100% health on spawn
  this.xp = 0; //starting xp
  this.level = 1; //starting level
  this.levelUpAtXp = config.xpModel(this.level + 1);
  this.movementSpeed = config.playerSpeed;
  this.blinded = false;
}

function Spell(itemName, coolDown) { //Spell is the item in an inventory, not the entity
  this.itemName = itemName;
  this.coolDown = coolDown;
  this.lastCast = 0;
  this.cooling = false;
}

function ProjectileSpell(origin, target, speed, caster, range, name, effect, radius) {
  this.radius = radius;
  this.origin = origin; //where the spell is cast from, should be an object with x and y properties
  this.name = name; //name of the spell eg. "fireSpell"
  this.target = {
    x: this.origin.x + (range / helpers.distance(target.x, target.y, this.origin.x, this.origin.y) * (target.x - this.origin.x)),
    y: this.origin.y + (range / helpers.distance(target.x, target.y, this.origin.x, this.origin.y) * (target.y - this.origin.y))
  }; //where the spell should die, should be an object with x and y properties
  this.caster = caster; //player that casted the spell
  this.effect = effect;
  this.type = 'projectile';
  this.location = JSON.parse(JSON.stringify(origin)); //the current location of the spell, starts at origin
  this.range = range; //how far, in pixels, the spell should travel before dying
  this.lenToTarget = helpers.distance(this.target.x, this.target.y, this.origin.x, this.origin.y);
  this.lastMove = Date.now();
  this.speed = speed; //pixels per millisecond
  this.dead = false;
  this.die = function() {
    this.dead = true;
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
    this.die();
  } else if (this.location.x < 0 || this.location.y < 0 || this.location.x > game.map.width || this.location.y > game.map.width) {
    this.die();
  }
  //check collisions with player:
};

function SplashSpell(origin, target, speed, caster, explosionRadius, ttl, range, name, effect, color, radius, playerCoolDown) {
  ProjectileSpell.call(this, origin, target, speed, caster, range, name, function() {}, radius);
  this.type = 'splash';
  this.explosionRadius = explosionRadius;
  this.ttl = ttl; //the time to live after the explosion
  this.die = function() {
    game.effectAreas.push(new EffectArea(this.location, explosionRadius, Date.now(), ttl, color, name, playerCoolDown));
    game.spells.splice(game.spells.indexOf(this), 1);
  };
}
SplashSpell.prototype.tick = ProjectileSpell.prototype.tick;

function EffectArea(location, radius, explosionTime, ttl, color, name, playerCoolDown) {
  this.location = location;
  this.radius = radius;
  this.explosionTime = explosionTime;
  this.ttl = ttl;
  this.name = name;
  this.color = color;
  this.immunePlayers = []; //Items in this array should be: {id:playerid, time: Date.now()}  players that the spell should not affect, so that a delay can be set for how fast player is affected while standing in the effect area
  this.playerCoolDown = playerCoolDown;
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

    player.levelUpAtXp = config.xpModel(player.level + 1);
    if (player.xp >= player.levelUpAtXp) {
      player.level++;
    }

    for (var j = 0; j < player.inputs.length; j++) {
      var input = player.inputs[j];

      switch (input.type) {
        case 'movement':

          if (player.lastMove !== 0) {
            var dt = Date.now() - player.lastMove;
          } else {
            dt = 0;
          }

          var states = input.states;

          var facing = { //imaginary point where player will move towards, starts out at player's location
            x: player.x,
            y: player.y
          };

          //move the point by 1 (could be any number) to make a line from current player position to the facing locations
          if (states.u) {
            facing.y -= 1;
          }
          if (states.d) {
            facing.y += 1;
          }
          if (states.l) {
            facing.x -= 1;
          }
          if (states.r) {
            facing.x += 1;
          }

          //find the new player postition, which is at (player.movementSpeed * dt) pixels in the direction of facing
          var lenToFacing = helpers.distance(facing.x, facing.y, player.x, player.y);

          if (lenToFacing !== 0) {
            player.x += (player.movementSpeed / lenToFacing * (facing.x - player.x)) * dt;
            player.y += (player.movementSpeed / lenToFacing * (facing.y - player.y)) * dt;
          }

          player.lastMove = Date.now();
          break;
        case 'rotate':
          player.angle = Math.atan2(input.facing.x - input.windowWidth / 2, -(input.facing.y - input.windowHeight / 2));
          break;
        case 'select':
          player.selectedItem = input.itemIndex;

          if (player.selectedItem < 0) {
            player.selectedItem = player.inventory.length - 1;
          } else if (player.selectedItem > player.inventory.length - 1) {
            player.selectedItem = 0;
          }
          break;
        case 'cast':
          if (!player.inventory[player.selectedItem].cooling) {
            //cast selected spell:
            if (spellEnts[player.inventory[player.selectedItem].itemName].type === 'projectile') {
              game.spells.push(new ProjectileSpell({
                x: player.x,
                y: player.y
              }, {
                x: input.mouse.x,
                y: input.mouse.y
              }, spellEnts[player.inventory[player.selectedItem].itemName].speed, player, spellEnts[player.inventory[player.selectedItem].itemName].range, spellEnts[player.inventory[player.selectedItem].itemName].name, spellEnts[player.inventory[player.selectedItem].itemName].effect, spellEnts[player.inventory[player.selectedItem].itemName].radius));
            } else {
              game.spells.push(new SplashSpell({
                x: player.x,
                y: player.y
              }, {
                x: input.mouse.x,
                y: input.mouse.y
              }, spellEnts[player.inventory[player.selectedItem].itemName].speed, player, spellEnts[player.inventory[player.selectedItem].itemName].explosionRadius, spellEnts[player.inventory[player.selectedItem].itemName].ttl, spellEnts[player.inventory[player.selectedItem].itemName].range, spellEnts[player.inventory[player.selectedItem].itemName].name, spellEnts[player.inventory[player.selectedItem].itemName].effect, spellEnts[player.inventory[player.selectedItem].itemName].color, spellEnts[player.inventory[player.selectedItem].itemName].radius, spellEnts[player.inventory[player.selectedItem].itemName].playerCoolDown));

            }
            player.inventory[player.selectedItem].lastCast = Date.now();
            player.inventory[player.selectedItem].cooling = true;
          }
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

    for (var e = 0; e < player.inventory.length; e++) {
      var currentItem = player.inventory[e];
      if (Date.now() - currentItem.lastCast >= currentItem.coolDown) {
        currentItem.cooling = false;
      }
    }

    for (var m = 0; m < game.spells.length; m++) {
      var spell = game.spells[m];
      if (helpers.distance(player.x, player.y, spell.location.x, spell.location.y) < spell.radius + config.playerRadius && player.id !== spell.caster.id) {
        if (spell.type === 'projectile') {
          spellEnts[spell.name].effect(player);
        }
        spell.caster.xp += 100;
        spell.die();
      }
    }

    for (var z = 0; z < game.effectAreas.length; z++) {
      var area = game.effectAreas[z];
      if (helpers.distance(player.x, player.y, area.location.x, area.location.y) < area.radius + config.playerRadius && !area.immunePlayers.find(function(element) {
          return (element.id === player.id);
        })) {
        spellEnts[area.name].effect(player);
        area.immunePlayers.push({
          id: player.id,
          time: Date.now()
        });
      }
    }

    if (player.health <= 0) {
      server.io.to(player.id).emit('youDied');
      game.players.splice(game.players.indexOf(player), 1);
    }

  }

  for (var f = 0; f < game.spells.length; f++) {
    var spell = game.spells[f];
    spell.tick();
  }

  for (var g = 0; g < game.effectAreas.length; g++) {
    var area = game.effectAreas[g];
    if (Date.now() - area.explosionTime >= area.ttl) {
      game.effectAreas.splice(game.effectAreas.indexOf(area), 1);
    } else {
      for (var i = 0; i < area.immunePlayers.length; i++) {
        var currentItem = area.immunePlayers[i];
        if (Date.now() - currentItem.time >= area.playerCoolDown) {
          area.immunePlayers.splice(area.immunePlayers[i], 1);
        }
      }
    }
  }

}

setInterval(physicsLoop, 20);
setInterval(updateLoop, 100);