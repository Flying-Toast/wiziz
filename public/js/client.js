var gridCanvas = document.querySelector('#gridCanvas');

gridCanvas.width = innerWidth;
gridCanvas.height = innerHeight;

addEventListener('resize', function() {
  gridCanvas.width = innerWidth;
  gridCanvas.height = innerHeight;
});
var grid = {
  xOffset: 0,
  yOffset: 0,
  gridSize: 40,
  lineWidth: 1,
  vx: 0,
  vy: 0,
  ctx: gridCanvas.getContext('2d'),
  backgroundColor: '#E8E8F9',
  lineColor: '#bebebe',
  borderColor: '#d4342a'
};

function drawGrid() {
  grid.xOffset = grid.xOffset % grid.gridSize;
  grid.yOffset = grid.yOffset % grid.gridSize;
  grid.ctx.lineWidth = grid.lineWidth;
  grid.ctx.fillStyle = grid.backgroundColor;
  grid.ctx.fillRect(0, 0, innerWidth, innerHeight);
  grid.ctx.strokeStyle = grid.lineColor;
  grid.ctx.beginPath();
  grid.ctx.moveTo(0, 0);
  for (var i = 0; i < innerWidth + grid.gridSize; i += grid.gridSize) {
    grid.ctx.moveTo(i + grid.xOffset, 0);
    grid.ctx.lineTo(i + grid.xOffset, innerHeight);
  }
  for (var i = 0; i < innerHeight + grid.gridSize; i += grid.gridSize) {
    grid.ctx.moveTo(0, i + grid.yOffset);
    grid.ctx.lineTo(innerWidth, i + grid.yOffset);
  }
  grid.ctx.stroke();
  if (game.map) {
    grid.ctx.strokeStyle = grid.borderColor;
    grid.ctx.lineWidth = 40;
    grid.ctx.beginPath();
    grid.ctx.moveTo(localCoords(0, 'x'), localCoords(0, 'y'));
    grid.ctx.lineTo(localCoords(game.map.width, 'x'), localCoords(0, 'y'));
    grid.ctx.lineTo(localCoords(game.map.width, 'x'), localCoords(game.map.height, 'y'));
    grid.ctx.lineTo(localCoords(0, 'x'), localCoords(game.map.height, 'y'));
    grid.ctx.lineTo(localCoords(0, 'x'), localCoords(0, 'y') - grid.ctx.lineWidth / 2);
    grid.ctx.stroke();
  }
  requestAnimationFrame(drawGrid);
}
requestAnimationFrame(drawGrid);

var inventoryDiv = document.querySelector('#inventory');
var storageDiv = document.querySelector('#storage');
var spellWrapper = document.querySelector('#spellWrapper');
var storageWrapper = document.querySelector('#storageWrapper');
var gameCanvas = document.querySelector('#gameCanvas');
var mainScreen = document.querySelector('#mainScreen');
var playButton = document.querySelector('#playButton');
var nicknameInput = document.querySelector('#nicknameInput');
var healthBar = document.querySelector('#health');
var xpBar = document.querySelector('#xp');
var gameScreen = document.querySelector('#game');
var levelNumberDisplay = document.querySelector('#levelNumberDisplay');
var xpNumberDisplay = document.querySelector('#xpNumberDisplay');
var healthPercentDisplay = document.querySelector('#healthPercentDisplay');
var chooseUnlockedSpells = document.querySelector('#chooseUnlockedSpells');
var chooseUnlockedSpellsWrapper = document.querySelector('#chooseUnlockedSpellsWrapper');

onbeforeunload = function() {
  if (state === 'playing') {
    return ('You are still alive! Are you sure you want to leave?');
  }
};

nicknameInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    playButton.click();
  }
});

playButton.addEventListener('click', function() {
  var playerOptions = {
    nickname: nicknameInput.value
  };
  local.movement = {
    u: false,
    d: false,
    l: false,
    r: false
  };
  socket.emit('newGame', playerOptions);
  fillInventory();
  fillInventory(local.startingInventory);

  mainScreen.style.display = 'none';
  local.lastTime = performance.now();
  requestAnimationFrame(drawLoop);
  state = 'playing';
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
    blindSpell: 'media/images/blindSpell.png',
    healSpell: 'media/images/healSpell.png',
    bombSpell: 'media/images/bombSpell.png',
    invisibleSpell: 'media/images/invisibleSpell.png',
    teleportSpell: 'media/images/teleportSpell.png',
    speedSpell: 'media/images/speedSpell.png',
    shockSpell: 'media/images/shockSpell.png',
    openStorage: 'media/images/openStorage.png'
  },
  effects: {
    fireSpell: createSprite('media/images/fireEffect.png'),
    freezeSpell: createSprite('media/images/freezeEffect.png'),
    bombSpell: createSprite('media/images/bombEffect.png'),
    shockSpell: createSprite('media/images/shockEffect.png'),
    teleportSpell: createSprite('media/images/teleportEffect.png'),
    blindSpell: createSprite('media/images/blindEffect.png')
  }
};
var sounds = {
  fireSpell: createSound('media/sounds/fireSpell.mp3', 'media/sounds/fireSpell.ogg'),
  freezeSpell: createSound('media/sounds/freezeSpell.mp3', 'media/sounds/freezeSpell.ogg'),
  healSpell: createSound('media/sounds/healSpell.mp3', 'media/sounds/healSpell.ogg'),
  bombSpell: createSound('media/sounds/bombSpell.mp3', 'media/sounds/bombSpell.ogg'),
  blindSpell: createSound('media/sounds/blindSpell.mp3', 'media/sounds/blindSpell.ogg'),
  speedSpell: createSound('media/sounds/speedSpell.mp3', 'media/sounds/speedSpell.ogg'),
  teleportSpell: createSound('media/sounds/teleportSpell.mp3', 'media/sounds/teleportSpell.ogg'),
  shockSpell: createSound('media/sounds/shockSpell.mp3', 'media/sounds/shockSpell.ogg'),
  invisibleSpell: createSound('media/sounds/invisibleSpell.mp3', 'media/sounds/invisibleSpell.ogg')
};
var local = {
  facing: {
    x: 0,
    y: 0
  },
  playerSnapshots: [],
  startingInventory: [{
    itemName: 'fireSpell',
    coolDown: 700
  }],
  lastPlayerStates: [],
  quedInputs: [],
  savedInputs: [],
  chosingUnlock: false,
  lastChosenUnlock: 1,
  inputNumber: 0,
  player: {},
  playerRadius: 65,
  lastUpdate: 0,
  spellEnts: {},
  controls: {
    w: 'u',
    s: 'd',
    a: 'l',
    d: 'r'
  },
  keymap: {
    e: 'toggleStorage'
  },
  movement: {
    u: false,
    d: false,
    l: false,
    r: false
  }
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

function distance(ax, ay, bx, by) {
  return (Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2)));
}

var socket = io.connect('/');

gameCanvas.width = innerWidth;
gameCanvas.height = innerHeight;

addEventListener('resize', function() {
  gameCanvas.width = innerWidth;
  gameCanvas.height = innerHeight;
});

socket.on('youDied', function() {
  state = 'dead';
  mainScreen.style.display = '';
  mainScreen.style.animationName = '';
  mainScreen.style.animationName = 'death';
});

socket.on('spellEnts', function(data) {
  local.spellEnts = data;
});

socket.on('update', function(updatedGame) {
  if (game.players) {
    local.lastPlayerStates = JSON.parse(JSON.stringify(game.players));
  }

  game = updatedGame;
  local.lastUpdate = Date.now();

  if (game.players.find(function(element) {
      return (element.id === socket.id);
    })) {
    player = game.players.find(function(element) {
      return (element.id === socket.id);
    });
  }

  var lastSnapshot = local.playerSnapshots.find(function(element) {
    return (element.id === player.lastInput);
  });

  if (lastSnapshot) {
    local.playerSnapshots.splice(0, local.playerSnapshots.indexOf(lastSnapshot));
  }

  if (!local.player.id) {
    local.player = player;
  } else if (lastSnapshot) { //there is a playerSnapshot of the most recent authoritative player

    var correctionX = lastSnapshot.player.x - player.x;
    var correctionY = lastSnapshot.player.y - player.y;

    if (Math.abs(correctionX) > 20 || Math.abs(correctionY) > 20) {
      local.player.x -= correctionX;
      local.player.y -= correctionY;
    }

  }

  if (player.inventory) {
    fillInventory(player.inventory);
    document.querySelector('#inventorySlot' + (player.selectedItem + 1)).src = document.querySelector('#inventorySlot' + (player.selectedItem + 1)).src.replace('.png', 'Selected.png');
  }

  if (player.storage) {
    fillStorage(player.storage);
  }

  if (game.leaderboard) {
    updateLeaderboard(game.leaderboard);
  }

  var indexOfLastInput = local.savedInputs.indexOf(local.savedInputs.find(function(element) {
    return (element.id === player.lastInput);
  }));

  if (indexOfLastInput) {
    local.savedInputs.splice(0, indexOfLastInput + 1);
  }
});

onload = function() {
  document.querySelector('#loading').style.display = 'none';
  document.querySelector('#instructionsToggle').checked = true;
};

function fillInventory(inventory) {
  if (!inventory) {
    spellWrapper.innerHTML = '';
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
    var openStorage = createSprite(sprites.src.openStorage);
    openStorage.className = 'inventorySlot';
    openStorage.addEventListener('dragstart', function(e) {
      e.preventDefault();
    });
    openStorage.addEventListener('click', toggleStorage);
    spellWrapper.appendChild(openStorage);
  } else {
    for (var i = 0; i < inventory.length; i++) {
      var item = document.querySelector('#inventorySlot' + (i + 1));
      var coolDownDiv = document.querySelector('#coolDownDisplay' + (i + 1));
      coolDownDiv.style.animationDuration = inventory[i].coolDown + 'ms';
      item.src = sprites.src[inventory[i].itemName];
      item.title = local.spellEnts[inventory[i].itemName].humanReadableEffect;
    }
  }
}

function storageClickHandler(e) {
  local.quedInputs.push({
    type: 'swap',
    storageIndex: e.target.id.slice(1),
    id: local.inputNumber
  });
  local.inputNumber++;
}

function fillStorage(storage) {
  var totalSlots = storageDiv.children.length;

  if (totalSlots === 0) {

    for (var i = 0; i < 10; i++) {
      var slot = document.createElement('img');
      slot.src = 'media/images/inventorySlot.png';
      slot.className = 'storageSlot';
      slot.id = 's' + i;
      slot.addEventListener('click', storageClickHandler);
      storageDiv.appendChild(slot);
    }

  }

  if (!storage) {
    return;
  }

  if (storage.length > totalSlots) {
    for (var i = 0; i < storage.length - totalSlots; i++) {
      var slot = document.createElement('img');
      slot.src = 'media/images/inventorySlot.png';
      slot.className = 'storageSlot';
      slot.id = 's' + i;
      slot.addEventListener('click', storageClickHandler);
      storageDiv.appendChild(slot);
    }
  }

  for (var i = 0; i < storage.length; i++) {
    var currentItem = storage[i];
    var slot = document.querySelector('#s' + i);
    slot.src = sprites.src[currentItem.itemName];
    slot.title = local.spellEnts[currentItem.itemName].humanReadableEffect;
  }
}

function toggleStorage() {
  if (storageWrapper.style.display === '') {
    storageWrapper.style.display = 'block';
  } else {
    storageWrapper.style.display = '';
  }
}

function drawLoop() {
  var currentTime = performance.now();

  var dt = currentTime - local.lastTime;
  if (dt > 25) {
    dt = 25;
  }
  local.lastTime = currentTime;

  ctx.clearRect(0, 0, innerWidth, innerHeight);

  if (state !== 'playing' || local.lastUpdate === 0) {
    return;
  }

  local.quedInputs.push({
    type: 'translate',
    facing: local.facing,
    dt: dt,
    windowWidth: innerWidth,
    windowHeight: innerHeight,
    states: local.movement,
    id: local.inputNumber
  });
  local.inputNumber++;

  for (var i = 0; i < local.savedInputs.length; i++) {
    var input = local.savedInputs[i];
    switch (input.type) {
      case 'translate':
        var states = input.states;

        var facing = { //imaginary point where player will move towards, starts out at player's location
          x: local.player.x,
          y: local.player.y
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
        var lenToFacing = distance(facing.x, facing.y, local.player.x, local.player.y);

        if (lenToFacing !== 0) {
          local.player.x += (player.movementSpeed / lenToFacing * (facing.x - local.player.x)) * input.dt;
          local.player.y += (player.movementSpeed / lenToFacing * (facing.y - local.player.y)) * input.dt;
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
        break;
    }
  }

  if (local.savedInputs.length) {
    local.playerSnapshots.push({
      id: local.savedInputs[local.savedInputs.length - 1].id,
      player: local.player
    });
  }

  local.savedInputs = [];

  if (player.unlockedSpells && player.unlockedSpells.length > 0 && !local.chosingUnlock && local.lastChosenUnlock < player.level) {
    chooseUnlockedSpells.innerHTML = '';
    local.chosingUnlock = true;
    chooseUnlockedSpellsWrapper.style.display = 'inline-block';
    for (var i = 0; i < player.unlockedSpells.length; i++) {
      var currentSpellName = player.unlockedSpells[i];

      var image = document.createElement('img');
      image.src = sprites.src[currentSpellName];
      image.id = currentSpellName;
      image.title = local.spellEnts[currentSpellName].humanReadableEffect;
      chooseUnlockedSpells.appendChild(image);
      image.addEventListener('click', function(e) {
        local.quedInputs.push({
          type: 'unlock',
          chosenSpell: e.target.id,
          id: local.inputNumber
        });
        local.inputNumber++;

        local.chosingUnlock = false;
        local.lastChosenUnlock++;
        chooseUnlockedSpellsWrapper.style.display = '';
      });

    }
  };

  grid.xOffset = -local.player.x;
  grid.yOffset = -local.player.y;

  //spell explosion areas
  if (game.effectAreas) {
    for (var i = 0; i < game.effectAreas.length; i++) {
      var area = game.effectAreas[i];
      ctx.fillStyle = area.color;
      ctx.beginPath();
      ctx.arc(localCoords(area.location.x, 'x'), localCoords(area.location.y, 'y'), area.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (var i = 0; i < game.players.length; i++) {
    var currentPlayer = game.players[i];
    if (currentPlayer.id !== player.id) {

      var lastCurrentPlayer = local.lastPlayerStates.find(function(element) {
        return (currentPlayer.id === element.id);
      });

      if (!lastCurrentPlayer) {
        continue;
      }

      var newPosition = vLerp({
        x: lastCurrentPlayer.x,
        y: lastCurrentPlayer.y
      }, {
        x: currentPlayer.x,
        y: currentPlayer.y
      }, 0.05);

      lastCurrentPlayer.x = newPosition.x;
      lastCurrentPlayer.y = newPosition.y;

      if (!currentPlayer.invisible) {
        ctx.save();
        ctx.translate(localCoords(lastCurrentPlayer.x, 'x'), localCoords(lastCurrentPlayer.y, 'y'));
        ctx.rotate(currentPlayer.angle);
        ctx.drawImage(sprites.players.red, -sprites.players.red.width / 2, -sprites.players.red.height / 2);
        ctx.restore();
        ctx.save();
        ctx.translate(localCoords(lastCurrentPlayer.x, 'x'), localCoords(lastCurrentPlayer.y, 'y'));
        ctx.font = "20px newRocker";
        ctx.fillStyle = '#2dafaf';
        ctx.fillText(currentPlayer.nickname, -(ctx.measureText(currentPlayer.nickname).width / 2), 80);
        ctx.font = "18px agane";
        ctx.fillStyle = '#2dafaf';
        ctx.fillText('lvl ' + currentPlayer.level, -(ctx.measureText('lvl ' + currentPlayer.level).width / 2), 100);
        ctx.restore();
      } else {
        ctx.fillStyle = grid.backgroundColor;
        ctx.beginPath();
        ctx.arc(localCoords(currentPlayer.x, 'x'), localCoords(currentPlayer.y, 'y'), local.playerRadius, 0, Math.PI * 2);
        ctx.fill();
      }

    }
  }

  //player
  if (!player.invisible) {
    ctx.save();
    ctx.translate(innerWidth / 2, innerHeight / 2);
    ctx.rotate(local.angle);
    ctx.drawImage(sprites.players.green, -sprites.players.green.width / 2, -sprites.players.green.height / 2);
    ctx.restore();
  } else {
    ctx.fillStyle = grid.backgroundColor;
    ctx.beginPath();
    ctx.arc(innerWidth / 2, innerHeight / 2, local.playerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

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

  if (player.blinded) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  healthBar.style.width = 'calc(' + (player.health / player.maxHealth * 100) + '%' + ' - 8px' + ')';
  healthPercentDisplay.innerText = Math.round(player.health / player.maxHealth * 100);
  levelNumberDisplay.innerText = player.level;
  xpNumberDisplay.innerText = player.xp;
  xpBar.style.width = 'calc(' + (player.xp / player.levelUpAtXp * 100) + '%' + ' - 8px' + ')';

  inputs = inputs.concat(local.quedInputs); //load input que
  local.savedInputs = local.savedInputs.concat(local.quedInputs);
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
});

addEventListener('wheel', function(e) {
  if (state === 'playing' && e.target.id === 'gameCanvas') {
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

addEventListener('keydown', function(e) {
  var inventorySlot = document.querySelector('#inventorySlot' + e.key);
  if (inventorySlot && player.inventory[e.key - 1] && !e.repeat) {
    local.quedInputs.push({
      type: 'select',
      itemIndex: e.key - 1,
      id: local.inputNumber
    });
    local.inputNumber++;
  } else if (local.controls[e.key.toLowerCase()] && state === 'playing') {
    local.movement[local.controls[e.key.toLowerCase()]] = true;
  } else if (local.keymap[e.key.toLowerCase()] === 'toggleStorage' && state === 'playing') {
    toggleStorage();
  }
});

addEventListener('keyup', function(e) {
  if (local.controls[e.key.toLowerCase()]) {
    local.movement[local.controls[e.key.toLowerCase()]] = false;
  }
});

addEventListener('blur', function() {
  for (var key in local.controls) {
    local.movement[local.controls[key]] = false;
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
chooseUnlockedSpellsWrapper.addEventListener('click', function(e) {
  if (e.target.id !== 'chooseUnlockedSpells' && e.target.parentElement.id !== 'chooseUnlockedSpells') {
    castSpell(e);
  }
});

function updateLeaderboard(leaderboard) {
  if (!document.getElementById('leaderboard')) {
    leaderboardElement = document.createElement('div');
    leaderboardElement.id = 'leaderboard';

    var header = document.createElement('h4');
    header.id = 'leaderboardHeader';
    header.innerText = 'Leaderboard';

    leadersList = document.createElement('ul');
    leadersList.id = 'leadersList';

    leaderboardElement.appendChild(header);
    leaderboardElement.appendChild(leadersList);

    document.body.appendChild(leaderboardElement);
  }

  if (leaderboardElement.innerHTML === '') {
    var header = document.createElement('h4');
    header.id = 'leaderboardHeader';
    header.innerText = 'Leaderboard';

    leadersList = document.createElement('ul');
    leadersList.id = 'leadersList';

    leaderboardElement.appendChild(header);
    leaderboardElement.appendChild(leadersList);
  }

  leadersList.innerHTML = '';

  for (var i = 0; i < leaderboard.length; i++) {
    var nickname = leaderboard[i][0];
    var score = leaderboard[i][1];
    var place = leaderboard[i][2];
    var id = leaderboard[i][3];

    var playerLi = document.createElement('li');
    playerLi.className = 'playerLi';
    if (id === player.id) {
      playerLi.className += ' self';
    }
    var nicknameSpan = document.createElement('span');
    nicknameSpan.className = 'nickname';
    var scoreSpan = document.createElement('span');
    scoreSpan.className = 'score';
    var placeSpan = document.createElement('span');
    placeSpan.className = 'place';

    nicknameSpan.innerText = nickname;
    scoreSpan.innerText = score;
    placeSpan.innerText = place + '.';

    playerLi.appendChild(placeSpan);
    playerLi.appendChild(nicknameSpan);
    playerLi.appendChild(scoreSpan);

    leadersList.appendChild(playerLi);
  }

}

lerp = function(p, n, t) {
  var t = Number(t);
  t = parseFloat((Math.max(0, Math.min(1, t))).toFixed(3));
  return parseFloat((p + t * (n - p)).toFixed(3));
};

vLerp = function(v, tv, t) {
  return {
    x: this.lerp(v.x, tv.x, t),
    y: this.lerp(v.y, tv.y, t)
  };
};

function distance(ax, ay, bx, by) {
  return (Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2)));
}