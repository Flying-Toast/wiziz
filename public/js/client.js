var inventoryDiv = document.querySelector('#inventory');
var spellWrapper = document.querySelector('#spellWrapper');
var gameCanvas = document.querySelector('#gameCanvas');
var mainScreen = document.querySelector('#mainScreen');
var playButton = document.querySelector('#playButton');
var nicknameInput = document.querySelector('#nicknameInput');

var ctx = gameCanvas.getContext('2d');

var game = {};
state = 'fresh';
var player = {};
var inputs = [];
var local = {
  facing: {
    x: 0,
    y: 0
  },
  playerSpeed: 1 / 6,
  startingInventory: [{
    itemName: 'fireSpell'
  }]
};
var sprites = {
  player: createSprite('media/images/player.png'),
  src: {
    fireSpell: 'media/images/fireSpell.png',
    freezeSpell: 'media/images/freezeSpell.png'
  }
};

function createSprite(src) {
  var sprite = document.createElement('img');
  sprite.src = src;
  return (sprite);
}

//temporary coords display
var pos = document.createElement('div');
pos.style = 'z-index:100;position:absolute;right:0;top:0;';
document.body.appendChild(pos);



function localCoords(real, xOrY) {
  if (xOrY === 'x') {
    return (real + window.innerWidth / 2 - player.x);
  }

  if (xOrY === 'y') {
    return (real + window.innerHeight / 2 - player.y);
  }
}

function globalCoords(local, xOrY) {
  if (xOrY === 'x') {
    return (local - window.innerWidth / 2 - player.x);
  }

  if (xOrY === 'y') {
    return (local - window.innerHeight / 2 - player.y);
  }
}

var socket = io.connect('/');

gameCanvas.width = window.innerWidth;
gameCanvas.height = window.innerHeight;

window.addEventListener('resize', function() {
  gameCanvas.width = window.innerWidth;
  gameCanvas.height = window.innerHeight;
});

socket.on('update', function(updatedGame) {
  game = updatedGame;

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
  window.requestAnimationFrame(drawLoop);
  state = 'playing';
});

function fillInventory(inventory) {
  if (!inventory) {
    spellWrapper.innerHTML = ''; //clear existing inventory

    for (var i = 0; i < 4; i++) {
      var slotImg = createSprite('media/images/inventorySlot.png');
      slotImg.id = 'inventorySlot' + (i + 1);
      slotImg.className = 'inventorySlot';
      spellWrapper.appendChild(slotImg);
    }
  } else {
    for (var i = 0; i < inventory.length; i++) {
      var item = document.querySelector('#inventorySlot' + (i + 1));
      item.src = sprites.src[inventory[i].itemName];
    }
  }
}

window.addEventListener('wheel', function(e) {
  if (state === 'playing') {
    if (e.deltaY > 0) {
      inputs.push({
        type: 'scroll',
        direction: 'left'
      });
    } else {
      inputs.push({
        type: 'scroll',
        direction: 'right'
      });
    }
  }
});

function drawLoop() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  //temp position display
  pos.innerText = 'x: ' + Math.round(player.x) + '\ny: ' + Math.round(player.y);

  var currentTime = performance.now();
  var dt = currentTime - local.lastTime;
  local.lastTime = currentTime;

  inputs.push({
    type: 'move',
    facing: local.facing,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight
  });

  for (var i = 0; i < game.players.length; i++) {
    var currentPlayer = game.players[i];
    if (currentPlayer.id !== player.id) {
      ctx.save();
      ctx.fillStyle = 'red';
      ctx.translate(localCoords(currentPlayer.x, 'x'), localCoords(currentPlayer.y, 'y'));
      ctx.rotate(currentPlayer.angle);
      ctx.drawImage(sprites.player, -sprites.player.width / 2, -sprites.player.height / 2);
      ctx.restore();
    }
  }

  //player
  ctx.save();
  ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
  ctx.rotate(local.angle);
  ctx.drawImage(sprites.player, -sprites.player.width / 2, -sprites.player.height / 2);
  ctx.restore();

  grid.xOffset = -player.x;
  grid.yOffset = -player.y;

  socket.emit('input', inputs);
  inputs = [];
  if (state === 'playing') {
    window.requestAnimationFrame(drawLoop);
  }
}

window.addEventListener('mousemove', function(e) {
  local.angle = Math.atan2(e.pageX - window.innerWidth / 2, -(e.pageY - window.innerHeight / 2));

  local.facing = {
    x: e.pageX,
    y: e.pageY
  };

  var lenToMouse = Math.sqrt(Math.pow(e.pageX - window.innerWidth / 2, 2) + Math.pow(e.pageY - window.innerHeight / 2, 2));
  grid.vx = 1 / lenToMouse * (e.pageX - window.innerWidth / 2);
  grid.vy = 1 / lenToMouse * (e.pageY - window.innerHeight / 2);
});