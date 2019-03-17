//(function() {
'use strict';

///////////////
////MODULES////
///////////////

/*

{module}.init() should be completely independent from all other modules. It should initialize everything in the module.
{module}.setup() can use other modules

sorcerio - global module, contains all submodules
	renderer - stuff for rendering the game (only the <canvas>s)
	ui - game ui HTML elements
	media - sounds, images, etc
	comm - server communication
	events - events + game state

*/

const sorcerio = {
	renderer: {},
	ui: {},
	media: {},
	comm: {},
	events: {}
};

sorcerio.init = function() {//called once, on page load
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;

	const subModules = [
		sorcerio.renderer,
		sorcerio.ui,
		sorcerio.media,
		sorcerio.comm,
		sorcerio.events
	];

	for (let i = 0; i < subModules.length; i++) {
		subModules[i].init();
	}

	for (let i = 0; i < subModules.length; i++) {
		if (subModules[i].setup !== undefined) {
			subModules[i].setup();
		}
	}
};


////////////
//RENDERER//
////////////


sorcerio.renderer.init = function() {

};


//////
//UI//
//////


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

	this.mainScreen = document.querySelector("#mainScreen");
	this.spellWrapper = document.querySelector("#spellWrapper");
};

sorcerio.ui.hideMainScreen = function() {
	this.mainScreen.style.display = "none";
};

sorcerio.ui.showMainScreen = function() {
	this.mainScreen.style.display = "";
	this.mainScreen.style.animationName = "";
	this.mainScreen.style.animationName = "death";
};


/////////
//MEDIA//
/////////


sorcerio.media.init = function() {

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

////////
//COMM//
////////


sorcerio.comm.init = function() {

};


//////////
//EVENTS//
//////////


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
	sorcerio.ui.hideMainScreen();
};


//////////////////////
////END OF MODULES////
//////////////////////

window.addEventListener("load", sorcerio.init);

//})();
