"use strict";
/*
{module}.init() should be completely independent from all other modules. It should initialize everything in the module.
{module}.setup() can use other modules

wiziz - global module, contains all submodules
	renderer - stuff for rendering the game (only the <canvas>s)
	ui - game ui HTML elements
	media - sounds, images, etc
	comm - server communication
	events - events + game status
	meta - constants that are determined in the server code
	game - game state
	input - input stuff
*/

const wiziz = {
	renderer: {renderFunctions:{}},
	ui: {},
	media: {},
	comm: {},
	events: {},
	meta: {},
	game: {},
	input: {}
};

/**
	Initializes the game.
	`reset` is true if it is not the first initialization.
*/
wiziz.init = function(reset = true) {
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;
	document.querySelector("#settingsToggle").checked = true;

	const subModules = [
		wiziz.renderer,
		wiziz.ui,
		wiziz.media,
		wiziz.comm,
		wiziz.events,
		wiziz.meta,
		wiziz.game,
		wiziz.input
	];

	for (let module of subModules) {
		if (module.init !== undefined) {
			if (reset && module === wiziz.media) {//skip the media module unless it is the first initialization
				continue;
			}
			module.init();
		}
	}

	for (let module of subModules) {
		if (module.setup !== undefined) {
			module.setup();
		}
	}
};

wiziz.reset = function() {
	//clear ui elements
	wiziz.ui.spellWrapper.innerHTML = "";
	wiziz.ui.chooseUnlockedSpells.innerHTML = "";
	wiziz.ui.leadersList.innerHTML = "";
	wiziz.ui.storage.innerHTML = "";
	wiziz.ui.chooseUnlockedSpellsWrapper.style.display = "";
	//re-init
	wiziz.init();
};


wiziz.mainLoop = function(currentTime) {
	wiziz.renderer.render();

	const inputTimeDiff = currentTime - wiziz.input.lastInputSendTime;
	if (inputTimeDiff >= wiziz.input.inputSendInterval) {
		wiziz.input.inputDT = inputTimeDiff;
		wiziz.comm.ws.send(wiziz.input.getInput());
		wiziz.input.lastInputSendTime = currentTime;

		//client-side prediction
		const predictedPlayer = JSON.parse(JSON.stringify(wiziz.game.myPlayer));
		if (predictedPlayer.lastInput > wiziz.input.predictedPlayer.lastInput) {
			wiziz.input.doPrediction(predictedPlayer);
			wiziz.input.predictedPlayer = predictedPlayer;
		} else {
			wiziz.input.doPrediction(wiziz.input.predictedPlayer);
		}
	}

	if (currentTime - wiziz.ui.lastUIRenderTime >= wiziz.ui.uiRenderInterval) {
		wiziz.ui.render();
		wiziz.ui.lastUIRenderTime = currentTime;
	}

	if (wiziz.events.isPlaying) {
		requestAnimationFrame(wiziz.mainLoop);
	}
};


/////////////
//@RENDERER//
/////////////


wiziz.renderer.init = function() {
	this.grid = {//stuff for drawing the grid in the background (gives the illusion of the player moving).
		xOffset: 0,
		yOffset: 0,
		gridSize: 40,
		lineWidth: 1,
		backgroundColor: "#E8E8F9",
		lineColor: "#bebebe",
		borderColor: "#d4342a"
	};
}.bind(wiziz.renderer);

////////////////////
//@RENDERFUNCTIONS//
////////////////////

wiziz.renderer.renderFunctions.projectileSpell = function(spell) {
	const sprite = wiziz.media.sprites.spellEffects[spell.name];
	this.ctx.drawImage(sprite, wiziz.game.localCoords(spell.location.x, 'x') - (sprite.width / 2), wiziz.game.localCoords(spell.location.y, 'y') - (sprite.height / 2));
}.bind(wiziz.renderer);

wiziz.renderer.renderFunctions.splashSpell = function(spell) {
	this.ctx.fillStyle = spell.color;
	this.ctx.globalAlpha = 0.8;
	this.ctx.beginPath();
	this.ctx.arc(wiziz.game.localCoords(spell.location.x, 'x'), wiziz.game.localCoords(spell.location.y, 'y'), spell.radius, 0, Math.PI * 2);
	this.ctx.fill();
	this.ctx.globalAlpha = 1;
}.bind(wiziz.renderer);

wiziz.renderer.setup = function() {
	this.ctx = wiziz.ui.canvas.getContext("2d");
	wiziz.events.resized();
}.bind(wiziz.renderer);

wiziz.renderer.render = function() {
	this.renderGrid();

	for (let player of wiziz.game.latestGameState.players) {
		if (player.id === wiziz.game.myPlayerId) {//skip the client's own player -- it is rendered separately
			continue;
		}

		this.renderPlayer(player);
	}

	this.renderSelf();

	for (let spell of wiziz.game.latestGameState.spells) {
		wiziz.renderer.renderFunctions[spell.renderFunction](spell);
	}

	if (wiziz.game.myPlayer.flags.blind) {
		this.ctx.fillStyle = "rgba(0, 0, 0, 0.98)";
		this.ctx.fillRect(0, 0, wiziz.ui.canvas.width, wiziz.ui.canvas.height);
	}
}.bind(wiziz.renderer);

//renders an invisible player at 0,0. the ctx needs to be translated to the proper location before calling this.
wiziz.renderer.renderInvisiblePlayer = function() {
	this.ctx.fillStyle = this.grid.backgroundColor;
	this.ctx.globalAlpha = 0.6;
	this.ctx.beginPath();
	this.ctx.arc(0, 0, 65, 0, Math.PI * 2);
	this.ctx.fill();
}.bind(wiziz.renderer);

//renders the ice overlay for a frozen player at 0,0. the ctx needs to be translated to the proper location before calling this.
wiziz.renderer.renderFrozenOverlay = function() {
	this.ctx.drawImage(wiziz.media.sprites.frozenOverlay, -wiziz.media.sprites.frozenOverlay.width / 2, -wiziz.media.sprites.frozenOverlay.height / 2);
}.bind(wiziz.renderer);

wiziz.renderer.renderPlayer = function(player) {
	this.ctx.save();
	this.ctx.translate(wiziz.game.localCoords(player.location.x, 'x'), wiziz.game.localCoords(player.location.y, 'y'));
	this.ctx.rotate(wiziz.game.calculatePlayerAngle(player));
	if (!player.flags.invisible) {
		this.ctx.drawImage(wiziz.media.sprites.playerRed, -wiziz.media.sprites.playerRed.width / 2, -wiziz.media.sprites.playerRed.height / 2);
		this.ctx.restore();
		this.ctx.save();
		this.ctx.translate(wiziz.game.localCoords(player.location.x, 'x'), wiziz.game.localCoords(player.location.y, 'y'));
		this.ctx.font = "20px newRocker";
		this.ctx.fillStyle = "#2dafaf";
		this.ctx.fillText(player.nickname, -(this.ctx.measureText(player.nickname).width / 2), 80);
		this.ctx.fillStyle = "rgba(40, 41, 41, 0.7)";
		this.ctx.fillRect(-55, 84, 110, 10);
		this.ctx.fillStyle = "#1ABF35";
		this.ctx.fillRect(-52, 86, 104 * (player.health / player.maxHealth), 6);
		if (player.speed === 0) {
			this.ctx.rotate(wiziz.game.calculatePlayerAngle(player));
			this.renderFrozenOverlay();
		}
	} else {
		this.renderInvisiblePlayer();
	}
	this.ctx.restore();
}.bind(wiziz.renderer);

wiziz.renderer.renderSelf = function() {
	this.ctx.save();
	this.ctx.translate(wiziz.ui.canvas.width / 2, wiziz.ui.canvas.height / 2);
	this.ctx.rotate(Math.atan2(wiziz.input.mouseCoords.x - wiziz.ui.canvas.width / 2, -(wiziz.input.mouseCoords.y - wiziz.ui.canvas.height / 2)));
	if (!wiziz.game.myPlayer.flags.invisible) {
		this.ctx.drawImage(wiziz.media.sprites.playerGreen, -wiziz.media.sprites.playerGreen.width / 2, -wiziz.media.sprites.playerGreen.height / 2);
		if (wiziz.game.myPlayer.speed === 0) {
			this.renderFrozenOverlay();
		}
	} else {
		this.renderInvisiblePlayer();
	}
	this.ctx.restore();
}.bind(wiziz.renderer);

//renders the grid
wiziz.renderer.renderGrid = function() {
	this.grid.xOffset = -wiziz.input.predictedPlayer.location.x % this.grid.gridSize;
	this.grid.yOffset = -wiziz.input.predictedPlayer.location.y % this.grid.gridSize;
	this.ctx.lineWidth = this.grid.lineWidth;
	this.ctx.fillStyle = this.grid.backgroundColor;
	this.ctx.fillRect(0, 0, wiziz.ui.canvas.width, wiziz.ui.canvas.height);
	this.ctx.strokeStyle = this.grid.lineColor;
	this.ctx.beginPath();
	this.ctx.moveTo(0, 0);
	for (let i = 0; i < wiziz.ui.canvas.width + this.grid.gridSize; i += this.grid.gridSize) {
		this.ctx.moveTo(i + this.grid.xOffset, 0);
		this.ctx.lineTo(i + this.grid.xOffset, wiziz.ui.canvas.height);
	}
	for (let i = 0; i < wiziz.ui.canvas.height + this.grid.gridSize; i += this.grid.gridSize) {
		this.ctx.moveTo(0, i + this.grid.yOffset);
		this.ctx.lineTo(wiziz.ui.canvas.width, i + this.grid.yOffset);
	}
	this.ctx.stroke();

	//map borders
	this.ctx.strokeStyle = this.grid.borderColor;
	this.ctx.lineWidth = 40;
	this.ctx.beginPath();
	this.ctx.moveTo(wiziz.game.localCoords(0, 'x'), wiziz.game.localCoords(0, 'y'));
	this.ctx.lineTo(wiziz.game.localCoords(wiziz.game.latestGameState.mapSize, 'x'), wiziz.game.localCoords(0, 'y'));
	this.ctx.lineTo(wiziz.game.localCoords(wiziz.game.latestGameState.mapSize, 'x'), wiziz.game.localCoords(wiziz.game.latestGameState.mapSize, 'y'));
	this.ctx.lineTo(wiziz.game.localCoords(0, 'x'), wiziz.game.localCoords(wiziz.game.latestGameState.mapSize, 'y'));
	this.ctx.lineTo(wiziz.game.localCoords(0, 'x'), wiziz.game.localCoords(0, 'y') - this.ctx.lineWidth / 2);
	this.ctx.stroke();
}.bind(wiziz.renderer);


///////
//@UI//
///////


wiziz.ui.init = function() {
	this.uiRenderInterval = 15;//how often (in milliseconds) to render the ui.
	this.lastUIRenderTime = 0;
	this.canvas = document.querySelector("#gameCanvas");
	this.canvas.width = 1600;
	this.playButton = document.querySelector("#playButton");
	this.nicknameInput = document.querySelector("#nicknameInput");
	this.nicknameInput.addEventListener("keydown", function(e) {
		if (e.key === "Enter") {
			wiziz.ui.playButton.click();
		}
	});
	this.mainScreen = document.querySelector("#mainScreen");
	this.spellWrapper = document.querySelector("#spellWrapper");
	this.leadersList = document.querySelector("#leadersList");
	this.xpSlider = document.querySelector("#xp");
	this.healthSlider = document.querySelector("#health");
	this.chooseUnlockedSpells = document.querySelector("#chooseUnlockedSpells");
	this.chooseUnlockedSpellsWrapper = document.querySelector("#chooseUnlockedSpellsWrapper");
	this.storageWrapper = document.querySelector("#storageWrapper");
	this.storage = document.querySelector("#storage");
	this.numPlayers = document.querySelector("#numPlayers");
	this.controlSettings = document.querySelector("#controlSettings");
	this.toggledElements = Array.from(document.querySelectorAll("#inventory,#outerHealth,#outerXp,#leaderboard"));//ui elements that get toggled when ui is shown/hidden
	this.isChoosingUnlocks = false;
	this.lastChosenUnlocks = "";
	this.uiVisible = true;
	this.canvasSizeRatio = 1;
}.bind(wiziz.ui);

wiziz.ui.setup = function() {
	this.createHotbarSlots();
	for (let i = 0; i < 10; i++) {//fill the storage with some empty spell slots
		this.storage.appendChild(this.createStorageSpellSlot(this.storage.children.length + 1));
	}
}.bind(wiziz.ui);

wiziz.ui.toggleUI = function() {
	for (let i of this.toggledElements) {
		if (this.uiVisible) {
			i.style.display = "none";
		} else {
			i.style.display = "";
		}
	}
	this.uiVisible = !this.uiVisible;
}.bind(wiziz.ui);

//fills the hotbar with empty slots
wiziz.ui.createHotbarSlots = function() {
	for (let i = 1; i < wiziz.meta.data.inventorySize + 1; i++) {//creates slotImage and coolDownDisplay
		let coolDownDisplay = document.createElement("div");
		coolDownDisplay.className = "coolDownDisplay";
		coolDownDisplay.id = `coolDownDisplay${i}`;
		coolDownDisplay.style.animation = "none";
		this.spellWrapper.appendChild(coolDownDisplay);

		let slotImage = wiziz.media.createImage(wiziz.media.inventoryItems.emptySlot);

		//create the selection outline thingy:
		let selectionOutline = document.createElement("span");
		selectionOutline.className = "selectionOutline";
		selectionOutline.id = `selectionOutline${i}`;

		slotImage.addEventListener("load", function() {
			selectionOutline.style.width = `${slotImage.width}px`;
			selectionOutline.style.height = `${slotImage.height}px`;
		});

		slotImage.addEventListener("click", function() {
			wiziz.input.selectedItem = i - 1;
		});

		slotImage.addEventListener("dragstart", function(e) {
			e.preventDefault();
		});
		slotImage.id = `inventorySlot${i}`;
		slotImage.className = "inventorySlot"
		selectionOutline.appendChild(slotImage);
		this.spellWrapper.appendChild(selectionOutline);
	}

	let openStorage = wiziz.media.createImage("/media/images/openStorage.png");

	openStorage.addEventListener("click", this.toggleStorage);

	let dummySelectionOutline = document.createElement("span");
	openStorage.className = "inventorySlot";
	dummySelectionOutline.className = "selectionOutline";

	openStorage.addEventListener("load", function() {
		dummySelectionOutline.style.width = `${openStorage.width}px`;
		dummySelectionOutline.style.height = `${openStorage.height}px`;
	});

	openStorage.addEventListener("dragstart", function(e) {
		e.preventDefault();
	});
	dummySelectionOutline.appendChild(openStorage);
	this.spellWrapper.appendChild(dummySelectionOutline);
}.bind(wiziz.ui);

//hides the main screen, revealing the actual game
wiziz.ui.hideMainScreen = function() {
	this.mainScreen.style.display = "none";
}.bind(wiziz.ui);

wiziz.ui.showMainScreen = function() {
	//OPERATOR: WE GET SIGNAL.
	//CAPTAIN: WHAT !
	//OPERATOR: MAIN SCREEN TURN ON.
	this.mainScreen.style.display = "";
	this.mainScreen.style.animationName = "";
	this.mainScreen.style.animationName = "death";
}.bind(wiziz.ui);

//information about the player that is sent to the server in order to create a player
wiziz.ui.generatePlayerConfig = function() {
	const cfg = {
		nickname: this.nicknameInput.value
	};

	return JSON.stringify(cfg);
}.bind(wiziz.ui);

wiziz.ui.toggleStorage = function() {
	if (this.storageWrapper.style.display === "") {
		this.storageWrapper.style.display = "block";
	} else {
		this.storageWrapper.style.display = "";
	}
}.bind(wiziz.ui);

//returns a leaderboard entry to be added to the leaderboard
wiziz.ui.createPlayerLi = function(player, place) {
	let playerLi = document.createElement("span");
	playerLi.classList.add("playerLi");
	if (player.id === wiziz.game.myPlayerId) {//the player is the client's player:
		playerLi.classList.add("self");
	}

	let placeSpan = document.createElement("span");
	placeSpan.classList.add("place");
	placeSpan.innerText = place+".";
	playerLi.appendChild(placeSpan);

	let nicknameSpan = document.createElement("span");
	nicknameSpan.classList.add("nickname");
	nicknameSpan.innerText = player.nickname;
	playerLi.appendChild(nicknameSpan);

	let scoreSpan = document.createElement("span");
	scoreSpan.classList.add("score");
	scoreSpan.innerText = player.xp;
	playerLi.appendChild(scoreSpan);

	return playerLi;
};

//calculates the current leaders and renders the leaderboard
wiziz.ui.updateLeaderboard = function(players) {
	this.leadersList.innerHTML = "";//clear the leaderboard first
	let leaders = wiziz.game.getLeaders(10);
	for (let i = 0; i < leaders.length; i++) {
		this.leadersList.appendChild(this.createPlayerLi(leaders[i], i+1));
	}
}.bind(wiziz.ui);

wiziz.ui.updatePlayerCount = function(num) {
	this.numPlayers.innerText = `${num} player${num === 1 ? "" : "s"}`;
}.bind(wiziz.ui);

//renders the ui
wiziz.ui.render = function() {
	this.updateLeaderboard(wiziz.game.getLeaders(10));
	this.updatePlayerCount(wiziz.game.latestGameState.players.length);
	this.updateSliders();
	this.updateInventory();
	this.updateStorage();
	this.displayUnlocks();
}.bind(wiziz.ui);

wiziz.ui.displayUnlocks = function() {
	if (wiziz.game.myPlayer.unlocks.length === 0 || this.isChoosingUnlocks || this.lastChosenUnlocks === wiziz.game.myPlayer.unlocks.join(",")) {
		return;
	}

	this.isChoosingUnlocks = true;
	this.chooseUnlockedSpells.innerHTML = "";
	this.lastChosenUnlocks = wiziz.game.myPlayer.unlocks.join(",");

	for (const spellType of wiziz.game.myPlayer.unlocks) {
		let image = wiziz.media.createImage(wiziz.media.inventoryItems[spellType]);
		image.dataset.spell = spellType;
		image.title = wiziz.meta.data.humanReadableEffects[spellType];
		image.className = "spellUnlock";

		this.chooseUnlockedSpells.appendChild(image);

		image.addEventListener("click", function(e) {
			wiziz.input.chooseUnlock(wiziz.game.myPlayer.unlocks.indexOf(e.target.dataset.spell));
			wiziz.ui.isChoosingUnlocks = false;
			wiziz.ui.chooseUnlockedSpellsWrapper.style.display = "";
		});
	}

	this.chooseUnlockedSpellsWrapper.style.display = "inline-block";
}.bind(wiziz.ui);

//updates the xp and health sliders
wiziz.ui.updateSliders = function() {
	this.healthSlider.style.width = `calc(${Math.min(100, wiziz.game.myPlayer.health / wiziz.game.myPlayer.maxHealth * 100)}% - 8px)`;
	this.xpSlider.style.width = `calc(${Math.min(100, (wiziz.game.myPlayer.xp - wiziz.game.myPlayer.lastLevelUpAtXp) / (wiziz.game.myPlayer.levelUpAtXp - wiziz.game.myPlayer.lastLevelUpAtXp) * 100)}% - 8px)`
}.bind(wiziz.ui);

//updates the images in the inventory, and outlines the currently selected spell
wiziz.ui.updateInventory = function() {
	for (let i = 0; i < wiziz.game.myPlayer.inventory.length; i++) {
		const item = wiziz.game.myPlayer.inventory[i];
		const slot = document.querySelector(`#inventorySlot${i+1}`);

		let newSrc = wiziz.media.inventoryItems[item.spellName];//the new `src` of the image. It will be applied to the image only if it is different than the image's current `src`.

		if (i === wiziz.game.myPlayer.selectedItem) {//the current `item` is the player's selected spell:
			document.querySelector(`#selectionOutline${i+1}`).style.backgroundColor = "#EED727";
		} else {//else, clear the selectionOutline
			document.querySelector(`#selectionOutline${i+1}`).style.backgroundColor = "";
		}

		if (slot.attributes.src.nodeValue !== newSrc) {//only set the image's src if it is different from the current src.
			slot.src = newSrc;
			slot.title = wiziz.meta.data.humanReadableEffects[item.spellName];
			document.querySelector(`#coolDownDisplay${i+1}`).style.animation = "none";
		}
	}
};

//creates a slot for the storage
wiziz.ui.createStorageSpellSlot = function(id) {
	let slotImage = wiziz.media.createImage(wiziz.media.inventoryItems.emptySlot);
	slotImage.classList.add("selectionOutline");
	slotImage.id = `storageSlot${id}`;
	slotImage.style.zIndex = 0;

	slotImage.addEventListener("click", wiziz.events.storageSlotClick);

	return slotImage;
};

//updates the images in the storage
wiziz.ui.updateStorage = function() {
	const itemsInStorage = wiziz.game.myPlayer.storage.length;//how many spells are in storage
	const availableStorageSlots = this.storage.children.length;//how many slots there currently are in the storage ui element

	if (itemsInStorage > availableStorageSlots) {//add more slots to the storage ui element if there aren't enough
		for (let i = 0; i < itemsInStorage - availableStorageSlots; i++) {
			this.storage.appendChild(this.createStorageSpellSlot(this.storage.children.length + 1));
		}
	}

	for (let i = 0; i < wiziz.game.myPlayer.storage.length; i++) {
		const name = wiziz.game.myPlayer.storage[i].spellName;
		let slot = document.querySelector(`#storageSlot${i+1}`);
		const newSrc = wiziz.media.inventoryItems[name];

		if (slot.attributes.src.nodeValue !== newSrc) {//change the src of the slot if it does not match the spell
			slot.src = newSrc;
			slot.title = wiziz.meta.data.humanReadableEffects[name];
		}
	}
}.bind(wiziz.ui);

//////////
//@MEDIA//
//////////


wiziz.media.init = function() {
	this.inventoryItems = {};//images of the inventory spells
	this.sounds = {spellSounds: {}};
	this.sprites = {spellEffects: {}};

	this.inventoryItems.emptySlot = "/media/images/inventorySlot.png";

	for (const type of wiziz.meta.data.spellTypes) {
		this.inventoryItems[type] = `/media/images/${type}Spell.png`;

		this.sprites.spellEffects[type] = this.createImage(`/media/images/${type}Effect.png`);//the image of the spell entity

		this.sounds.spellSounds[type] = this.createSound(`/media/sounds/${type}Spell`);
	}

	this.sprites.playerRed = this.createImage("/media/images/playerRed.png");
	this.sprites.playerGreen = this.createImage("/media/images/playerGreen.png");
	this.sprites.frozenOverlay = this.createImage("/media/images/frozenOverlay.png");
}.bind(wiziz.media);

//creates an image element
wiziz.media.createImage = function(url) {
	let image = document.createElement("img");
	image.src = url;
	return image;
};

//creates a sound with sources {url}.ogg and {url}.mp3
wiziz.media.createSound = function(url) {
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


wiziz.comm.init = function() {
	this.ws = null;//the websocket
}.bind(wiziz.comm);

//connects the websocket to the server
wiziz.comm.newWSConnection = function() {
	this.ws = new WebSocket(`ws${(location.protocol==="https:")?"s":""}://${(location.protocol==="https:"?"ws.":"")+location.host}/ws`);

	this.ws.addEventListener("open", function() {
		wiziz.ui.playButton.classList.remove("connecting");
		wiziz.comm.ws.send(wiziz.ui.generatePlayerConfig());//send the player config to the server
	});

	this.ws.addEventListener("message", function(message) {
		wiziz.events.handleServerMessage(JSON.parse(message.data));
	});

	//show a message if the websocket disconnects due to the server closing (i.e. because of update)
	this.ws.addEventListener("close", function(e) {
		if (e.code === 1006) {
			document.querySelector("#disconnected").style.display = "block";
		}
		wiziz.events.isPlaying = false;
	});
}.bind(wiziz.comm);


///////////
//@EVENTS//
///////////


wiziz.events.init = function() {
	this.isPlaying = false;//if the client is currently in a game
}.bind(wiziz.events);

wiziz.events.setup = function() {
	wiziz.ui.playButton.addEventListener("click", this.playButtonClick);
	addEventListener("keydown", this.keyDown);
	addEventListener("blur", this.onWindowBlur);
	addEventListener("keyup", this.keyUp);
	addEventListener("resize", this.resized);
	addEventListener("wheel", this.onScroll);
	wiziz.ui.canvas.addEventListener("mousemove", this.mouseMove);
	wiziz.ui.canvas.addEventListener("click", this.gameClick);
}.bind(wiziz.events);

wiziz.events.gameClick = function() {
	const selectedSpell = wiziz.game.myPlayer.inventory[wiziz.game.myPlayer.selectedItem];

	if (!selectedSpell.cooling) {//only do stuff if the selected spell isn't in cooldown
		wiziz.input.castSpell();
		const coolDownDisplay = document.querySelector(`#coolDownDisplay${wiziz.game.myPlayer.selectedItem + 1}`);
		coolDownDisplay.style.animation = "";
		coolDownDisplay.style.animationDuration = selectedSpell.coolDownTime + "ms";
		setTimeout(function() {
			coolDownDisplay.style.animation = "none";
		}, selectedSpell.coolDownTime);

		const sound = wiziz.media.sounds.spellSounds[selectedSpell.spellName];
		if (!sound.ended) {//if the sound is currently playing, stop it and put the playhead back to start
			sound.pause();
			sound.currentTime = 0;
		}
		wiziz.media.sounds.spellSounds[selectedSpell.spellName].play();//play the sound of the currently selected spell
	}
};

wiziz.events.playButtonClick = function() {
	if (this.isPlaying) {
		return;
	}

	wiziz.ui.playButton.classList.add("connecting");
	wiziz.ui.playButton.dataset.initialVal = wiziz.ui.playButton.innerText;
	wiziz.ui.playButton.innerText = "...";
	wiziz.events.startNewGame();

	this.isPlaying = true;
}.bind(wiziz.events);

wiziz.events.storageSlotClick = function(e) {
	wiziz.input.swapStorage(parseInt(e.target.id.split("storageSlot")[1]) - 1);
};

wiziz.events.startNewGame = function() {
	wiziz.comm.newWSConnection();
};

wiziz.events.newGameStarted = function() {
	wiziz.ui.hideMainScreen();
	wiziz.ui.playButton.innerText = wiziz.ui.playButton.dataset.initialVal;
	requestAnimationFrame(wiziz.mainLoop);
};

wiziz.events.resized = function() {
	const ratio = wiziz.ui.canvas.width / innerWidth;
	wiziz.ui.canvasSizeRatio = ratio;
	wiziz.ui.canvas.height = Math.min(ratio * innerHeight, wiziz.ui.canvas.width);
	wiziz.ui.canvas.style.transform = `scale(${1 / ratio})`;
};

wiziz.events.handleServerMessage = function(message) {
	const messageType = message.type;

	switch (messageType) {
		case "yourId":
			wiziz.game.myPlayerId = message.id;

			//wait for next "update" message before calling newGameStarted():
			window.intervalId = setInterval(function() {
				if (wiziz.game.latestGameState !== null) {
					wiziz.events.newGameStarted();
					clearInterval(window.intervalId);
					window.intervalId = undefined;
				}
			}, 1);

			break;
		case "update":
			wiziz.game.latestGameState = message;
			let myPlayer = message.players.find(function(element) {return element.id === wiziz.game.myPlayerId;});
			if (myPlayer !== undefined) {
				wiziz.game.myPlayer = myPlayer;
				if (wiziz.input.predictedPlayer === null) {
					wiziz.input.predictedPlayer = JSON.parse(JSON.stringify(myPlayer));
				}
			}
			break;
		case "death":
			wiziz.comm.ws.close();
			wiziz.reset();
			wiziz.ui.showMainScreen();
			break;
	}
};

wiziz.events.mouseMove = function(domEvent) {
	wiziz.input.mouseCoords.x = domEvent.pageX * wiziz.ui.canvasSizeRatio;
	wiziz.input.mouseCoords.y = domEvent.pageY * wiziz.ui.canvasSizeRatio;
};

wiziz.events.keyDown = function(e) {
	if (!this.isPlaying) {
		return;
	}

	switch (e.key.toLowerCase()) {
		case wiziz.input.controls.up:
			wiziz.input.keyStates.u = true;
			break;
		case wiziz.input.controls.down:
			wiziz.input.keyStates.d = true;
			break;
		case wiziz.input.controls.left:
			wiziz.input.keyStates.l = true;
			break;
		case wiziz.input.controls.right:
			wiziz.input.keyStates.r = true;
			break;
		case wiziz.input.controls.toggleInventory:
			wiziz.ui.toggleStorage();
			break;
		case wiziz.input.controls.hideUI:
			wiziz.ui.toggleUI();
			break;
	}

	const keyNum = parseInt(e.key);//the integer of the key pressed, if it is a number key. otherwise, NaN
	if (keyNum !== NaN && keyNum > 0 && keyNum-1 < wiziz.meta.data.inventorySize) {
		wiziz.input.selectedItem = keyNum-1;
	}
}.bind(wiziz.events);

wiziz.events.onScroll = function(e) {
	if (!this.isPlaying) {
		return;
	}

	let newIndex = wiziz.input.selectedItem;

	if (e.deltaY > 0) {//scroll direction
		newIndex--;
	} else {
		newIndex++;
	}

	//jump to the other end if either side of the inventory was scrolled past:
	if (newIndex < 0) {
		newIndex = wiziz.game.myPlayer.inventory.length - 1;
	}
	if (newIndex > wiziz.game.myPlayer.inventory.length-1) {
		newIndex = 0;
	}

	wiziz.input.selectedItem = newIndex;
}.bind(wiziz.events);

wiziz.events.keyUp = function(e) {
	switch (e.key.toLowerCase()) {
		case wiziz.input.controls.up:
			wiziz.input.keyStates.u = false;
			break;
		case wiziz.input.controls.down:
			wiziz.input.keyStates.d = false;
			break;
		case wiziz.input.controls.left:
			wiziz.input.keyStates.l = false;
			break;
		case wiziz.input.controls.right:
			wiziz.input.keyStates.r = false;
			break;
	}
};

wiziz.events.onWindowBlur = function() {//reset all keystates so that the player's movement does not miss the keyup event and get stuck
	wiziz.input.keyStates.r = false;
	wiziz.input.keyStates.l = false;
	wiziz.input.keyStates.d = false;
	wiziz.input.keyStates.u = false;
};


/////////
//@GAME//
/////////


wiziz.game.init = function() {
	this.latestGameState = null;
	this.myPlayerId = null;
	this.myPlayer = null;
}.bind(wiziz.game);

//converts coordinates that are relative to the game into coordinates that are relative to the client's screen
wiziz.game.localCoords = function(globalCoord, xOrY) {
	if (wiziz.input.predictedPlayer === null) {
		return 0;
	}

	if (xOrY === "x") {
		return Math.round(globalCoord + wiziz.ui.canvas.width / 2 - wiziz.input.predictedPlayer.location.x);
	} else if (xOrY === "y") {
		return Math.round(globalCoord + wiziz.ui.canvas.height / 2 - wiziz.input.predictedPlayer.location.y);
	}
}.bind(wiziz.game);

//converts coordinates that are relative to the client's screen into coordinates that are relative to the game
wiziz.game.globalCoords = function(localCoord, xOrY) {
	if (wiziz.input.predictedPlayer === null) {
		return 0;
	}

	if (xOrY === "x") {
		return Math.round(localCoord - wiziz.ui.canvas.width / 2 + wiziz.input.predictedPlayer.location.x);
	} else if (xOrY === "y") {
		return Math.round(localCoord - wiziz.ui.canvas.height / 2 + wiziz.input.predictedPlayer.location.y);
	}
}.bind(wiziz.game);

//calculates the angle that the player needs to rotate in order to face the cursor
wiziz.game.calculatePlayerAngle = function(player) {
	return Math.atan2(player.facing.x - player.location.x, -(player.facing.y - player.location.y));
};

//calculates the top `number` leaders
wiziz.game.getLeaders = function(number) {
	let sortedPlayers = JSON.parse(JSON.stringify(this.latestGameState.players));//duplicate the players array
	sortedPlayers.sort(function(a, b) {
		if (a.xp > b.xp) {
			return -1;
		}
		return 1;
	});

	if (sortedPlayers.length <= number) {
		return sortedPlayers;
	}

	return sortedPlayers.splice(0, number);
}.bind(wiziz.game);


//////////
//@INPUT//
//////////


wiziz.input.init = function() {
	this.mouseCoords = {x: 0, y: 0};//coordinates (localCoords, not globalCoords) of the current cursor location
	this.inputSendInterval = 10;
	this.lastInputSendTime = 0;
	this.controls = {
		up: "w",
		down: "s",
		left: "a",
		right: "d",
		toggleInventory: "e",
		hideUI: "h"
	};
	this.readControlsFromCookies();
	this.keyStates = {//current state of movement keys
		u: false,
		d: false,
		l: false,
		r: false
	};
	this.isCasting = false;
	this.selectedItem = 0;

	this.chosenUnlockIndex = -1;
	this.hasChosenUnlock = false;

	this.storageSwapIndex = -1;
	this.currentInputId = 0;
	this.storedInputs = [];//list of inputs that have been sent to the server, used for clientside prediction.
	this.predictedPlayer = null;//the most recent predicted version of the client's player
	this.inputDT = 0;
}.bind(wiziz.input);

wiziz.input.setup = function() {
	this.updateControlSettings();
}.bind(wiziz.input);

wiziz.input.updateControlSettings = function() {
	wiziz.ui.controlSettings.innerHTML = "";
	for (const i in this.controls) {
		let item = document.createElement("div");
		item.className = "controlOption";
		item.innerText = i + ": ";

		let kbd = document.createElement("kbd");
		kbd.className = "controlButton";
		kbd.innerText = this.controls[i];
		item.appendChild(kbd);

		kbd.addEventListener("click", function() {
			item.innerText = "Press a key...";
			addEventListener("keydown", function(e) {
				if (e.key !== "Escape") {
					kbd.innerText = e.key.toLowerCase();
					wiziz.input.controls[i] = e.key.toLowerCase();
					document.cookie = `control-${i}=${e.key.toLowerCase()};max-age=${60*60*24}`;
				}
				item.innerText = i + ": ";
				item.appendChild(kbd);
			}, {once: true});
		});

		wiziz.ui.controlSettings.appendChild(item);
	}
}.bind(wiziz.input);

wiziz.input.readControlsFromCookies = function() {
	document.cookie.split(";")
		.map(i => i.replace(/^\s+/, ""))
		.filter(i => i.indexOf("control-") === 0)
		.map(i => i.replace("control-", "").split("="))
		.forEach(i => wiziz.input.controls[i[0]] = i[1]);
};

wiziz.input.chooseUnlock = function(chosenUnlock) {
	this.hasChosenUnlock = true;
	this.chosenUnlockIndex = chosenUnlock;
}.bind(wiziz.input);

//storageIndex is 0-based index
wiziz.input.swapStorage = function(storageIndex) {
	this.storageSwapIndex = storageIndex;
}.bind(wiziz.input);

wiziz.input.castSpell = function() {
	this.isCasting = true;
}.bind(wiziz.input);

//gets a JSON string of the current input states to send to the server
wiziz.input.getInput = function() {
	const casting = this.isCasting;
	this.isCasting = false;

	const hasChosen = this.hasChosenUnlock;
	this.hasChosenUnlock = false;
	const chosenIndex = hasChosen ? this.chosenUnlockIndex : null;
	this.chosenUnlockIndex = -1;

	const storageIndex = this.storageSwapIndex;
	this.storageSwapIndex = -1;

	const input = {
		facing: {x: wiziz.game.globalCoords(this.mouseCoords.x, "x"), y: wiziz.game.globalCoords(this.mouseCoords.y, "y")},
		//make a copy of keystates so that when this.keyStates changes, it doesn't change the keystates of the input
		keys: Object.assign({}, this.keyStates),
		casting: casting,
		selectedItem: this.selectedItem,
		hasChosenUnlock: hasChosen,
		chosenUnlockIndex: chosenIndex,
		storageSwapIndex: storageIndex,
		id: this.currentInputId++,
		dt: Math.round(this.inputDT)
	};

	if (input.chosenUnlockIndex === null) {//don't send an unneeded property to the server
		delete input.chosenUnlockIndex;
	}

	this.storedInputs.push(input);
	return JSON.stringify(input);
}.bind(wiziz.input);

//applies non-processed inputs to `player`
wiziz.input.doPrediction = function(player) {
	for (let i = 0; i < this.storedInputs.length; i++) {
		if (this.storedInputs[i].id === player.lastInput) {
			this.storedInputs.splice(0, i + 1);
			break;
		}
	}

	if (player.lastProcessedInput === undefined) {
		player.lastProcessedInput = player.lastInput;
	}

	for (const input of this.storedInputs) {
		if (input.id <= player.lastProcessedInput) {
			continue;
		}
		let target = {x: player.location.x, y: player.location.y};
		if (input.keys.r) target.x += 1;
		if (input.keys.l) target.x -= 1;
		if (input.keys.d) target.y += 1;
		if (input.keys.u) target.y -= 1;

		this.moveTowards(player.location, target, Math.min(input.dt, wiziz.meta.data.maxInputDT) * player.speed);

		if (player.location.x < 0) player.location.x = 0;
		if (player.location.y < 0) player.location.y = 0;
		const mapSize = wiziz.game.latestGameState.mapSize;
		if (player.location.x > mapSize) player.location.x = mapSize;
		if (player.location.y > mapSize) player.location.y = mapSize;
		player.lastProcessedInput = input.id;
	}
}.bind(wiziz.input);

///Moves `point` `step` units towards `target`. NOTE: this can move the point past the target
wiziz.input.moveTowards = function(point, target, step) {
	const lenToTarget = this.distance(point, target);

	if (lenToTarget === 0.0 || step === 0.0) {
		return;
	}

	const dx = target.x - point.x;
	const dy = target.y - point.y;

	const stepLenRatio = step / lenToTarget;

	point.x += dx * stepLenRatio;
	point.y += dy * stepLenRatio;
}.bind(wiziz.input);

wiziz.input.distance = function(a, b) {
	return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}.bind(wiziz.input);

//////////////////////
////END OF MODULES////
//////////////////////

//entrypoint:
addEventListener("load", function() {
	fetch("/meta.json").then(function(resp) {return resp.json();}).then(function(metadata) {
		wiziz.meta.data = metadata;
		document.querySelector("#invLen").innerText = wiziz.meta.data.inventorySize;
		document.querySelector("#nicknameInput").attributes["maxlength"].nodeValue = wiziz.meta.data.maxNameLength.toString();//update the maxlength of the nickname input
		wiziz.init(false);
	});
});
