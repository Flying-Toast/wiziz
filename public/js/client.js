//(function() {
'use strict';

////////////////
////@MODULES////
////////////////

/*

{module}.init() should be completely independent from all other modules. It should initialize everything in the module.
{module}.setup() can use other modules

sorcerio - global module, contains all submodules
	renderer - stuff for rendering the game (only the <canvas>s)
	ui - game ui HTML elements
	media - sounds, images, etc
	comm - server communication
	events - events + game status
	meta - constants that are determined in the server code
	game - game state

*/

const sorcerio = {
	renderer: {},
	ui: {},
	media: {},
	comm: {},
	events: {},
	meta: {},
	game: {}
};

sorcerio.init = function() {//called once, on page load
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;

	const subModules = [
		sorcerio.renderer,
		sorcerio.ui,
		sorcerio.media,
		sorcerio.comm,
		sorcerio.events,
		sorcerio.meta,
		sorcerio.game
	];

	for (let i = 0; i < subModules.length; i++) {
		if (subModules[i].init !== undefined) {
			subModules[i].init();
		}
	}

	for (let i = 0; i < subModules.length; i++) {
		if (subModules[i].setup !== undefined) {
			subModules[i].setup();
		}
	}
};


/////////////
//@RENDERER//
/////////////


sorcerio.renderer.init = function() {

};

sorcerio.renderer.create = function() {
	this.gridCtx = sorcerio.ui.gridCanvas.getContext("2d");
	this.gameCtx = sorcerio.ui.gameCanvas.getContext("2d");
};


///////
//@UI//
///////


sorcerio.ui.init = function() {
	this.gameCanvas = document.querySelector("#gameCanvas");
	this.gridCanvas = document.querySelector("#gridCanvas");

	gameCanvas.width = devicePixelRatio * innerWidth;
	gameCanvas.height = devicePixelRatio * innerHeight;
	gridCanvas.width = devicePixelRatio * innerWidth;
	gridCanvas.height = devicePixelRatio * innerHeight;

	window.addEventListener("resize", function() {
		gridCanvas.width = devicePixelRatio * innerWidth;
		gridCanvas.height = devicePixelRatio * innerHeight;
		gameCanvas.width = devicePixelRatio * innerWidth;
		gameCanvas.height = devicePixelRatio * innerHeight;
		gameCanvas.style.transform = `scale(${innerWidth/gameCanvas.width})`;
		gridCanvas.style.transform = `scale(${innerWidth/gridCanvas.width})`;
		gridCanvas.width = innerWidth;
		gridCanvas.height = innerHeight;
		gameCanvas.width = innerWidth;
		gameCanvas.height = innerHeight;
	});

	this.playButton = document.querySelector("#playButton");
	this.nicknameInput = document.querySelector("#nicknameInput");
	this.nicknameInput.addEventListener('keydown', function(e) {
		if (e.key === 'Enter') {
			sorcerio.ui.playButton.click();
		}
	});

	this.mainScreen = document.querySelector("#mainScreen");
	this.spellWrapper = document.querySelector("#spellWrapper");
};

sorcerio.ui.setup = function() {
	this.createHotbarSlots();
};

sorcerio.ui.createHotbarSlots = function() {
	for (let i = 1; i < sorcerio.meta.data.inventorySize + 1; i++) {//creates slotImage and coolDownDisplay
		let coolDownDisplay = document.createElement("div");
		coolDownDisplay.className = "coolDownDisplay";
		coolDownDisplay.id = `coolDownDisplay${i}`;
		coolDownDisplay.style.animation = "none";
		this.spellWrapper.appendChild(coolDownDisplay);

		let slotImage = sorcerio.media.createImage(sorcerio.media.inventoryItems.emptySlot.unselected);
		slotImage.addEventListener("dragstart", function(e) {
			e.preventDefault();
		});
		slotImage.id = `inventorySlot${i}`;
		slotImage.className = "inventorySlot"
		spellWrapper.appendChild(slotImage);
	}

	let openStorage = sorcerio.media.createImage("/media/images/openStorage.png");
	openStorage.className = "inventorySlot";
	openStorage.addEventListener("dragstart", function(e) {
		e.preventDefault();
	});
	this.spellWrapper.appendChild(openStorage);
};

sorcerio.ui.hideMainScreen = function() {
	this.mainScreen.style.display = "none";
};

sorcerio.ui.showMainScreen = function() {
	this.mainScreen.style.display = "";
	this.mainScreen.style.animationName = "";
	this.mainScreen.style.animationName = "death";
};

sorcerio.ui.generatePlayerConfig = function() {
	let cfg = {
		nickname: this.nicknameInput.value
	};

	return JSON.stringify(cfg);
};


//////////
//@MEDIA//
//////////


sorcerio.media.init = function() {
	this.inventoryItems = {};
	this.sounds = {spellSounds: {}};
	this.sprites = {};

	this.inventoryItems.emptySlot = {
		unselected: "/media/images/inventorySlot.png",
		selected: "/media/images/inventorySlotSelected.png"
	};

	for (let i = 0; i < sorcerio.meta.data.spellTypes.length; i++) {
		const type = sorcerio.meta.data.spellTypes[i];

		this.inventoryItems[type] = {
			selected: `/media/images/${type}SpellSelected.png`,
			unselected: `/media/images/${type}Spell.png`
		};

		this.sounds.spellSounds[type] = this.createSound(`/media/sounds/${type}Spell`);
	}

	this.sprites.playerRed = this.createImage('/media/images/playerRed.png');
	this.sprites.playerGreen = this.createImage('/media/images/playerGreen.png');
};

sorcerio.media.createImage = function(url) {
	let image = document.createElement("img");
	image.src = url;
	return image;
};

sorcerio.media.createSound = function(url) {//creates a sound with sources {url}.ogg and {url}.mp3
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
};

/////////
//@COMM//
/////////


sorcerio.comm.init = function() {
	this.ws = null;
};

sorcerio.comm.newWSConnection = function() {
	this.ws = new WebSocket(`ws${(window.location.protocol==="https:")?"s":""}://${window.location.host}/ws`);

	this.ws.addEventListener("open", function() {
		sorcerio.comm.ws.send(sorcerio.ui.generatePlayerConfig());
	});

	this.ws.addEventListener("message", function(message) {
		sorcerio.events.handleServerMessage(JSON.parse(message.data));
	});
};


///////////
//@EVENTS//
///////////


sorcerio.events.init = function() {
	this.isPlaying = false;//if the client is currently in a game
};

sorcerio.events.setup = function() {
	sorcerio.ui.playButton.addEventListener("click", this.playButtonClick);
};

sorcerio.events.playButtonClick = function() {
	if (this.isPlaying === true) {
		return;
	}

	sorcerio.events.startNewGame();

	this.isPlaying = true;
};

sorcerio.events.startNewGame = function() {
	sorcerio.comm.newWSConnection();
	sorcerio.ui.hideMainScreen();
};

sorcerio.events.handleServerMessage = function(message) {
	const messageType = message.type;

	switch (messageType) {
		case "yourId":
			sorcerio.game.myPlayerId = message.id;
			break;
		case "update":
			sorcerio.game.latestAuthoritativeGameState = message;
			break;
	}
};


/////////
//@GAME//
/////////


sorcerio.game.init = function() {
	this.latestAuthoritativeGameState = null;
	this.myPlayerId = null;
};


//////////////////////
////END OF MODULES////
//////////////////////

window.addEventListener("load", function() {
	fetch("/meta.json").then(function(resp){return resp.json();}).then(function(metadata) {
		sorcerio.meta.data = metadata;
		sorcerio.init();
	});
});

//})();
