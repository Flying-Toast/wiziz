//(function() {

window.addEventListener("load", function() {
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;
});


let media = {sounds:{},effects:{},inventoryItems:{},playerSprites:{}};
let spellTypes = [];
fetch("/spells.json").then(function(resp){return resp.json();}).then(function(spells) {
	spellTypes = spells;

	for (let i = 0; i < spellTypes.length; i++) {
		let type = spellTypes[i];

		media.sounds[type] = createSound(`/media/sounds/${type}Spell`);

		media.effects[type] = createImage(`/media/images/${type}Effect.png`);

		media.inventoryItems[type] = {};
		media.inventoryItems[type].unselected = `/media/images/${type}Spell.png`;
		media.inventoryItems[type].selected = `/media/images/${type}SpellSelected.png`;
		media.inventoryItems.emptySlot = {
			unselected: "/media/images/inventorySlot.png",
			selected: "/media/images/inventorySlotSelected.png"
		};
		media.openStorage = "/media/images/openStorage.png";
	}

	setupHotbar();
});
media.playerSprites = {
	red: createImage('/media/images/playerRed.png'),
	green: createImage('/media/images/playerGreen.png')
};

//should only be called once, on page load
function setupHotbar() {
	for (let i = 1; i < 5/*one more than the max hotbar length*/; i++) {//create slotImage and coolDownDisplay
		let coolDownDisplay = document.createElement("div");
		coolDownDisplay.className = "coolDownDisplay";
		coolDownDisplay.id = `coolDownDisplay${i}`;
		coolDownDisplay.style.animation = "none";
		spellWrapper.appendChild(coolDownDisplay);

		let slotImage = createImage(media.inventoryItems.emptySlot.unselected);
		slotImage.addEventListener("dragstart", function(e) {
			e.preventDefault();
		});
		slotImage.id = `inventorySlot${i}`;
		slotImage.className = "inventorySlot"
		spellWrapper.appendChild(slotImage);

	}

	let openStorage = createImage("/media/images/openStorage.png");
	openStorage.className = "inventorySlot";
	openStorage.addEventListener("dragstart", function(e) {
		e.preventDefault();
	});
	spellWrapper.appendChild(openStorage);
}

function createImage(url) {
	let image = document.createElement("img");
	image.src = url;
	return image;
}

function createSound(url) {//creates a sound with sources {url}.ogg and {url}.mp3
	let sound = document.createElement("audio");
	let mp3 = document.createElement("source");
	let ogg = document.createElement("source");
	mp3.type = "audio/mp3";
	ogg.type = "audio/ogg";
	mp3.src = `${url}.mp3`;
	ogg.src = `${url}.ogg`;
	sound.appendChild(mp3);
	sound.appendChild(ogg);
	return sound;
}

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
	ctx: gridCanvas.getContext('2d'),
	backgroundColor: '#E8E8F9',
	lineColor: '#bebebe',
	borderColor: '#d4342a'
};

let mapSize = 3000;
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

	//map borders
	grid.ctx.strokeStyle = grid.borderColor;
	grid.ctx.lineWidth = 40;
	grid.ctx.beginPath();
	grid.ctx.moveTo(localCoords(0, 'x'), localCoords(0, 'y'));
	grid.ctx.lineTo(localCoords(mapSize, 'x'), localCoords(0, 'y'));
	grid.ctx.lineTo(localCoords(mapSize, 'x'), localCoords(mapSize, 'y'));
	grid.ctx.lineTo(localCoords(0, 'x'), localCoords(mapSize, 'y'));
	grid.ctx.lineTo(localCoords(0, 'x'), localCoords(0, 'y') - grid.ctx.lineWidth / 2);
	grid.ctx.stroke();
}

function localCoords(globalCoord, xOrY) {
	if (selfPlayer === undefined) {
		return 0;
	}

	if (xOrY === "x") {
		return (globalCoord + gameCanvas.width / 2 - selfPlayer.location.x);
	} else if (xOrY === "y") {
		return (globalCoord + gameCanvas.height / 2 - selfPlayer.location.y);
	}
}

function globalCoords(localCoord, xOrY) {
	if (selfPlayer === undefined) {
		return 0;
	}

	if (xOrY === "x") {
		return (localCoord - gameCanvas.width / 2 + selfPlayer.location.x);
	} else if (xOrY === "y") {
		return (localCoord - gameCanvas.height / 2 + selfPlayer.location.y);
	}
}

let playButton = document.querySelector("#playButton");
let nicknameInput = document.querySelector("#nicknameInput");
let mainScreen = document.querySelector("#mainScreen");
let gameCanvas = document.querySelector("#gameCanvas");
let spellWrapper = document.querySelector("#spellWrapper");

gameCanvas.width = devicePixelRatio * window.innerWidth;
gameCanvas.height = devicePixelRatio * window.innerHeight;

let ctx = gameCanvas.getContext("2d");

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
		mainLoop();
	});

	ws.addEventListener("message", function(message) {
		handleServerMessage(message.data);
	});
});

let clientPlayerId;
let latestGameState;
function handleServerMessage(messageData) {
	let message = JSON.parse(messageData);
	let type = message.type;

	switch (type) {
		case "update":
			latestGameState = message;
			break;
		case "yourId":
			clientPlayerId = message.id;
			break;
	}
}

let mouseCoords = {x:0,y:0};
window.addEventListener('mousemove', function(e) {
	mouseCoords = {
		x: e.pageX,
		y: e.pageY
	};
});

function calculatePlayerAngle(player) {
	return Math.atan2(player.facing.x - player.location.x, -(player.facing.y - player.location.y));
}

function drawSelf() {
	ctx.save();
	ctx.translate(gameCanvas.width / 2, gameCanvas.height / 2);
	ctx.rotate(Math.atan2(mouseCoords.x - gameCanvas.width / 2, -(mouseCoords.y - gameCanvas.height / 2)));
	ctx.drawImage(media.playerSprites.green, -media.playerSprites.green.width / 2, -media.playerSprites.green.height / 2);
	ctx.restore();
}

function drawPlayer(player) {
	ctx.save();
	ctx.translate(localCoords(player.location.x, 'x'), localCoords(player.location.y, 'y'));
	ctx.rotate(calculatePlayerAngle(player));
	ctx.drawImage(media.playerSprites.red, -media.playerSprites.red.width / 2, -media.playerSprites.red.height / 2);
	ctx.restore();
	ctx.save();
	ctx.translate(localCoords(player.location.x, 'x'), localCoords(player.location.y, 'y'));
	ctx.font = "20px newRocker";
	ctx.fillStyle = '#2dafaf';
	ctx.fillText(player.nickname, -(ctx.measureText(player.nickname).width / 2), 80);
	ctx.font = "18px agane";
	ctx.fillStyle = '#2dafaf';
	ctx.fillText('lvl ' + player.level, -(ctx.measureText('lvl ' + player.level).width / 2), 100);
	ctx.restore();
}

let selfPlayer;
function updateGrid() {
	if (selfPlayer === undefined) {
		return;
	}

	grid.xOffset = -selfPlayer.location.x;
	grid.yOffset = -selfPlayer.location.y;
}

function mainLoop() {
	ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

	drawGrid();

	if (latestGameState !== undefined) {
		for (let i = 0; i < latestGameState.players.length; i++) {
			let currentPlayer = latestGameState.players[i];
			if (currentPlayer.id === clientPlayerId) {
				selfPlayer = currentPlayer;
				continue;
			}

			drawPlayer(currentPlayer);
		}
	}

	updateGrid();
	drawSelf();
	if (getGameState() === "playing") {
		window.requestAnimationFrame(mainLoop);
	}
}

function lerp(p, n, t) {
	var t = Number(t);
	t = parseFloat((Math.max(0, Math.min(1, t))).toFixed(3));
	return parseFloat((p + t * (n - p)).toFixed(3));
}

function vLerp(v, tv, t) {
	return {
		x: this.lerp(v.x, tv.x, t),
		y: this.lerp(v.y, tv.y, t)
	};
}

//})();
