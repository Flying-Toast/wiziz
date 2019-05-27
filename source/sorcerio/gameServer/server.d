module sorcerio.gameServer.server;

import vibe.vibe : WebSocket, WebSocketException;
import std.json;

import sorcerio : millis;
import sorcerio.webServer.messageQueue;
import sorcerio.webServer.playerConfig;
import sorcerio.gameServer.input;
import sorcerio.gameServer.point;
import sorcerio.gameServer.player;
import sorcerio.gameServer.spell;
import CONFIG = sorcerio.gameServer.config;
import sorcerio.gameServer.event;

///A single game server
class Server {
	static private ushort currentPlayerId = 0;

	///Generates a unique id for a child Player. It needs to be passed the current child Players so it can re-use ids.
	static private ushort generatePlayerId(Player[ushort] players) {
		if (currentPlayerId == currentPlayerId.max) {
			foreach (ushort i; 0 .. currentPlayerId.max) {//find an unused id
				if ((i in players) is null) {
					return i;
				}
			}
		} else {
			return currentPlayerId++;
		}

		assert(0);
	}


	immutable ushort id;
	Player[ushort] players;
	private int mapSize;
	private long lastUpdate;
	private long lastPhysicsTick;
	private Spell[] spells;
	private shared MessageQueue messageQueue;

	int getMapSize() {
		return mapSize;
	}

	void addSpell(Spell spell) {
		spells ~= spell;
	}

	private void resizeMap() {
		import std.math;
		int newMapSize = cast(int) round( ((this.players.length + 2)^^2)^^(1.0 / 2.5) * 1000 );

		if (newMapSize < CONFIG.minMapSize) {
			newMapSize = CONFIG.minMapSize;
		} else if (newMapSize > CONFIG.maxMapSize) {
			newMapSize = CONFIG.maxMapSize;
		}

		this.mapSize = newMapSize;
	}

	private JSONValue getState() {
		JSONValue state = JSONValue();

		JSONValue[] playerJSON;


		foreach (player; players) {
			playerJSON ~= player.JSONof();
		}

		JSONValue[] spellJSON;

		foreach (spell; spells) {
			JSONValue singleJSON = spell.JSONof();
			if (singleJSON["renderFunction"].str != "nothing") {//skip the spell if its renderFunction is "nothing"
				spellJSON ~= singleJSON;
			}
		}

		state["players"] = playerJSON;
		state["mapSize"] = mapSize;
		state["spells"] = spellJSON;

		return state;
	}

	private void sendUpdateToClients() {
		JSONValue state = getState();
		state["type"] = "update";
		string stateString = state.toString();

		foreach (player; players) {
			try {
				player.socket.send(stateString);
			} catch (WebSocketException e) {}//TEMP: until I find a better way to make cross-thread WebSockets work
		}
		this.lastUpdate = millis();
	}

	void tick() {
		immutable long currentTime = millis();

		if (currentTime - lastUpdate >= CONFIG.updateInterval) {
			sendUpdateToClients();
		}

		if (currentTime - lastPhysicsTick >= CONFIG.physicsInterval) {
			physicsTick();
		}
	}

	private void physicsTick() {
		immutable currentTime = millis();

		EventManager.tick(this);

		foreach (player; players) {
			if (player.isDead) {
				try {
					player.socket.send(`{"type":"death"}`);
				} catch (WebSocketException e) {}//TEMP: until I find a better way to make cross-thread WebSockets work
				players.remove(player.id);
				continue;
			}

			ubyte processedInputs = 0;
			while (messageQueue.messageAvailable(player.socketId) && processedInputs++ < CONFIG.maxInputsPerTick) {
				Input input;
				try {
					input = new Input(messageQueue.nextMessage(player.socketId));
				} catch (Exception e) {//if this catches, then the client sent invalid input
					continue;
				}

				player.lastInputId = input.id;

				player.facing = cast(Point) input.facing;

				Point target = player.location.dup();//an imaginary point that the player moves towards
				//it doesn't matter how much the point is moved by, it is just used for direction
				if (input.moveRight) target.x += 1;
				if (input.moveLeft) target.x -= 1;
				if (input.moveDown) target.y += 1;
				if (input.moveUp) target.y -= 1;

				player.location.moveTowards(target, input.dt * player.speed);

				if (player.location.x < 0) player.location.x = 0;
				if (player.location.y < 0) player.location.y = 0;
				if (player.location.x > mapSize) player.location.x = mapSize;
				if (player.location.y > mapSize) player.location.y = mapSize;

				if (player.inventory[input.selectedItemIndex] !is null) {//make sure that there really is a spell at that index
					player.selectedItemIndex = input.selectedItemIndex;
				}

				if (input.isCasting) {
					player.inventory[player.selectedItemIndex].castSpell(this);
				}

				if (input.hasChosenUnlock && input.chosenUnlockIndex >= 0 && input.chosenUnlockIndex < player.unlocks.length) {
					player.appendSpell(new InventorySpell(player.unlocks[input.chosenUnlockIndex], player));
					player.unlocks = [];
				}

				if (input.storageSwapIndex >= 0 && input.storageSwapIndex < player.storage.length && !player.inventory[player.selectedItemIndex].isCooling) {
					auto oldInventoryItem = player.inventory[player.selectedItemIndex];
					auto oldStorageItem = player.storage[input.storageSwapIndex];

					player.inventory[player.selectedItemIndex] = oldStorageItem;
					player.storage[input.storageSwapIndex] = oldInventoryItem;
				}
			}

			if (player.shouldLevelUp) {
				player.levelUp();
			}
		}

		for (size_t i = spells.length; i-- > 0;) {//loop backwards so that spells can be removed from the array from within the loop
			import std.algorithm.mutation : remove;

			Spell spell = spells[i];

			if (spell.removalFlag) {
				spells = spells.remove(i);
				continue;
			}


			spell.tick(this);
		}

		lastPhysicsTick = currentTime;
	}

	///tries to remove a player by their socketId, and returns whether on not a player with that socketId was in this server
	bool removePlayerBySocketId(uint sockId) {
		foreach (player; players) {
			if (player.socketId == sockId) {
				players.remove(player.id);
				resizeMap();
				return true;
			}
		}

		return false;
	}

	ushort addPlayer(PlayerConfig cfg) {
		immutable ushort playerId = Server.generatePlayerId(players);

		Player newPlayer = new Player(cfg.nickname, cfg.socket, randomPoint(mapSize, mapSize), playerId, cfg.socketId);
		players[playerId] = newPlayer;

		resizeMap();
		return playerId;
	}

	bool isFull() {
		if (players.length == CONFIG.maxPlayers) {
			return true;
		} else {
			return false;
		}
	}

	this(ushort id, shared MessageQueue messageQueue) {
		this.id = id;
		this.mapSize = CONFIG.minMapSize;
		this.lastUpdate = 0;
		this.lastPhysicsTick = 0;
		this.messageQueue = messageQueue;
	}
}
