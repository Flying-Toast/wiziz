module sorcerio.gameServer.serverManager;

import sorcerio;

class ServerManager {
	static private ushort currentServerId = 0;
	/++
	+ Generates a unique id for a child Server. It needs to be passed the current child Servers so it can re-use ids.
	+/
	static ushort generateServerId(Server[ushort] servers) {
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

	private ushort createServer() {
		immutable ushort id = ServerManager.generateServerId(servers);
		Server newServer = new Server(id);
		servers[id] = newServer;
		return id;
	}

	ushort getOrCreateServer() {
		foreach (server; servers) {
			if (!server.isFull) {
				return server.id;
			}
		}

		return createServer();
	}


}
