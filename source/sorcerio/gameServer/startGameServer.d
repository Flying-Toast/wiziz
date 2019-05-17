module sorcerio.gameServer.startGameServer;

import vibe.vibe : WebSocket;
import std.concurrency;
import core.time;
import core.thread;

import sorcerio.webServer.messageQueue;
import sorcerio.webServer.playerConfig;
import sorcerio.gameServer.serverManager;
import CONFIG = sorcerio.gameServer.config;

///
void startGameServer(shared MessageQueue queue) {
	scope (exit) {
		import core.stdc.stdlib;
		_Exit(EXIT_FAILURE);
	}

	ServerManager master = new ServerManager(queue);

	while (true) {
		void receiveMessages() {
			immutable serverCount = master.serverCount;
			//the max # of messages to receive is the # of servers multiplied by CONFIG.maxConnectionMessagesPerServer, but if the server count is 0, multiply by 1 instead of 0:
			immutable maxMessages = (serverCount == 0 ? 1 : serverCount) * CONFIG.maxConnectionMessagesPerServer;
			ushort totalReceived = 0;

			while (totalReceived < maxMessages &&
				receiveTimeout(Duration.zero,
					(shared PlayerConfig cfg) {
						master.addPlayerToServer(cast(PlayerConfig) cfg);
					},
					(uint disconnectSocketId) {
						master.removePlayerBySocketId(disconnectSocketId);
					}
				)
			) {
				totalReceived++;
			}
		}

		version (unittest) {//for CI - don't fail if owner thread terminates
			try {
				receiveMessages();
			} catch (OwnerTerminated e) {
				import core.stdc.stdlib;
				_Exit(EXIT_SUCCESS);
			}
		} else {//normal behavior:
			receiveMessages();
		}

		try {
			master.tick();
		} catch (Throwable e) {
			import std.stdio;
			stderr.writeln(e);
			throw e;
		}

		Thread.sleep(dur!"msecs"(CONFIG.masterLoopInterval));
	}
}
