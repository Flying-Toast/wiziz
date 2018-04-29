var socket = io.connect('/');

var gameCanvas = document.querySelector('#gameCanvas');
gameCanvas.width = window.innerWidth;
gameCanvas.height = window.innerHeight;
var ctx = gameCanvas.getContext('2d');

window.addEventListener('resize', function() {
  gameCanvas.width = window.innerWidth;
  gameCanvas.height = window.innerHeight;
});