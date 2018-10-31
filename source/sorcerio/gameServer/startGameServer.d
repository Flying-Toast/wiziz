module sorcerio.gameServer.startGameServer;

import sorcerio;
import std.concurrency;
import vibe.vibe : WebSocket;
import core.time;

void startGameServer() {
	ServerManager master = new ServerManager;

	while (true) {
		receiveTimeout(dur!"msecs"(1),
			(shared PlayerConfig cfg) {
				master.addPlayerToServer(cast(PlayerConfig) cfg);
			}
		);

		master.tick();
	}
}
