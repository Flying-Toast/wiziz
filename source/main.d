import sorcerio;
import sorcerio.webServer.messageQueue;
import std.concurrency;

void main() {
	shared queue = new MessageQueue;
	Tid gameServerTid = spawn(&startGameServer, queue);

	version (dubTest) {//during a test build, wait a little bit for tests in game server thread to finish before starting web server.
		import core.thread;
		Thread.sleep(dur!"msecs"(3000));
	}

	startWebServer(8080u, gameServerTid, queue);
}
