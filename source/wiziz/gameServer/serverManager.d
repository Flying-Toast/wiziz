module wiziz.gameServer.serverManager;

import wiziz.webServer.messageQueue;
import wiziz.webServer.outgoingQueue;
import wiziz.webServer.playerConfig;
import wiziz.gameServer.server;
import CONFIG = wiziz.gameServer.config;

///master server, contains multiple `Server`s.
class ServerManager {
	static private ushort currentServerId = 0;

	///Generates a unique id for a child Server.
	static private ushort generateServerId() {
		//there will never be anywhere near 2^16 servers in one ServerManager, so it is fine if currentServerId overflows here
		return currentServerId++;
	}

	private Server[ushort] servers;
	private shared MessageQueue messageQueue;
	private shared OutgoingQueue outQueue;

	///Creates a player from `cfg` in an available server
	ushort addPlayerToServer(PlayerConfig cfg) {
		ushort serverId = getOrCreateServer();
		servers[serverId].addPlayer(cfg);
		return serverId;
	}

	///how many servers are in the ServerManager
	auto serverCount() {
		return servers.length;
	}

	///tick all the servers
	void tick() {
		import std.algorithm;
		import std.array;

		foreach(server; servers) {
			if (server.players.values.filter!(p => !p.isBot).array.length == 0) {//remove the server if it is empty
				server.sendUpdateToClients();
				servers.remove(server.id);
				continue;
			}

			server.tick();
		}
	}

	///removes the player with the given socket id from their server
	void removePlayerBySocketId(uint sockId) {
		messageQueue.removeSocket(sockId);
		outQueue.removeSocket(sockId);
		foreach (server; servers) {
			if (server.removePlayerBySocketId(sockId)) {
				return;
			}
		}
	}

	///creates a new server, adds it to `servers`, and returns the new server's id
	private ushort createServer() {
		immutable ushort id = ServerManager.generateServerId();
		Server newServer = new Server(id, messageQueue, outQueue);
		servers[id] = newServer;
		return id;
	}

	///Returns the id of a non-full server, creating a new server if there isn't an available one
	private ushort getOrCreateServer() {
		foreach (server; servers) {
			if (!server.isFull) {
				return server.id;
			}
		}

		return createServer();
	}

	this(shared MessageQueue messageQueue, shared OutgoingQueue outQueue) {
		this.messageQueue = messageQueue;
		this.outQueue = outQueue;
	}
}
