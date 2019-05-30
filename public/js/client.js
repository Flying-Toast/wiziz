'use strict';
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
	input - input stuff
*/

const sorcerio = {
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
sorcerio.init = function(reset = true) {
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;

	const subModules = [
		sorcerio.renderer,
		sorcerio.ui,
		sorcerio.media,
		sorcerio.comm,
		sorcerio.events,
		sorcerio.meta,
		sorcerio.game,
		sorcerio.input
	];

	for (let module of subModules) {
		if (module.init !== undefined) {
			if (reset && module === sorcerio.media) {//skip the media module unless it is the first initialization
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

sorcerio.reset = function() {
	//clear ui elements
	sorcerio.ui.spellWrapper.innerHTML = "";
	sorcerio.ui.chooseUnlockedSpells.innerHTML = "";
	sorcerio.ui.leadersList.innerHTML = "";
	sorcerio.ui.storage.innerHTML = "";
	sorcerio.ui.chooseUnlockedSpellsWrapper.style.display = "";
	//re-init
	sorcerio.init();
};


sorcerio.mainLoop = function() {
	const currentTime = performance.now();

	sorcerio.renderer.render();

	if (currentTime - sorcerio.input.lastInputSendTime >= sorcerio.input.inputSendInterval) {
		sorcerio.comm.ws.send(sorcerio.input.getInput());
		sorcerio.input.lastInputSendTime = currentTime;

		//client-side prediction
		const predictedPlayer = JSON.parse(JSON.stringify(sorcerio.game.myPlayer));
		if (predictedPlayer.lastInput > sorcerio.input.predictedPlayer.lastInput) {
			sorcerio.input.doPrediction(predictedPlayer);
			sorcerio.input.predictedPlayer = predictedPlayer;
		} else {
			sorcerio.input.doPrediction(sorcerio.input.predictedPlayer);
		}
	}

	if (currentTime - sorcerio.ui.lastUIRenderTime >= sorcerio.ui.uiRenderInterval) {
		sorcerio.ui.render();
		sorcerio.ui.lastUIRenderTime = currentTime;
	}

	if (sorcerio.events.isPlaying) {
		requestAnimationFrame(sorcerio.mainLoop);
	}
};


/////////////
//@RENDERER//
/////////////


sorcerio.renderer.init = function() {
	this.grid = {//stuff for drawing the grid in the background (gives the illusion of the player moving).
		xOffset: 0,
		yOffset: 0,
		gridSize: 40,
		lineWidth: 1,
		backgroundColor: '#E8E8F9',
		lineColor: '#bebebe',
		borderColor: '#d4342a'
	};
}.bind(sorcerio.renderer);

////////////////////
//@RENDERFUNCTIONS//
////////////////////

sorcerio.renderer.renderFunctions.projectileSpell = function(spell) {
	const sprite = sorcerio.media.sprites.spellEffects[spell.name];
	this.gameCtx.drawImage(sprite, sorcerio.game.localCoords(spell.location.x, 'x') - (sprite.width / 2), sorcerio.game.localCoords(spell.location.y, 'y') - (sprite.height / 2));
}.bind(sorcerio.renderer);

sorcerio.renderer.renderFunctions.splashSpell = function(spell) {
	this.gameCtx.fillStyle = spell.color;
	this.gameCtx.globalAlpha = 0.8;
	this.gameCtx.beginPath();
	this.gameCtx.arc(sorcerio.game.localCoords(spell.location.x, 'x'), sorcerio.game.localCoords(spell.location.y, 'y'), spell.radius, 0, Math.PI * 2);
	this.gameCtx.fill();
	this.gameCtx.globalAlpha = 1;
}.bind(sorcerio.renderer);

sorcerio.renderer.setup = function() {
	this.gridCtx = sorcerio.ui.gridCanvas.getContext("2d");
	this.gameCtx = sorcerio.ui.gameCanvas.getContext("2d");
}.bind(sorcerio.renderer);

sorcerio.renderer.render = function() {
	this.renderGrid();

	this.gameCtx.clearRect(0, 0, sorcerio.ui.gameCanvas.width, sorcerio.ui.gameCanvas.height);

	for (let player of sorcerio.game.latestGameState.players) {
		if (player.id === sorcerio.game.myPlayerId) {//skip the client's own player -- it is rendered separately
			continue;
		}

		this.renderPlayer(player);
	}

	this.renderSelf();

	for (let spell of sorcerio.game.latestGameState.spells) {
		sorcerio.renderer.renderFunctions[spell.renderFunction](spell);
	}

	if (sorcerio.game.myPlayer.flags.blind) {
		this.gameCtx.fillStyle = "rgba(0, 0, 0, 0.98)";
		this.gameCtx.fillRect(0, 0, sorcerio.ui.gameCanvas.width, sorcerio.ui.gameCanvas.height);
	}
}.bind(sorcerio.renderer);

//renders an invisible player at 0,0. the ctx needs to be translated to the proper location before calling this.
sorcerio.renderer.renderInvisiblePlayer = function() {
	this.gameCtx.fillStyle = this.grid.backgroundColor;
	this.gameCtx.globalAlpha = 0.6;
	this.gameCtx.beginPath();
	this.gameCtx.arc(0, 0, 65, 0, Math.PI * 2);
	this.gameCtx.fill();
}.bind(sorcerio.renderer);

//renders the ice overlay for a frozen player at 0,0. the ctx needs to be translated to the proper location before calling this.
sorcerio.renderer.renderFrozenOverlay = function() {
	this.gameCtx.drawImage(sorcerio.media.sprites.frozenOverlay, -sorcerio.media.sprites.frozenOverlay.width / 2, -sorcerio.media.sprites.frozenOverlay.height / 2);
}.bind(sorcerio.renderer);

sorcerio.renderer.renderPlayer = function(player) {
	this.gameCtx.save();
	this.gameCtx.translate(sorcerio.game.localCoords(player.location.x, 'x'), sorcerio.game.localCoords(player.location.y, 'y'));
	this.gameCtx.rotate(sorcerio.game.calculatePlayerAngle(player));
	if (!player.flags.invisible) {
		this.gameCtx.drawImage(sorcerio.media.sprites.playerRed, -sorcerio.media.sprites.playerRed.width / 2, -sorcerio.media.sprites.playerRed.height / 2);
		this.gameCtx.restore();
		this.gameCtx.save();
		this.gameCtx.translate(sorcerio.game.localCoords(player.location.x, 'x'), sorcerio.game.localCoords(player.location.y, 'y'));
		this.gameCtx.font = "20px newRocker";
		this.gameCtx.fillStyle = '#2dafaf';
		this.gameCtx.fillText(player.nickname, -(this.gameCtx.measureText(player.nickname).width / 2), 80);
		this.gameCtx.fillStyle = "rgba(40, 41, 41, 0.7)";
		this.gameCtx.fillRect(-55, 84, 110, 10);
		this.gameCtx.fillStyle = "#1ABF35";
		this.gameCtx.fillRect(-52, 86, 104 * (player.health / player.maxHealth), 6);
		if (player.speed === 0) {
			this.gameCtx.rotate(sorcerio.game.calculatePlayerAngle(player));
			this.renderFrozenOverlay();
		}
	} else {
		this.renderInvisiblePlayer();
	}
	this.gameCtx.restore();
}.bind(sorcerio.renderer);

sorcerio.renderer.renderSelf = function() {
	this.gameCtx.save();
	this.gameCtx.translate(sorcerio.ui.gameCanvas.width / 2, sorcerio.ui.gameCanvas.height / 2);
	this.gameCtx.rotate(Math.atan2(sorcerio.input.mouseCoords.x - sorcerio.ui.gameCanvas.width / 2, -(sorcerio.input.mouseCoords.y - sorcerio.ui.gameCanvas.height / 2)));
	if (!sorcerio.game.myPlayer.flags.invisible) {
		this.gameCtx.drawImage(sorcerio.media.sprites.playerGreen, -sorcerio.media.sprites.playerGreen.width / 2, -sorcerio.media.sprites.playerGreen.height / 2);
		if (sorcerio.game.myPlayer.speed === 0) {
			this.renderFrozenOverlay();
		}
	} else {
		this.renderInvisiblePlayer();
	}
	this.gameCtx.restore();
}.bind(sorcerio.renderer);

//renders the grid
sorcerio.renderer.renderGrid = function() {
	this.grid.xOffset = -sorcerio.input.predictedPlayer.location.x % this.grid.gridSize;
	this.grid.yOffset = -sorcerio.input.predictedPlayer.location.y % this.grid.gridSize;
	this.gridCtx.lineWidth = this.grid.lineWidth;
	this.gridCtx.fillStyle = this.grid.backgroundColor;
	this.gridCtx.fillRect(0, 0, sorcerio.ui.gridCanvas.width, sorcerio.ui.gridCanvas.height);
	this.gridCtx.strokeStyle = this.grid.lineColor;
	this.gridCtx.beginPath();
	this.gridCtx.moveTo(0, 0);
	for (let i = 0; i < sorcerio.ui.gridCanvas.width + this.grid.gridSize; i += this.grid.gridSize) {
		this.gridCtx.moveTo(i + this.grid.xOffset, 0);
		this.gridCtx.lineTo(i + this.grid.xOffset, sorcerio.ui.gridCanvas.height);
	}
	for (let i = 0; i < sorcerio.ui.gridCanvas.height + this.grid.gridSize; i += this.grid.gridSize) {
		this.gridCtx.moveTo(0, i + this.grid.yOffset);
		this.gridCtx.lineTo(sorcerio.ui.gridCanvas.width, i + this.grid.yOffset);
	}
	this.gridCtx.stroke();

	//map borders
	this.gridCtx.strokeStyle = this.grid.borderColor;
	this.gridCtx.lineWidth = 40;
	this.gridCtx.beginPath();
	this.gridCtx.moveTo(sorcerio.game.localCoords(0, 'x'), sorcerio.game.localCoords(0, 'y'));
	this.gridCtx.lineTo(sorcerio.game.localCoords(sorcerio.game.latestGameState.mapSize, 'x'), sorcerio.game.localCoords(0, 'y'));
	this.gridCtx.lineTo(sorcerio.game.localCoords(sorcerio.game.latestGameState.mapSize, 'x'), sorcerio.game.localCoords(sorcerio.game.latestGameState.mapSize, 'y'));
	this.gridCtx.lineTo(sorcerio.game.localCoords(0, 'x'), sorcerio.game.localCoords(sorcerio.game.latestGameState.mapSize, 'y'));
	this.gridCtx.lineTo(sorcerio.game.localCoords(0, 'x'), sorcerio.game.localCoords(0, 'y') - this.gridCtx.lineWidth / 2);
	this.gridCtx.stroke();
}.bind(sorcerio.renderer);


///////
//@UI//
///////


sorcerio.ui.init = function() {
	this.uiRenderInterval = 15;//how often (in milliseconds) to render the ui.
	this.lastUIRenderTime = 0;
	this.gameCanvas = document.querySelector("#gameCanvas");
	this.gridCanvas = document.querySelector("#gridCanvas");

	gameCanvas.width = innerWidth;
	gameCanvas.height = innerHeight;
	gridCanvas.width = innerWidth;
	gridCanvas.height = innerHeight;

	addEventListener("resize", function() {
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
	this.leadersList = document.querySelector("#leadersList");
	this.xpSlider = document.querySelector("#xp");
	this.healthSlider = document.querySelector("#health");
	this.chooseUnlockedSpells = document.querySelector("#chooseUnlockedSpells");
	this.chooseUnlockedSpellsWrapper = document.querySelector("#chooseUnlockedSpellsWrapper");
	this.storageWrapper = document.querySelector("#storageWrapper");
	this.storage = document.querySelector("#storage");
	this.toggledElements = Array.from(document.querySelectorAll("#inventory,#outerHealth,#outerXp,#leaderboard"));//ui elements that get toggled when ui is shown/hidden
	this.isChoosingUnlocks = false;
	this.lastChosenUnlocks = "";
	this.uiVisible = true;
}.bind(sorcerio.ui);

sorcerio.ui.setup = function() {
	this.createHotbarSlots();
	for (let i = 0; i < 10; i++) {//fill the storage with some empty spell slots
		this.storage.appendChild(this.createStorageSpellSlot(this.storage.children.length + 1));
	}
}.bind(sorcerio.ui);

sorcerio.ui.toggleUI = function() {
	for (let i of this.toggledElements) {
		if (this.uiVisible) {
			i.style.display = "none";
		} else {
			i.style.display = "";
		}
	}
	this.uiVisible = !this.uiVisible;
}.bind(sorcerio.ui);

//fills the hotbar with empty slots
sorcerio.ui.createHotbarSlots = function() {
	for (let i = 1; i < sorcerio.meta.data.inventorySize + 1; i++) {//creates slotImage and coolDownDisplay
		let coolDownDisplay = document.createElement("div");
		coolDownDisplay.className = "coolDownDisplay";
		coolDownDisplay.id = `coolDownDisplay${i}`;
		coolDownDisplay.style.animation = "none";
		this.spellWrapper.appendChild(coolDownDisplay);

		let slotImage = sorcerio.media.createImage(sorcerio.media.inventoryItems.emptySlot);

		//create the selection outline thingy:
		let selectionOutline = document.createElement("span");
		selectionOutline.className = "selectionOutline";
		selectionOutline.id = `selectionOutline${i}`;

		slotImage.addEventListener("load", function() {
			selectionOutline.style.width = `${slotImage.width}px`;
			selectionOutline.style.height = `${slotImage.height}px`;
		});

		slotImage.addEventListener("dragstart", function(e) {
			e.preventDefault();
		});
		slotImage.id = `inventorySlot${i}`;
		slotImage.className = "inventorySlot"
		selectionOutline.appendChild(slotImage);
		this.spellWrapper.appendChild(selectionOutline);
	}

	let openStorage = sorcerio.media.createImage("/media/images/openStorage.png");

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
}.bind(sorcerio.ui);

//hides the main screen, revealing the actual game
sorcerio.ui.hideMainScreen = function() {
	this.mainScreen.style.display = "none";
}.bind(sorcerio.ui);

sorcerio.ui.showMainScreen = function() {
	//OPERATOR: WE GET SIGNAL.
	//CAPTAIN: WHAT !
	//OPERATOR: MAIN SCREEN TURN ON.
	this.mainScreen.style.display = "";
	this.mainScreen.style.animationName = "";
	this.mainScreen.style.animationName = "death";
}.bind(sorcerio.ui);

//information about the player that is sent to the server in order to create a player
sorcerio.ui.generatePlayerConfig = function() {
	const cfg = {
		nickname: this.nicknameInput.value
	};

	return JSON.stringify(cfg);
}.bind(sorcerio.ui);

sorcerio.ui.toggleStorage = function() {
	if (this.storageWrapper.style.display === "") {
		this.storageWrapper.style.display = "block";
	} else {
		this.storageWrapper.style.display = "";
	}
}.bind(sorcerio.ui);

//returns a leaderboard entry to be added to the leaderboard
sorcerio.ui.createPlayerLi = function(player, place) {
	let playerLi = document.createElement("span");
	playerLi.classList.add("playerLi");
	if (player.id === sorcerio.game.myPlayerId) {//the player is the client's player:
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
sorcerio.ui.updateLeaderboard = function(players) {
	this.leadersList.innerHTML = "";//clear the leaderboard first
	let leaders = sorcerio.game.getLeaders(10);
	for (let i = 0; i < leaders.length; i++) {
		this.leadersList.appendChild(this.createPlayerLi(leaders[i], i+1));
	}
}.bind(sorcerio.ui);

//renders the ui
sorcerio.ui.render = function() {
	this.updateLeaderboard(sorcerio.game.getLeaders(10));
	this.updateSliders();
	this.updateInventory();
	this.updateStorage();
	this.displayUnlocks();
}.bind(sorcerio.ui);

sorcerio.ui.displayUnlocks = function() {
	if (sorcerio.game.myPlayer.unlocks.length === 0 || this.isChoosingUnlocks || this.lastChosenUnlocks === sorcerio.game.myPlayer.unlocks.join(",")) {
		return;
	}

	this.isChoosingUnlocks = true;
	this.chooseUnlockedSpells.innerHTML = "";
	this.lastChosenUnlocks = sorcerio.game.myPlayer.unlocks.join(",");

	for (const spellType of sorcerio.game.myPlayer.unlocks) {
		let image = sorcerio.media.createImage(sorcerio.media.inventoryItems[spellType]);
		image.dataset.spell = spellType;
		image.title = sorcerio.meta.data.humanReadableEffects[spellType];
		image.className = "spellUnlock";

		this.chooseUnlockedSpells.appendChild(image);

		image.addEventListener('click', function(e) {
			sorcerio.input.chooseUnlock(sorcerio.game.myPlayer.unlocks.indexOf(e.target.dataset.spell));
			sorcerio.ui.isChoosingUnlocks = false;
			sorcerio.ui.chooseUnlockedSpellsWrapper.style.display = "";
		});
	}

	this.chooseUnlockedSpellsWrapper.style.display = "inline-block";
}.bind(sorcerio.ui);

//updates the xp and health sliders
sorcerio.ui.updateSliders = function() {
	this.healthSlider.style.width = `calc(${Math.min(100, sorcerio.game.myPlayer.health / sorcerio.game.myPlayer.maxHealth * 100)}% - 8px)`;
	this.xpSlider.style.width = `calc(${Math.min(100, (sorcerio.game.myPlayer.xp - sorcerio.game.myPlayer.lastLevelUpAtXp) / (sorcerio.game.myPlayer.levelUpAtXp - sorcerio.game.myPlayer.lastLevelUpAtXp) * 100)}% - 8px)`
}.bind(sorcerio.ui);

//updates the images in the inventory, and outlines the currently selected spell
sorcerio.ui.updateInventory = function() {
	for (let i = 0; i < sorcerio.game.myPlayer.inventory.length; i++) {
		const item = sorcerio.game.myPlayer.inventory[i];
		const slot = document.querySelector(`#inventorySlot${i+1}`);

		let newSrc = sorcerio.media.inventoryItems[item.spellName];//the new `src` of the image. It will be applied to the image only if it is different than the image's current `src`.

		if (i === sorcerio.game.myPlayer.selectedItem) {//the current `item` is the player's selected spell:
			document.querySelector(`#selectionOutline${i+1}`).style.backgroundColor = "#EED727";
		} else {//else, clear the selectionOutline
			document.querySelector(`#selectionOutline${i+1}`).style.backgroundColor = "";
		}

		if (slot.attributes.src.nodeValue !== newSrc) {//only set the image's src if it is different from the current src.
			slot.src = newSrc;
			slot.title = sorcerio.meta.data.humanReadableEffects[item.spellName];
			document.querySelector(`#coolDownDisplay${i+1}`).style.animation = "none";
		}
	}
};

//creates a slot for the storage
sorcerio.ui.createStorageSpellSlot = function(id) {
	let slotImage = sorcerio.media.createImage(sorcerio.media.inventoryItems.emptySlot);
	slotImage.classList.add("selectionOutline");
	slotImage.id = `storageSlot${id}`;
	slotImage.style.zIndex = 0;

	slotImage.addEventListener("click", sorcerio.events.storageSlotClick);

	return slotImage;
};

//updates the images in the storage
sorcerio.ui.updateStorage = function() {
	const itemsInStorage = sorcerio.game.myPlayer.storage.length;//how many spells are in storage
	const availableStorageSlots = this.storage.children.length;//how many slots there currently are in the storage ui element

	if (itemsInStorage > availableStorageSlots) {//add more slots to the storage ui element if there aren't enough
		for (let i = 0; i < itemsInStorage - availableStorageSlots; i++) {
			this.storage.appendChild(this.createStorageSpellSlot(this.storage.children.length + 1));
		}
	}

	for (let i = 0; i < sorcerio.game.myPlayer.storage.length; i++) {
		const name = sorcerio.game.myPlayer.storage[i].spellName;
		let slot = document.querySelector(`#storageSlot${i+1}`);
		const newSrc = sorcerio.media.inventoryItems[name];

		if (slot.attributes.src.nodeValue !== newSrc) {//change the src of the slot if it does not match the spell
			slot.src = newSrc;
			slot.title = sorcerio.meta.data.humanReadableEffects[name];
		}
	}
}.bind(sorcerio.ui);

//////////
//@MEDIA//
//////////


sorcerio.media.init = function() {
	this.inventoryItems = {};//images of the inventory spells
	this.sounds = {spellSounds: {}};
	this.sprites = {spellEffects: {}};

	this.inventoryItems.emptySlot = "/media/images/inventorySlot.png";

	for (const type of sorcerio.meta.data.spellTypes) {
		this.inventoryItems[type] = `/media/images/${type}Spell.png`;

		this.sprites.spellEffects[type] = this.createImage(`/media/images/${type}Effect.png`);//the image of the spell entity

		this.sounds.spellSounds[type] = this.createSound(`/media/sounds/${type}Spell`);
	}

	this.sprites.playerRed = this.createImage('/media/images/playerRed.png');
	this.sprites.playerGreen = this.createImage('/media/images/playerGreen.png');
	this.sprites.frozenOverlay = this.createImage('/media/images/frozenOverlay.png');
}.bind(sorcerio.media);

//creates an image element
sorcerio.media.createImage = function(url) {
	let image = document.createElement("img");
	image.src = url;
	return image;
};

//creates a sound with sources {url}.ogg and {url}.mp3
sorcerio.media.createSound = function(url) {
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
	this.ws = null;//the websocket
}.bind(sorcerio.comm);

//connects the websocket to the server
sorcerio.comm.newWSConnection = function() {
	this.ws = new WebSocket(`ws${(location.protocol==="https:")?"s":""}://${location.host}/ws`);

	this.ws.addEventListener("open", function() {
		sorcerio.comm.ws.send(sorcerio.ui.generatePlayerConfig());//send the player config to the server
	});

	this.ws.addEventListener("message", function(message) {
		sorcerio.events.handleServerMessage(JSON.parse(message.data));
	});

	//show a message if the websocket disconnects due to the server closing (i.e. because of update)
	this.ws.addEventListener("close", function(e) {
		if (e.code === 1006) {
			document.querySelector("#disconnected").style.display = "block";
		}
		sorcerio.events.isPlaying = false;
	});
}.bind(sorcerio.comm);


///////////
//@EVENTS//
///////////


sorcerio.events.init = function() {
	this.isPlaying = false;//if the client is currently in a game
}.bind(sorcerio.events);

sorcerio.events.setup = function() {
	sorcerio.ui.playButton.addEventListener("click", this.playButtonClick);
	addEventListener("keydown", this.keyDown);
	addEventListener("blur", this.onWindowBlur);
	addEventListener("keyup", this.keyUp);
	sorcerio.ui.gameCanvas.addEventListener("mousemove", this.mouseMove);
	sorcerio.ui.gameCanvas.addEventListener("wheel", this.onScroll);
	sorcerio.ui.gameCanvas.addEventListener("click", this.gameClick);
}.bind(sorcerio.events);

sorcerio.events.gameClick = function() {
	const selectedSpell = sorcerio.game.myPlayer.inventory[sorcerio.game.myPlayer.selectedItem];

	if (!selectedSpell.cooling) {//only do stuff if the selected spell isn't in cooldown
		sorcerio.input.castSpell();
		const coolDownDisplay = document.querySelector(`#coolDownDisplay${sorcerio.game.myPlayer.selectedItem + 1}`);
		coolDownDisplay.style.animation = "";
		coolDownDisplay.style.animationDuration = selectedSpell.coolDownTime + "ms";
		setTimeout(function() {
			coolDownDisplay.style.animation = "none";
		}, selectedSpell.coolDownTime);

		const sound = sorcerio.media.sounds.spellSounds[selectedSpell.spellName];
		if (!sound.ended) {//if the sound is currently playing, stop it and put the playhead back to start
			sound.pause();
			sound.currentTime = 0;
		}
		sorcerio.media.sounds.spellSounds[selectedSpell.spellName].play();//play the sound of the currently selected spell
	}
};

sorcerio.events.playButtonClick = function() {
	if (this.isPlaying) {
		return;
	}

	sorcerio.events.startNewGame();

	this.isPlaying = true;
}.bind(sorcerio.events);

sorcerio.events.storageSlotClick = function(e) {
	sorcerio.input.swapStorage(parseInt(e.target.id.split("storageSlot")[1]) - 1);
};

sorcerio.events.startNewGame = function() {
	sorcerio.comm.newWSConnection();
};

sorcerio.events.newGameStarted = function() {
	sorcerio.ui.hideMainScreen();
	requestAnimationFrame(sorcerio.mainLoop);
};

sorcerio.events.handleServerMessage = function(message) {
	const messageType = message.type;

	switch (messageType) {
		case "yourId":
			sorcerio.game.myPlayerId = message.id;

			//wait for next "update" message before calling newGameStarted():
			window.intervalId = setInterval(function() {
				if (sorcerio.game.latestGameState !== null) {
					sorcerio.events.newGameStarted();
					clearInterval(window.intervalId);
					window.intervalId = undefined;
				}
			}, 1);

			break;
		case "update":
			sorcerio.game.latestGameState = message;
			let myPlayer = message.players.find(function(element) {return element.id === sorcerio.game.myPlayerId;});
			if (myPlayer !== undefined) {
				sorcerio.game.myPlayer = myPlayer;
				if (sorcerio.input.predictedPlayer === null) {
					sorcerio.input.predictedPlayer = JSON.parse(JSON.stringify(myPlayer));
				}
			}
			break;
		case "death":
			sorcerio.comm.ws.close();
			sorcerio.reset();
			sorcerio.ui.showMainScreen();
			break;
	}
};

sorcerio.events.mouseMove = function(domEvent) {
	sorcerio.input.mouseCoords.x = domEvent.pageX;
	sorcerio.input.mouseCoords.y = domEvent.pageY;
};

sorcerio.events.keyDown = function(e) {
	if (!this.isPlaying) {
		return;
	}

	switch (e.key.toLowerCase()) {
		case sorcerio.input.controls.up:
			sorcerio.input.keyStates.u = true;
			break;
		case sorcerio.input.controls.down:
			sorcerio.input.keyStates.d = true;
			break;
		case sorcerio.input.controls.left:
			sorcerio.input.keyStates.l = true;
			break;
		case sorcerio.input.controls.right:
			sorcerio.input.keyStates.r = true;
			break;
		case sorcerio.input.controls.storage:
			sorcerio.ui.toggleStorage();
			break;
		case sorcerio.input.controls.ui:
			sorcerio.ui.toggleUI();
			break;
	}

	const keyNum = parseInt(e.key);//the integer of the key pressed, if it is a number key. otherwise, NaN
	if (keyNum !== NaN && keyNum > 0 && keyNum-1 < sorcerio.meta.data.inventorySize) {
		sorcerio.input.selectedItem = keyNum-1;
	}
}.bind(sorcerio.events);

sorcerio.events.onScroll = function(e) {
	if (!this.isPlaying) {
		return;
	}

	let newIndex = sorcerio.input.selectedItem;

	if (e.deltaY > 0) {//scroll direction
		newIndex--;
	} else {
		newIndex++;
	}

	//jump to the other end if either side of the inventory was scrolled past:
	if (newIndex < 0) {
		newIndex = sorcerio.game.myPlayer.inventory.length - 1;
	}
	if (newIndex > sorcerio.game.myPlayer.inventory.length-1) {
		newIndex = 0;
	}

	sorcerio.input.selectedItem = newIndex;
}.bind(sorcerio.events);

sorcerio.events.keyUp = function(e) {
	switch (e.key.toLowerCase()) {
		case sorcerio.input.controls.up:
			sorcerio.input.keyStates.u = false;
			break;
		case sorcerio.input.controls.down:
			sorcerio.input.keyStates.d = false;
			break;
		case sorcerio.input.controls.left:
			sorcerio.input.keyStates.l = false;
			break;
		case sorcerio.input.controls.right:
			sorcerio.input.keyStates.r = false;
			break;
	}
};

sorcerio.events.onWindowBlur = function() {//reset all keystates so that the player's movement does not miss the keyup event and get stuck
	sorcerio.input.keyStates.r = false;
	sorcerio.input.keyStates.l = false;
	sorcerio.input.keyStates.d = false;
	sorcerio.input.keyStates.u = false;
};


/////////
//@GAME//
/////////


sorcerio.game.init = function() {
	this.latestGameState = null;
	this.myPlayerId = null;
	this.myPlayer = null;
}.bind(sorcerio.game);

//converts coordinates that are relative to the game into coordinates that are relative to the client's screen
sorcerio.game.localCoords = function(globalCoord, xOrY) {
	if (sorcerio.input.predictedPlayer === null) {
		return 0;
	}

	if (xOrY === "x") {
		return Math.round(globalCoord + sorcerio.ui.gameCanvas.width / 2 - sorcerio.input.predictedPlayer.location.x);
	} else if (xOrY === "y") {
		return Math.round(globalCoord + sorcerio.ui.gameCanvas.height / 2 - sorcerio.input.predictedPlayer.location.y);
	}
}.bind(sorcerio.game);

//converts coordinates that are relative to the client's screen into coordinates that are relative to the game
sorcerio.game.globalCoords = function(localCoord, xOrY) {
	if (sorcerio.input.predictedPlayer === null) {
		return 0;
	}

	if (xOrY === "x") {
		return Math.round(localCoord - sorcerio.ui.gameCanvas.width / 2 + sorcerio.input.predictedPlayer.location.x);
	} else if (xOrY === "y") {
		return Math.round(localCoord - sorcerio.ui.gameCanvas.height / 2 + sorcerio.input.predictedPlayer.location.y);
	}
}.bind(sorcerio.game);

//calculates the angle that the player needs to rotate in order to face the cursor
sorcerio.game.calculatePlayerAngle = function(player) {
	return Math.atan2(player.facing.x - player.location.x, -(player.facing.y - player.location.y));
};

//calculates the top `number` leaders
sorcerio.game.getLeaders = function(number) {
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
}.bind(sorcerio.game);


//////////
//@INPUT//
//////////


sorcerio.input.init = function() {
	this.mouseCoords = {x: 0, y: 0};//coordinates (localCoords, not globalCoords) of the current cursor location
	this.inputSendInterval = 10;
	this.lastInputSendTime = 0;
	this.controls = {
		up: "w",
		down: "s",
		left: "a",
		right: "d",
		storage: "e",
		ui: "h"
	};
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
}.bind(sorcerio.input);

sorcerio.input.chooseUnlock = function(chosenUnlock) {
	this.hasChosenUnlock = true;
	this.chosenUnlockIndex = chosenUnlock;
}.bind(sorcerio.input);

//storageIndex is 0-based index
sorcerio.input.swapStorage = function(storageIndex) {
	this.storageSwapIndex = storageIndex;
}.bind(sorcerio.input);

sorcerio.input.castSpell = function() {
	this.isCasting = true;
}.bind(sorcerio.input);

//gets a JSON string of the current input states to send to the server
sorcerio.input.getInput = function() {
	const casting = this.isCasting;
	this.isCasting = false;

	const hasChosen = this.hasChosenUnlock;
	this.hasChosenUnlock = false;
	const chosenIndex = hasChosen ? this.chosenUnlockIndex : null;
	this.chosenUnlockIndex = -1;

	const storageIndex = this.storageSwapIndex;
	this.storageSwapIndex = -1;

	const input = {
		facing: {x: sorcerio.game.globalCoords(this.mouseCoords.x, "x"), y: sorcerio.game.globalCoords(this.mouseCoords.y, "y")},
		//make a copy of keystates so that when this.keyStates changes, it doesn't change the keystates of the input
		keys: Object.assign({}, this.keyStates),
		casting: casting,
		selectedItem: this.selectedItem,
		hasChosenUnlock: hasChosen,
		chosenUnlockIndex: chosenIndex,
		storageSwapIndex: storageIndex,
		id: this.currentInputId++,
		dt: Math.round(performance.now() - this.lastInputSendTime)
	};

	if (input.chosenUnlockIndex === null) {//don't send an unneeded property to the server
		delete input.chosenUnlockIndex;
	}

	this.storedInputs.push(input);
	return JSON.stringify(input);
}.bind(sorcerio.input);

//applies non-processed inputs to `player`
sorcerio.input.doPrediction = function(player) {
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

		this.moveTowards(player.location, target, Math.min(input.dt, sorcerio.meta.data.maxInputDT) * player.speed);

		if (player.location.x < 0) player.location.x = 0;
		if (player.location.y < 0) player.location.y = 0;
		const mapSize = sorcerio.game.latestGameState.mapSize;
		if (player.location.x > mapSize) player.location.x = mapSize;
		if (player.location.y > mapSize) player.location.y = mapSize;
		player.lastProcessedInput = input.id;
	}
}.bind(sorcerio.input);

///Moves `point` `step` units towards `target`. NOTE: this can move the point past the target
sorcerio.input.moveTowards = function(point, target, step) {
		const lenToTarget = this.distance(point, target);

		if (lenToTarget === 0.0 || step === 0.0) {
			return;
		}

		const dx = target.x - point.x;
		const dy = target.y - point.y;

		const stepLenRatio = step / lenToTarget;

		point.x += dx * stepLenRatio;
		point.y += dy * stepLenRatio;
}.bind(sorcerio.input);

sorcerio.input.distance = function(a, b) {
	return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}.bind(sorcerio.input);

//////////////////////
////END OF MODULES////
//////////////////////

//entrypoint:
addEventListener("load", function() {
	console.log("%cpsst!", "font-size:20px;font-style:italic;", "\nDid you know that sorcerio is open source?\nCome check it out - contributions are welcome.\nhttps://github.com/Flying-Toast/sorcerio");
	fetch("/meta.json").then(function(resp){return resp.json();}).then(function(metadata) {
		sorcerio.meta.data = metadata;
		document.querySelector("#invLen").innerText = sorcerio.meta.data.inventorySize;
		document.querySelector("#nicknameInput").attributes["maxlength"].nodeValue = sorcerio.meta.data.maxNameLength.toString();//update the maxlength of the nickname input
		sorcerio.init(false);
	});
});
