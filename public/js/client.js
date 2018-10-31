//(function() {

let gridCanvas = document.querySelector('#gridCanvas');

gridCanvas.width = devicePixelRatio * innerWidth;
gridCanvas.height = devicePixelRatio * innerHeight;

window.addEventListener('resize', function() {
	gridCanvas.width = devicePixelRatio * innerWidth;
	gridCanvas.height = devicePixelRatio * innerHeight;
	gameCanvas.width = devicePixelRatio * innerWidth;
	gameCanvas.height = devicePixelRatio * innerHeight;
	gameCanvas.style.transform = `scale(${window.innerWidth/gameCanvas.width})`;
	gridCanvas.style.transform = `scale(${window.innerWidth/gridCanvas.width})`;
	gridCanvas.width = innerWidth;
	gridCanvas.height = innerHeight;
	gameCanvas.width = innerWidth;
	gameCanvas.height = innerHeight;
});
let grid = {
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
	grid.ctx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
	grid.ctx.strokeStyle = grid.lineColor;
	grid.ctx.beginPath();
	grid.ctx.moveTo(0, 0);
	for (let i = 0; i < gridCanvas.width + grid.gridSize; i += grid.gridSize) {
		grid.ctx.moveTo(i + grid.xOffset, 0);
		grid.ctx.lineTo(i + grid.xOffset, gridCanvas.height);
	}
	for (let i = 0; i < gridCanvas.height + grid.gridSize; i += grid.gridSize) {
		grid.ctx.moveTo(0, i + grid.yOffset);
		grid.ctx.lineTo(gridCanvas.width, i + grid.yOffset);
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

window.addEventListener('resize', function() {
	gridCanvas.width = devicePixelRatio * innerWidth;
	gridCanvas.height = devicePixelRatio * innerHeight;
	gameCanvas.width = devicePixelRatio * innerWidth;
	gameCanvas.height = devicePixelRatio * innerHeight;
	gameCanvas.style.transform = `scale(${window.innerWidth/gameCanvas.width})`;
	gridCanvas.style.transform = `scale(${window.innerWidth/gridCanvas.width})`;
	gridCanvas.width = innerWidth;
	gridCanvas.height = innerHeight;
	gameCanvas.width = innerWidth;
	gameCanvas.height = innerHeight;
});

window.addEventListener("load", function() {
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;
});

let playButton = document.querySelector("#playButton");
let nicknameInput = document.querySelector("#nicknameInput");
let mainScreen = document.querySelector('#mainScreen');
let gameCanvas = document.querySelector('#gameCanvas');

function hideMainScreen() {
	mainScreen.style.display = "none";
}

function showMainScreen() {
	mainScreen.style.display = '';
	mainScreen.style.animationName = '';
	mainScreen.style.animationName = 'death';
}

let ws;

function getGameState() {
	if (ws === undefined) {
		return "notPlaying";
	}

	if (ws.readyState === 1 || ws.readyState === 0) {
		return "playing";
	} else if (ws.readyState === 2 || ws.readyState === 3) {
		return "notPlaying"
	}
}

function generatePlayerConfig() {
	let cfg = {
		nickname: nicknameInput.value
	};

	return JSON.stringify(cfg);
}

playButton.addEventListener("click", function() {

	if (getGameState() === "playing") {
		return; //don't start a new game if already playing
	}

	ws = new WebSocket(`ws${(window.location.protocol==="https:")?"s":""}://${window.location.host}/ws`);

	ws.addEventListener("open", function() {
		ws.send(generatePlayerConfig());
		hideMainScreen();
	});

	ws.addEventListener("message", function(message) {
		handleServerMessage(message.data);
	});
});

function handleServerMessage(messageData) {
	let message = JSON.parse(messageData);
	let type = message.type;

	switch (type) {
		case "update":
			console.log(message);
			break;
	}
}

//})();
