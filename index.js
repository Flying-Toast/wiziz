const server = require('./server.js');
const helpers = require('./helpers.js');
const xss = require('xss');
const readline = require('readline');
const hashmap = require('hashmap');
const fs = require('fs');

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

var config = {
  playerSpeed: 1 / 4.5, //pixels per millisecond
  playerRadius: 65,
  hotbarLength: 4,
  minMapSize: 3000,
  maxMapSize: 20000,
  maxLeaderboardLength: 10,
  playerStartHealth: 1000,
  xpModel: function(checkLevel) { //returns the amount of xp needed to get to [checkLevel] param
    return (Math.round((Math.pow(checkLevel / 0.9, 2)) * 100));
  },
  updateMapSize: function() {
    var newSize = Math.round(Math.pow(Math.pow(game.players.length + 2, 2), 1 / 2.5) * 1000);

    if (newSize > config.maxMapSize) {
      newSize = config.maxMapSize;
    } else if (newSize < config.minMapSize) {
      newSize = config.minMapSize;
    }

    game.map.width = newSize;
    game.map.height = newSize;

  },

  unlocks: {
    level2: {
      newSpells: ['healSpell']
    },
    level3: {
      newSpells: ['bombSpell', 'slowSpell']
    },
    level4: {
      newSpells: ['blindSpell', 'speedSpell']
    },
    level5: {
      newSpells: ['shockSpell', 'freezeSpell']
    },
    level6: {
      newSpells: ['teleportSpell', 'invisibleSpell']
    },
    level7: {
      newSpells: []
    }
  }
};
var game = {};
game.players = [];
game.map = new Map(config.minMapSize, config.minMapSize);
game.spells = [];
game.effectAreas = [];
game.playerMap = new hashmap();
var spellEnts = { //spell entities
  fireSpell: {
    name: 'fireSpell',
    speed: 1,
    xpGain: 50,
    coolDown: 500,
    range: 700,
    radius: 10,
    type: 'projectile',
    damage: 100,
    get humanReadableEffect() {
      return (`Affected player gets -${this.damage} health`);
    },
    effect: function(affectedPlayer) {
      affectedPlayer.health -= this.damage;
    }
  },
  freezeSpell: {
    name: 'freezeSpell',
    speed: 0.7,
    xpGain: 140,
    range: 500,
    coolDown: 5000,
    radius: 10,
    effectWearOff: 2000,
    type: 'projectile',
    get humanReadableEffect() {
      return (`Affected player gets "frozen" and cannot move for ${this.effectWearOff/1000} seconds`);
    },
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
    xpGain: 80,
    speed: 0.7,
    range: 700,
    type: 'splash',
    coolDown: 4500,
    explosionRadius: 140,
    ttl: 4000,
    radius: 10,
    effectWearOff: 2000,
    playerCoolDown: 100, //delay between repetitions of effectArea affecting a certain player
    get humanReadableEffect() {
      return (`Affected players become "blinded" and their screens go dark for ${this.effectWearOff/1000} seconds`);
    },
    effect: function(affectedPlayer) { //effect of explosion area
      if (!affectedPlayer.blinded) {
        affectedPlayer.blinded = true;
        setTimeout(function() {
          affectedPlayer.blinded = false;
        }, this.effectWearOff);
      }
    },
    color: 'rgba(0, 0, 0, 0.6)'
  },
  healSpell: {
    name: 'healSpell',
    type: 'self',
    coolDown: 15000,
    playerCoolDown: 500,
    percentHealth: 10,
    get humanReadableEffect() {
      return (`Restores ${this.percentHealth}% of your health every ${this.playerCoolDown/1000} seconds`);
    },
    effect: function(affectedPlayer) {
      setIntervalX(function() {
        if (affectedPlayer.health + (affectedPlayer.maxHealth / spellEnts.healSpell.percentHealth) < affectedPlayer.maxHealth) {
          affectedPlayer.health += (affectedPlayer.maxHealth / spellEnts.healSpell.percentHealth);
        } else {
          affectedPlayer.health = affectedPlayer.maxHealth;
        }
      }, this.playerCoolDown, Math.ceil(100 / this.percentHealth));
    }
  },
  bombSpell: {
    name: 'bombSpell',
    speed: 0.5,
    xpGain: 75,
    range: 1500,
    type: 'splash',
    explosionRadius: 300,
    coolDown: 8000,
    ttl: 700,
    radius: 10,
    damage: 100,
    playerCoolDown: 200000, //(should never repeat, so set to crazy big number) //delay between repetitions of effectArea affecting a certain player
    get humanReadableEffect() {
      return (`Affected players get -${this.damage} health`);
    },
    effect: function(affectedPlayer) { //effect of explosion area
      affectedPlayer.health -= this.damage;
    },
    color: 'rgba(232, 6, 6, 0.6)'
  },
  invisibleSpell: {
    name: 'invisibleSpell',
    type: 'self',
    effectWearOff: 5000,
    coolDown: 11000,
    get humanReadableEffect() {
      return (`Makes your player invisible for ${this.effectWearOff/1000} seconds`);
    },
    effect: function(affectedPlayer) {
      affectedPlayer.invisible = true;
      setTimeout(function() {
        affectedPlayer.invisible = false;
      }, this.effectWearOff);
    }
  },
  speedSpell: {
    name: 'speedSpell',
    type: 'self',
    effectWearOff: 5000,
    coolDown: 7000,
    speedBost: 1.5,
    get humanReadableEffect() {
      return (`Makes your player move ${this.speedBost}x faster for ${this.effectWearOff/1000} seconds`);
    },
    effect: function(affectedPlayer) {
      affectedPlayer.movementSpeed = config.playerSpeed * this.speedBost;
      setTimeout(function() {
        affectedPlayer.movementSpeed = config.playerSpeed;
      }, this.effectWearOff);
    }
  },
  teleportSpell: {
    name: 'teleportSpell',
    speed: 0.8,
    coolDown: 7000,
    xpGain: 0,
    range: 600,
    radius: 10,
    type: 'projectile',
    get humanReadableEffect() {
      return ('Teleports your player to its location when it either reaches its target or hits another player');
    },
    effect: function(affectedPlayer) {}
  },
  shockSpell: {
    name: 'shockSpell',
    speed: 0.8,
    coolDown: 1200,
    xpGain: 89,
    range: 650,
    radius: 10,
    zapDelay: 1000, //how long inbetween zaps
    totalZaps: 3, //total number of zaps
    zapDamage: 75,
    type: 'projectile',
    get humanReadableEffect() {
      return (`Affected player loses ${this.zapDamage} health every ${this.zapDelay/1000} seconds, a total of ${this.totalZaps} times`);
    },
    effect: function(affectedPlayer) {
      setIntervalX(function() {
        server.io.to(affectedPlayer.id).emit('zap');
        affectedPlayer.health -= spellEnts.shockSpell.zapDamage;
      }, this.zapDelay, this.totalZaps);
    }
  },
  slowSpell: {
    name: 'slowSpell',
    xpGain: 95,
    speed: 0.5,
    range: 850,
    type: 'splash',
    coolDown: 4500,
    explosionRadius: 200,
    ttl: 5500,
    radius: 10,
    speedMultiplier: 0.5,
    effectWearOff: 2000,
    playerCoolDown: 2000, //delay between repetitions of effectArea affecting a certain player
    get humanReadableEffect() {
      return (`Affected players get slowed down to ${this.speedMultiplier*100}% of their original speed for ${this.playerCoolDown/1000} seconds`);
    },
    effect: function(affectedPlayer) { //effect of explosion area
      affectedPlayer.movementSpeed *= this.speedMultiplier;
      setTimeout(function() {
        affectedPlayer.movementSpeed = config.playerSpeed;
      }, this.effectWearOff);
    },
    color: 'rgba(17, 51, 12, 0.6)'
  }
};

fs.writeFile(__dirname + '/spells.json', JSON.stringify(spellEnts), function(err) {
  if (err) {
    throw (err);
  };
});

var spells = { //inventory items
  fireSpell: function() {
    return (new Spell('fireSpell', spellEnts.fireSpell.coolDown));
  },
  freezeSpell: function() {
    return (new Spell('freezeSpell', spellEnts.freezeSpell.coolDown));
  },
  blindSpell: function() {
    return (new Spell('blindSpell', spellEnts.blindSpell.coolDown));
  },
  healSpell: function() {
    return (new Spell('healSpell', spellEnts.healSpell.coolDown));
  },
  bombSpell: function() {
    return (new Spell('bombSpell', spellEnts.bombSpell.coolDown));
  },
  invisibleSpell: function() {
    return (new Spell('invisibleSpell', spellEnts.invisibleSpell.coolDown));
  },
  speedSpell: function() {
    return (new Spell('speedSpell', spellEnts.speedSpell.coolDown));
  },
  teleportSpell: function() {
    return (new Spell('teleportSpell', spellEnts.teleportSpell.coolDown));
  },
  shockSpell: function() {
    return (new Spell('shockSpell', spellEnts.shockSpell.coolDown));
  },
  slowSpell: function() {
    return (new Spell('slowSpell', spellEnts.slowSpell.coolDown));
  }
};

function setIntervalX(callback, delay, repetitions) {
  var x = 0;
  var intervalID = setInterval(function() {
    callback();
    if (++x === repetitions) {
      clearInterval(intervalID);
    }
  }, delay);
}

server.io.on('connection', function(socket) {

  socket.emit('spellEnts', spellEnts);

  socket.on('newGame', function(playerOptions) {

    if (game.players.indexOf(game.playerMap.get(socket.id)) !== -1) {
      game.players.splice(game.players.indexOf(game.playerMap.get(socket.id)), 1); //remove player from players array
      game.playerMap.delete(socket.id);
    }

    playerOptions.id = socket.id;
    newPlayer(playerOptions);
    config.updateMapSize();
  });

  socket.on('disconnect', function() {
    if (game.players.indexOf(game.playerMap.get(socket.id)) !== -1) {
      game.players.splice(game.players.indexOf(game.playerMap.get(socket.id)), 1); //remove player from players array
    }
    game.playerMap.delete(socket.id);
    config.updateMapSize();
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
  this.storage = [];
  this.inputs = [];
  this.quedInputs = [];
  this.angle = 0;
  this.selectedItem = 0;
  this.unlockedSpells = [];
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

function ProjectileSpell(origin, target, speed, caster, range, name, effect, radius, xpGain) {
  this.radius = radius;
  this.xpGain = xpGain;
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
  if (this.name === 'teleportSpell') {
    this.die = function() {
      this.caster.x = this.target.x;
      this.caster.y = this.target.y;
      this.dead = true;
      game.spells.splice(game.spells.indexOf(this), 1);
    };
  }
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

function SplashSpell(origin, target, speed, caster, explosionRadius, ttl, range, name, effect, color, radius, playerCoolDown, xpGain) {
  ProjectileSpell.call(this, origin, target, speed, caster, range, name, function() {}, radius, xpGain);
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
  updatedGame.leaderboard = getLeaders();
  for (var i = 0; i < updatedGame.players.length; i++) {
    var currentPlayer = updatedGame.players[i];
    currentPlayer.inputs = undefined;
    currentPlayer.quedInputs = undefined;
  }

  server.io.emit('update', updatedGame);
}

function getLeaders() {
  leaderboard = [];

  for (var i = 0; i < game.players.length; i++) {
    var checkingPlayer = Object.assign({}, game.players[i]);

    var pair = [checkingPlayer.nickname, checkingPlayer.xp, 0, checkingPlayer.id];

    leaderboard.push(pair);
  }

  leaderboard.sort(function(a, b) {
    return a[1] - b[1];
  });

  leaderboard.reverse();

  for (var i = 1; i <= leaderboard.length; i++) {
    leaderboard[i - 1][2] = i;
  }

  if (leaderboard.length <= config.maxLeaderboardLength) {
    return (leaderboard);
  } else {
    leaderboard.splice(config.maxLeaderboardLength)
    return (leaderboard);
  }
}

function physicsLoop() {
  for (var i = 0; i < game.players.length; i++) {
    var player = game.players[i];

    player.levelUpAtXp = config.xpModel(player.level + 1);
    if (player.xp >= player.levelUpAtXp && player.unlockedSpells.length === 0) {
      player.level++;
      var unlocks = config.unlocks['level' + player.level];
      if (unlocks && unlocks.newSpells) {
        player.unlockedSpells = unlocks.newSpells
      }
    }

    for (var j = 0; j < player.inputs.length; j++) {
      var input = player.inputs[j];

      switch (input.type) {
        case 'translate':
          var dt = input.dt;
          if (dt > 25) {
            dt = 25;
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
        case 'unlock':
          if (player.unlockedSpells.indexOf(input.chosenSpell) > -1) {
            if (player.inventory.length < config.hotbarLength) {
              player.inventory.push(spells[input.chosenSpell]());
              player.unlockedSpells = [];
            } else {
              player.storage.push(spells[input.chosenSpell]());
              player.unlockedSpells = [];
            }
          }
          break;
        case 'swap':
          if (player.storage[input.storageIndex]) {
            var storageItem = player.storage[input.storageIndex];
            var inventoryItem = player.inventory[player.selectedItem];
            player.storage[input.storageIndex] = inventoryItem;
            player.inventory[player.selectedItem] = storageItem;
          }
          break;
        case 'cast':
          if (!player.inventory[player.selectedItem].cooling) {
            if (spellEnts[player.inventory[player.selectedItem].itemName].type === 'projectile') {
              game.spells.push(new ProjectileSpell({
                x: player.x,
                y: player.y
              }, {
                x: input.mouse.x,
                y: input.mouse.y
              }, spellEnts[player.inventory[player.selectedItem].itemName].speed, player, spellEnts[player.inventory[player.selectedItem].itemName].range, spellEnts[player.inventory[player.selectedItem].itemName].name, spellEnts[player.inventory[player.selectedItem].itemName].effect, spellEnts[player.inventory[player.selectedItem].itemName].radius, spellEnts[player.inventory[player.selectedItem].itemName].xpGain));
            } else if (spellEnts[player.inventory[player.selectedItem].itemName].type === 'splash') {
              game.spells.push(new SplashSpell({
                x: player.x,
                y: player.y
              }, {
                x: input.mouse.x,
                y: input.mouse.y
              }, spellEnts[player.inventory[player.selectedItem].itemName].speed, player, spellEnts[player.inventory[player.selectedItem].itemName].explosionRadius, spellEnts[player.inventory[player.selectedItem].itemName].ttl, spellEnts[player.inventory[player.selectedItem].itemName].range, spellEnts[player.inventory[player.selectedItem].itemName].name, spellEnts[player.inventory[player.selectedItem].itemName].effect, spellEnts[player.inventory[player.selectedItem].itemName].color, spellEnts[player.inventory[player.selectedItem].itemName].radius, spellEnts[player.inventory[player.selectedItem].itemName].playerCoolDown, spellEnts[player.inventory[player.selectedItem].itemName].xpGain));
            } else if (spellEnts[player.inventory[player.selectedItem].itemName].type === 'self') {
              spellEnts[player.inventory[player.selectedItem].itemName].effect(player);
            }
            player.inventory[player.selectedItem].lastCast = Date.now();
            player.inventory[player.selectedItem].cooling = true;
          }
          break;
      }
      player.lastInput = input.id;
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
        if (spell.xpGain) {
          spell.caster.xp += spell.xpGain;
        }
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