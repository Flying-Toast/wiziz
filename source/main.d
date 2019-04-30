import std.concurrency;

import sorcerio.webServer.messageQueue;
import sorcerio.webServer.webServer;
import sorcerio.gameServer.startGameServer;

void main() {
	shared queue = new MessageQueue;
	Tid gameServerTid = spawn(&startGameServer, queue);

	version (unittest) {//during a test build, wait a little bit for tests in game server thread to finish before starting web server.
		import core.thread;
		Thread.sleep(dur!"msecs"(3000));
	}

	startWebServer(8080u, gameServerTid, queue);
}
