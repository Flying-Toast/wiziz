//(function() {

window.addEventListener("load", function() {
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;
});


let media = {sounds:{},effects:{},inventoryItems:{}};
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

function fillHotbar(inventory) {
	for (let i = 0; i < inventory.length; i++) {
		console.log("not implemented yet");
	}
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

let playButton = document.querySelector("#playButton");
let nicknameInput = document.querySelector("#nicknameInput");
let mainScreen = document.querySelector("#mainScreen");
let gameCanvas = document.querySelector("#gameCanvas");
let spellWrapper = document.querySelector("#spellWrapper");

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

let clientPlayerId;
function handleServerMessage(messageData) {
	let message = JSON.parse(messageData);
	let type = message.type;

	switch (type) {
		case "update":
			console.log(message);
			break;
		case "yourId":
			clientPlayerId = message.id;
			break;
	}
}

//})();
