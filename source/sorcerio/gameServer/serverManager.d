module sorcerio.gameServer.serverManager;

import sorcerio.webServer.messageQueue;
import sorcerio.webServer.playerConfig;
import sorcerio.gameServer.server;
import sorcerio.gameServer.config;

///master server, contains multiple `Server`s.
class ServerManager {
	static private ushort currentServerId = 0;
	/++
	+ Generates a unique id for a child Server. It needs to be passed the current child Servers so it can re-use ids.
	+/
	static private ushort generateServerId(Server[ushort] servers) {
		if (currentServerId == currentServerId.max) {
			foreach (ushort i; 0 .. currentServerId.max) {//find an unused id
				if ((i in servers) is null) {
					return i;
				}
			}
		} else {
			return currentServerId++;
		}

		assert(0);//this should never be reached
	}

	private Server[ushort] servers;
	private shared MessageQueue messageQueue;

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
		foreach(server; servers) {
			if (server.players.length == 0) {//remove the server if it is empty
				servers.remove(server.id);
				continue;
			}

			server.tick();
		}
	}

	///removes the player with the given socket id from their server
	void removePlayerBySocketId(uint sockId) {
		messageQueue.removeSocket(sockId);
		foreach (server; servers) {
			if (server.removePlayerBySocketId(sockId)) {
				return;
			}
		}
	}

	///creates a new server, adds it to `servers`, and returns the new server's id
	private ushort createServer() {
		immutable ushort id = ServerManager.generateServerId(servers);
		Server newServer = new Server(id, messageQueue);
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

	this(shared MessageQueue messageQueue) {
		this.messageQueue = messageQueue;
	}
}
