var gridCanvas = document.querySelector('#gridCanvas');

gridCanvas.width = window.innerWidth;
gridCanvas.height = window.innerHeight;

window.addEventListener('resize', function() {
  gridCanvas.width = window.innerWidth;
  gridCanvas.height = window.innerHeight;
});

var grid = {
  xOffset: 0,
  yOffset: 0,
  gridSize: 40,
  vx: 0,
  vy: 0,
  ctx: gridCanvas.getContext('2d'),
  backgroundColor: '#e8e8e8',
  lineColor: '#bebebe',
  borderColor: '#d4342a'
};

function drawGrid() {
  grid.xOffset = grid.xOffset % grid.gridSize;
  grid.yOffset = grid.yOffset % grid.gridSize;

  grid.ctx.lineWidth = 1;

  grid.ctx.fillStyle = grid.backgroundColor;
  grid.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  grid.ctx.strokeStyle = grid.lineColor;
  grid.ctx.beginPath();
  grid.ctx.moveTo(0, 0);
  for (var i = 0; i < window.innerWidth + grid.gridSize; i += grid.gridSize) {
    grid.ctx.moveTo(i + grid.xOffset, 0);
    grid.ctx.lineTo(i + grid.xOffset, window.innerHeight);
  }

  for (var i = 0; i < window.innerHeight + grid.gridSize; i += grid.gridSize) {
    grid.ctx.moveTo(0, i + grid.yOffset);
    grid.ctx.lineTo(window.innerWidth, i + grid.yOffset);
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

  window.requestAnimationFrame(drawGrid);
}

window.requestAnimationFrame(drawGrid);