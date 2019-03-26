module sorcerio.gameServer.server;

import sorcerio;
import sorcerio.gameServer.input;
import sorcerio.webServer.messageQueue;
import vibe.vibe : WebSocket;
import std.json;

class Server {

	static private ushort currentPlayerId = 0;
	/++
	+ Generates a unique id for a child Player. It needs to be passed the current child Players so it can re-use ids.
	+/
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

		assert(0);//this should never be reached
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
			spellJSON ~= spell.JSONof();
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
			player.socket.send(stateString);
		}
		this.lastUpdate = millis();
	}

	void tick() {
		if (millis() - lastUpdate >= CONFIG.updateInterval) {
			sendUpdateToClients();
		}

		if (millis() - lastPhysicsTick >= CONFIG.physicsInterval) {
			physicsTick();
		}
	}

	private void physicsTick() {
		immutable long currentTime = millis();
		immutable long dt = currentTime - lastPhysicsTick;

		foreach (player; players) {
			if (messageQueue.messageAvailable(player.socketId)) {
				try {
					auto input = new Input(messageQueue.nextMessage(player.socketId));
				} catch (Exception e) {}//if this catches, then the client sent invalid input
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
