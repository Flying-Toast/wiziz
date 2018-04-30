var inventoryDiv = document.querySelector('#inventory');
var gameCanvas = document.querySelector('#gameCanvas');
var mainScreen = document.querySelector('#mainScreen');
var playButton = document.querySelector('#playButton');
var nicknameInput = document.querySelector('#nicknameInput');

var ctx = gameCanvas.getContext('2d');

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
});

function fillInventory(inventory) {

  inventoryDiv.innerHTML = ''; //clear existing inventory
  var inventoryDivWidth = window.getComputedStyle(inventoryDiv).width.replace('px', '') - 20;

  for (var i = 0; i < inventoryDivWidth; i += 105) {

    var slotImg = document.createElement('img');
    slotImg.src = 'media/images/inventorySlot.png';
    slotImg.className = 'inventorySlot';
    inventoryDiv.appendChild(slotImg);

  }

}