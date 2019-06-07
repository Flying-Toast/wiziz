import std.concurrency;

import wiziz.webServer.messageQueue;
import wiziz.webServer.outgoingQueue;
import wiziz.webServer.webServer;
import wiziz.gameServer.startGameServer;

void main() {
	shared queue = new MessageQueue;
	shared outQueue = new shared(OutgoingQueue);
	Tid gameServerTid = spawn(&startGameServer, queue, outQueue);

	version (unittest) {//during a test build, give some time for the gameServer to run before exiting
		import core.thread;
		Thread.sleep(dur!"msecs"(3000));
	}

	startWebServer(8080u, gameServerTid, queue, outQueue);
}
