module sorcerio.gameServer.serverManager;

import sorcerio;

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

	ushort addPlayerToServer(PlayerConfig cfg) {
		ushort serverId = getOrCreateServer();
		servers[serverId].addPlayer(cfg);
		return serverId;
	}

	void tick() {
		foreach(server; servers) {
			server.tick();
		}
	}

	void removePlayerBySocketId(uint sockId) {
		foreach (server; servers) {
			if (server.removePlayerBySocketId(sockId)) {
				return;
			}
		}
	}

	private ushort createServer() {
		immutable ushort id = ServerManager.generateServerId(servers);
		Server newServer = new Server(id);
		servers[id] = newServer;
		return id;
	}

	private ushort getOrCreateServer() {
		foreach (server; servers) {
			if (!server.isFull) {
				return server.id;
			}
		}

		return createServer();
	}
}
