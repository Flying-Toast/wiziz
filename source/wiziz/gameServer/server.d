module wiziz.gameServer.server;

import std.json;

import wiziz : millis;
import wiziz.webServer.messageQueue;
import wiziz.webServer.outgoingQueue;
import wiziz.webServer.playerConfig;
import wiziz.gameServer.input;
import wiziz.gameServer.point;
import wiziz.gameServer.player;
import wiziz.gameServer.spell;
import CONFIG = wiziz.gameServer.config;
import wiziz.gameServer.event;

///A single game server
class Server {
	static private ushort currentPlayerId = 0;

	///Generates a unique id for a child Player.
	static private ushort generatePlayerId() {
		//there will never be 2^16 players at once, so it's fine if this overflows
		return currentPlayerId++;
	}


	immutable ushort id;
	Player[ushort] players;
	private int mapSize;
	private long lastUpdate;
	private long lastPhysicsTick;
	private Spell[] spells;
	private shared MessageQueue messageQueue;
	private shared OutgoingQueue outQueue;

	int getMapSize() {
		return mapSize;
	}

	void addSpell(Spell spell) {
		spells ~= spell;
	}

	private void resizeMap() {
		import std.algorithm : max;

		mapSize = max(cast(int) (((players.length + 2)^^2)^^0.3 * 1000), CONFIG.minMapSize);
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

	private void spawnBots() {
		import std.algorithm;
		import std.array;

		if (players.values.filter!(p => !p.isBot).array.length == 1) {
			if (players.length < CONFIG.numBots) {
				foreach (i; 0..(CONFIG.numBots - players.length)) {
					addBot();
				}
			}
		}
	}

	void sendUpdateToClients() {
		JSONValue state = getState();
		state["type"] = "update";
		string stateString = state.toString();

		foreach (player; players) {
			if (!player.isBot) {
				outQueue.queueMessage(player.socketId, stateString);
			}
		}
		outQueue.sendMessages();
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

		spawnBots();

		foreach (player; players) {
			if (player.isDead) {
				if (!player.isBot) {
					outQueue.queueMessage(player.socketId, `{"type":"death"}`);
				}
				players.remove(player.id);
				continue;
			}

			if (!player.isBot) {
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
			} else {//player is a bot
				Player closest = null;
				foreach (other; players) {
					if (other !is player && !other.isBot) {
						if (closest is null || player.location.distance(other.location) < player.location.distance(closest.location)) {
							closest = other;
						}
					}
				}
				if (closest !is null) {
					player.facing = closest.location;
					if (player.location.distance(closest.location) <= 710) {
						if (currentTime - player.botLastSpellCast >= CONFIG.botCastCooldown) {
							player.inventory[player.selectedItemIndex].castSpell(this);
							player.botLastSpellCast = currentTime;
						}
					}
					player.location.moveTowards(closest.location, 2 * player.speed);
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
		import std.conv : to;
		immutable ushort playerId = Server.generatePlayerId();

		Player newPlayer = new Player(cfg.nickname, randomPoint(mapSize, mapSize), playerId, cfg.socketId, false);
		players[playerId] = newPlayer;

		outQueue.queueMessage(cfg.socketId, `{"type":"yourId","id":`~playerId.to!string~`}`);
		resizeMap();
		return playerId;
	}

	void addBot() {
		immutable ushort botId = Server.generatePlayerId();

		Player bot = new Player("Bot", randomPoint(mapSize, mapSize), botId, 0, true);
		players[botId] = bot;

		resizeMap();
	}

	bool isFull() {
		return players.length == CONFIG.maxPlayers;
	}

	this(ushort id, shared MessageQueue messageQueue, shared OutgoingQueue outQueue) {
		this.id = id;
		this.mapSize = CONFIG.minMapSize;
		this.lastUpdate = 0;
		this.lastPhysicsTick = 0;
		this.messageQueue = messageQueue;
		this.outQueue = outQueue;
	}
}
