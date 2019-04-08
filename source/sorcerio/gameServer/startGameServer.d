module sorcerio.gameServer.startGameServer;

import sorcerio;
import sorcerio.webServer.messageQueue;

import std.concurrency;
import vibe.vibe : WebSocket;
import core.time;
import core.thread;

void startGameServer(shared MessageQueue queue) {
	version (Posix) {
		scope (exit) {
			version (dubTest) {//for CI - don't fail when owner thread terminates
				import core.stdc.stdlib;
				_Exit(EXIT_SUCCESS);
			} else {//normal behavior:
				import core.stdc.stdlib;
				_Exit(EXIT_FAILURE);
			}
		}
	}

	ServerManager master = new ServerManager(queue);

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
		Thread.sleep(dur!"msecs"(5));
	}
}
