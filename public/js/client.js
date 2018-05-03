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
var lastTime; //temp
player.x = 100; //temp
player.y = 100; //temp

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


playButton.addEventListener('click', function() {
  var playerOptions = {
    nickname: nicknameInput.value
  };
  socket.emit('newGame', playerOptions);
  fillInventorySlots();

  mainScreen.style.display = 'none';
  lastTime = performance.now(); //temp
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
  var currentTime = performance.now(); //temp
  var dt = lastTime - currentTime; //temp
  lastTime = currentTime; //temp

  //player
  ctx.save();
  ctx.fillStyle = 'black';
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
  ctx.rotate(player.angle);
  ctx.fillRect(-50, -50, 100, 100);
  ctx.fillStyle = 'green';
  ctx.fillRect(-20, -90, 40, 40);
  ctx.restore();
  //end player

  player.x -= player.vx / 6 * dt; //temp
  player.y -= player.vy / 6 * dt; //temp
  grid.xOffset += player.vx / 6 * dt; //temp
  grid.yOffset += player.vy / 6 * dt; //temp

  if (state === 'playing') {
    window.requestAnimationFrame(drawLoop);
  }


}

window.addEventListener('mousemove', function(e) {
  player.angle = Math.atan2(e.pageX - window.innerWidth / 2, -(e.pageY - window.innerHeight / 2));
  var lengthToMouse = Math.sqrt(Math.pow(e.pageX - window.innerWidth / 2, 2) + Math.pow(e.pageY - window.innerHeight / 2, 2)); //temp
  player.vx = 1 / lengthToMouse * (e.pageX - window.innerWidth / 2); //temp
  player.vy = 1 / lengthToMouse * (e.pageY - window.innerHeight / 2); //temp
});