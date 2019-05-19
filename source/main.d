import std.concurrency;

import sorcerio.webServer.messageQueue;
import sorcerio.webServer.webServer;
import sorcerio.gameServer.startGameServer;

void main() {
	shared queue = new MessageQueue;
	Tid gameServerTid = spawn(&startGameServer, queue);

	version (unittest) {//during a test build, give some time for the gameServer to run before exiting
		import core.thread;
		Thread.sleep(dur!"msecs"(3000));
	}

	startWebServer(8080u, gameServerTid, queue);
}
