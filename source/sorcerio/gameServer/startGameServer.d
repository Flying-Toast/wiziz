module sorcerio.gameServer.startGameServer;

import sorcerio;
import std.concurrency;
import vibe.vibe : WebSocket;
import core.time : Duration;

void startGameServer() {
	ServerManager master = new ServerManager;

	while (true) {
		receiveTimeout(Duration.zero,
			(shared PlayerConfig cfg) {
				master.addPlayerToServer(cast(PlayerConfig) cfg);
			}
		);

		master.tick();
	}
}
