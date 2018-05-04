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
  playerSpeed: 1 / 6
};

//temporary coords display
var wiz = document.createElement('img');
wiz.src = 'media/images/wiz.png';
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

function interpolate(from, to, step) {
  var steps = [];
  for (var i = from; i <= Math.abs(to); i += step) {
    steps.push(i);
  }
  if (steps[steps.length - 1] !== to) {
    steps.push(to);
  }
  return (steps);
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

});

playButton.addEventListener('click', function() {
  var playerOptions = {
    nickname: nicknameInput.value
  };
  socket.emit('newGame', playerOptions);
  fillInventorySlots();

  mainScreen.style.display = 'none';
  local.lastTime = performance.now(); //temp
  window.requestAnimationFrame(drawLoop);
  state = 'playing';
});

function fillInventorySlots() {

  spellWrapper.innerHTML = ''; //clear existing inventory

  for (var i = 0; i < 4; i++) {
    var slotImg = document.createElement('img');
    slotImg.src = 'media/images/inventorySlot.png';
    slotImg.id = 'inventorySlot' + (i + 1);
    slotImg.className = 'inventorySlot';
    spellWrapper.appendChild(slotImg);
  }

}

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
    if (currentPlayer !== player) {
      ctx.save();
      ctx.fillStyle = 'red';
      ctx.translate(localCoords(currentPlayer.x, 'x'), localCoords(currentPlayer.y, 'y'));
      ctx.rotate(currentPlayer.angle);
      ctx.drawImage(wiz, -wiz.width / 2, -wiz.height / 2);
      //ctx.fillRect(-50, -50, 100, 100);
      ctx.restore();
    }
  }

  //player
  ctx.save();
  //ctx.fillStyle = 'black';
  ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
  ctx.rotate(local.angle);
  ctx.drawImage(wiz, -wiz.width / 2, -wiz.height / 2);
  //ctx.fillRect(-50, -50, 100, 100);
  //ctx.fillStyle = 'green';
  //ctx.fillRect(-20, -90, 40, 40);
  ctx.restore();
  //end player

  //grid.xOffset -= grid.vx * local.playerSpeed * dt;
  //grid.yOffset -= grid.vy * local.playerSpeed * dt;

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