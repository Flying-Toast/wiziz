var inventoryDiv = document.querySelector('#inventory');
var spellWrapper = document.querySelector('#spellWrapper');
var gameCanvas = document.querySelector('#gameCanvas');
var mainScreen = document.querySelector('#mainScreen');
var playButton = document.querySelector('#playButton');
var nicknameInput = document.querySelector('#nicknameInput');

onbeforeunload = function() {
  if (state === 'playing') {
    return ('You are still alive! Are you sure you want to leave?');
  }
};

addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
  }
});

nicknameInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    playButton.click();
  }
});

var ctx = gameCanvas.getContext('2d');

var game = {};
state = 'fresh';
var player = {};
var inputs = [];
var sprites = {
  players: {
    red: createSprite('media/images/playerRed.png'),
    green: createSprite('media/images/playerGreen.png'),
    blue: createSprite('media/images/playerBlue.png')
  },
  src: {
    fireSpell: 'media/images/fireSpell.png',
    freezeSpell: 'media/images/freezeSpell.png',
    blindSpell: 'media/images/blindSpell.png'
  },
  effects: {
    fireSpell: createSprite('media/images/fireEffect.png'),
    freezeSpell: createSprite('media/images/freezeEffect.png'),
    blindSpell: createSprite('media/images/blindEffect.png'),
  }
};
var sounds = {
  fireSpell: createSound('media/sounds/fireSpell.mp3', 'media/sounds/fireSpell.ogg'),
  freezeSpell: createSound('media/sounds/freezeSpell.mp3', 'media/sounds/freezeSpell.ogg'),
  blindSpell: createSound('media/sounds/blindSpell.mp3', 'media/sounds/blindSpell.ogg')
};
var local = {
  facing: {
    x: 0,
    y: 0
  },
  playerSpeed: 1 / 6,
  startingInventory: [{
    itemName: 'fireSpell',
    coolDown: 700
  }],
  quedInputs: [],
  player: {},
  savedInputs: [],
  inputNumber: 0,
  quedSavedInputs: [],
  lastUpdate: 0
};


function createSprite(src) {
  var sprite = document.createElement('img');
  sprite.src = src;
  return (sprite);
}

function createSound(mp3Src, oggSrc) {
  var sound = document.createElement('audio');
  var mp3 = document.createElement('source');
  var ogg = document.createElement('source');
  mp3.type = 'audio/mp3';
  ogg.type = 'audio/ogg';
  mp3.src = mp3Src;
  ogg.src = oggSrc;
  sound.appendChild(mp3);
  sound.appendChild(ogg);
  return (sound);
}

function localCoords(real, xOrY) {
  if (xOrY === 'x') {
    return (real + innerWidth / 2 - local.player.x);
  }

  if (xOrY === 'y') {
    return (real + innerHeight / 2 - local.player.y);
  }
}

function globalCoords(localCoord, xOrY) {
  if (xOrY === 'x') {
    return (localCoord - innerWidth / 2 + local.player.x);
  }

  if (xOrY === 'y') {
    return (localCoord - innerHeight / 2 + local.player.y);
  }
}

var socket = io.connect('/');

gameCanvas.width = innerWidth;
gameCanvas.height = innerHeight;

addEventListener('resize', function() {
  gameCanvas.width = innerWidth;
  gameCanvas.height = innerHeight;
});

socket.on('update', function(updatedGame) {
  game = updatedGame;
  local.lastUpdate = Date.now();

  if (game.players.find(function(element) {
      return (element.id === socket.id);
    })) {
    player = game.players.find(function(element) {
      return (element.id === socket.id);
    });
  }

  if (player.inventory) {
    fillInventory(player.inventory);
    document.querySelector('#inventorySlot' + (player.selectedItem + 1)).src = document.querySelector('#inventorySlot' + (player.selectedItem + 1)).src.replace('.png', 'Selected.png');
  }

  var indexOfLastInput = inputs.find(function(element) {
    return (element.id === player.lastInput);
  });

  if (indexOfLastInput) {
    local.savedInputs.splice(0, indexOfLastInput + 1);
  }

  if (!local.player.id) {
    local.player = player;
  }

});

playButton.addEventListener('click', function() {
  var playerOptions = {
    nickname: nicknameInput.value
  };
  socket.emit('newGame', playerOptions);
  fillInventory();
  fillInventory(local.startingInventory);

  mainScreen.style.display = 'none';
  local.lastTime = performance.now();
  requestAnimationFrame(drawLoop);
  state = 'playing';
});

function fillInventory(inventory) {
  if (!inventory) {
    spellWrapper.innerHTML = ''; //clear existing inventory

    for (var i = 0; i < 4; i++) {
      var coolDownDisplay = document.createElement('div');
      coolDownDisplay.className = 'coolDownDisplay';
      coolDownDisplay.id = 'coolDownDisplay' + (i + 1);
      coolDownDisplay.style.animation = 'none';
      coolDownDisplay.addEventListener('click', function(e) {
        if (player.inventory[this.id.slice(-1) - 1]) {
          local.quedInputs.push({
            type: 'select',
            itemIndex: this.id.slice(-1) - 1,
            id: local.inputNumber
          });
          local.inputNumber++;
        }
      });
      spellWrapper.appendChild(coolDownDisplay);
      var slotImg = createSprite('media/images/inventorySlot.png');
      slotImg.addEventListener('dragstart', function(e) {
        e.preventDefault();
      });
      slotImg.addEventListener('click', function(e) {
        if (player.inventory[this.id.slice(-1) - 1]) {
          local.quedInputs.push({
            type: 'select',
            itemIndex: this.id.slice(-1) - 1,
            id: local.inputNumber
          });
          local.inputNumber++;
        }
      });
      slotImg.id = 'inventorySlot' + (i + 1);
      slotImg.className = 'inventorySlot';
      spellWrapper.appendChild(slotImg);
    }
  } else {
    for (var i = 0; i < inventory.length; i++) {
      var item = document.querySelector('#inventorySlot' + (i + 1));
      var coolDownDiv = document.querySelector('#coolDownDisplay' + (i + 1));
      coolDownDiv.style.animationDuration = inventory[i].coolDown + 'ms';
      item.src = sprites.src[inventory[i].itemName];
    }
  }
}



function drawLoop() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  var currentTime = performance.now();
  var dt = currentTime - local.lastTime;
  local.lastTime = currentTime;

  local.quedInputs.push({
    type: 'move',
    facing: local.facing,
    windowWidth: innerWidth,
    windowHeight: innerHeight,
    id: local.inputNumber
  });
  local.inputNumber++;


  local.savedInputs = local.quedSavedInputs;
  local.quedSavedInputs = [];
  if (local.player.id) {
    for (var i = 0; i < local.savedInputs.length; i++) {
      var input = local.savedInputs[i];

      switch (input.type) {
        case 'move':

          var lenToMouse = Math.sqrt(Math.pow(input.facing.x - input.windowWidth / 2, 2) + Math.pow(input.facing.y - input.windowHeight / 2, 2));
          local.player.x += (local.playerSpeed / lenToMouse * (input.facing.x - input.windowWidth / 2)) * dt;
          local.player.y += (local.playerSpeed / lenToMouse * (input.facing.y - input.windowHeight / 2)) * dt;
          break;
      }
    }
  }

  if (local.player.x < 0) {
    local.player.x = 0;
  }
  if (local.player.x > game.map.width) {
    local.player.x = game.map.width;
  }
  if (local.player.y < 0) {
    local.player.y = 0;
  }
  if (local.player.y > game.map.height) {
    local.player.y = game.map.height;
  }

  grid.xOffset = -local.player.x;
  grid.yOffset = -local.player.y;

  //spell explosion areas
  for (var i = 0; i < game.effectAreas.length; i++) {
    var area = game.effectAreas[i];
    ctx.fillStyle = area.color;
    ctx.beginPath();
    ctx.arc(localCoords(area.location.x, 'x'), localCoords(area.location.y, 'y'), area.radius, 0, Math.PI * 2);
    ctx.fill();
  }


  for (var i = 0; i < game.players.length; i++) {
    var currentPlayer = game.players[i];
    if (currentPlayer.id !== player.id) {
      ctx.save();
      ctx.translate(localCoords(currentPlayer.x, 'x'), localCoords(currentPlayer.y, 'y'));
      ctx.rotate(currentPlayer.angle);
      ctx.drawImage(sprites.players.red, -sprites.players.red.width / 2, -sprites.players.red.height / 2);
      ctx.restore();
    }
  }

  //player
  ctx.save();
  ctx.translate(innerWidth / 2, innerHeight / 2);
  ctx.rotate(local.angle);
  ctx.drawImage(sprites.players.green, -sprites.players.green.width / 2, -sprites.players.green.height / 2);
  ctx.restore();

  //spells
  for (var i = 0; i < game.spells.length; i++) {
    var spell = game.spells[i];
    var predictedX = spell.location.x + (spell.speed / spell.lenToTarget * (spell.target.x - spell.origin.x) * (Date.now() - local.lastUpdate));
    var predictedY = spell.location.y + (spell.speed / spell.lenToTarget * (spell.target.y - spell.origin.y) * (Date.now() - local.lastUpdate));

    if (predictedX < 0) {
      predictedX = 0;
    }
    if (predictedX > game.map.width) {
      predictedX = game.map.width;
    }
    if (predictedY < 0) {
      predictedY = 0;
    }
    if (predictedY > game.map.height) {
      predictedY = game.map.height;
    }

    ctx.drawImage(sprites.effects[spell.name], localCoords(predictedX, 'x') - sprites.effects[spell.name].width / 2, localCoords(predictedY, 'y') - sprites.effects[spell.name].height / 2);
  }

  inputs = inputs.concat(local.quedInputs);
  local.quedSavedInputs = local.quedSavedInputs.concat(local.quedInputs);
  local.quedInputs = [];
  socket.emit('input', inputs);
  inputs = [];
  if (state === 'playing') {
    requestAnimationFrame(drawLoop);
  }
}

addEventListener('mousemove', function(e) {
  local.angle = Math.atan2(e.pageX - innerWidth / 2, -(e.pageY - innerHeight / 2));

  local.facing = {
    x: e.pageX,
    y: e.pageY
  };

  var lenToMouse = Math.sqrt(Math.pow(e.pageX - innerWidth / 2, 2) + Math.pow(e.pageY - innerHeight / 2, 2));
  grid.vx = 1 / lenToMouse * (e.pageX - innerWidth / 2);
  grid.vy = 1 / lenToMouse * (e.pageY - innerHeight / 2);
});

addEventListener('wheel', function(e) {
  if (state === 'playing') {
    e.preventDefault();
    if (e.deltaY > 0) {
      local.quedInputs.push({
        type: 'select',
        itemIndex: player.selectedItem - 1,
        id: local.inputNumber
      });
    } else {
      local.quedInputs.push({
        type: 'select',
        itemIndex: player.selectedItem + 1,
        id: local.inputNumber
      });
    }
    local.inputNumber++;
  }
});

addEventListener('keypress', function(e) {
  var inventorySlot = document.querySelector('#inventorySlot' + e.key);
  if (inventorySlot && player.inventory[e.key - 1] && !e.repeat) {
    local.quedInputs.push({
      type: 'select',
      itemIndex: e.key - 1,
      id: local.inputNumber
    });
    local.inputNumber++;
  }
});

function castSpell(e) {
  if (!player.inventory[player.selectedItem].cooling) {
    local.quedInputs.push({
      type: 'cast',
      id: local.inputNumber,
      mouse: {
        x: globalCoords(e.pageX, 'x'),
        y: globalCoords(e.pageY, 'y')
      }
    });
    local.inputNumber++;
    if (sounds[player.inventory[player.selectedItem].itemName].paused) {
      sounds[player.inventory[player.selectedItem].itemName].play();
    } else {
      sounds[player.inventory[player.selectedItem].itemName].pause();
      sounds[player.inventory[player.selectedItem].itemName].currentTime = 0;
      sounds[player.inventory[player.selectedItem].itemName].play();
    }
    var coolDown = document.querySelector('#coolDownDisplay' + (player.selectedItem + 1));
    setTimeout(function() {
      coolDown.style.animation = 'none';
    }, coolDown.style.animationDuration.slice(0, -2));
    coolDown.style.animation = '';
  }
}

gameCanvas.addEventListener('click', castSpell);