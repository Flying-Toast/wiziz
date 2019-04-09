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
			import core.stdc.stdlib;
			_Exit(EXIT_FAILURE);
		}
	}

	ServerManager master = new ServerManager(queue);

	while (true) {
		void receiveMessages() {
			pragma(inline, true);
			receiveTimeout(Duration.zero,
				(shared PlayerConfig cfg) {
					master.addPlayerToServer(cast(PlayerConfig) cfg);
				},
				(uint disconnectSocketId) {
					master.removePlayerBySocketId(disconnectSocketId);
				}
			);
		}

		version (dubTest) {//for CI - don't fail if owner thread terminates
			try {
				receiveMessages();
			} catch (OwnerTerminated e) {
				import core.stdc.stdlib;
				_Exit(EXIT_SUCCESS);
			}
		} else {//normal behavior:
			receiveMessages();
		}

		master.tick();
		Thread.sleep(dur!"msecs"(5));
	}
}
