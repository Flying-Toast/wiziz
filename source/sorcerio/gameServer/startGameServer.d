module sorcerio.gameServer.startGameServer;

import sorcerio;
import std.concurrency;
import vibe.vibe : WebSocket;
import core.time;

void startGameServer() {
	ServerManager master = new ServerManager;

	while (true) {
		receiveTimeout(Duration.zero,
			(shared PlayerConfig cfg) {
				master.addPlayerToServer(cast(PlayerConfig) cfg);
			},
			(uint disconnectSocketId) {
				master.removePlayerBySocketId(disconnectSocketId);
			}
		);

		master.tick();
	}
}
