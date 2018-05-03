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
  gridSize: 75,
  ctx: gridCanvas.getContext('2d'),
  backgroundColor: '#e8e8e8',
  lineColor: '#7a7f7e'
};

function drawGrid() {
  grid.xOffset = grid.xOffset % grid.gridSize;
  grid.yOffset = grid.yOffset % grid.gridSize;
  
  grid.ctx.lineWidth = 2;

  grid.ctx.fillStyle = grid.backgroundColor;
  grid.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  grid.ctx.strokeStyle = grid.lineColor;
  grid.ctx.beginPath();
  grid.ctx.moveTo(0, 0);
  for (var i = 0; i < window.innerWidth + grid.gridSize; i += grid.gridSize) {

    grid.ctx.moveTo(i + grid.xOffset % grid.gridSize, 0);


    grid.ctx.lineTo(i + grid.xOffset % grid.gridSize, window.innerHeight);
  }

  for (var i = 0; i < window.innerHeight + grid.gridSize; i += grid.gridSize) {


    grid.ctx.moveTo(0, i + grid.yOffset % grid.gridSize);

    grid.ctx.lineTo(window.innerWidth, i + grid.yOffset % grid.gridSize);
  }
  grid.ctx.stroke();

  window.requestAnimationFrame(drawGrid);
}

window.requestAnimationFrame(drawGrid);
