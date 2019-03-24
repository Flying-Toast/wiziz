import sorcerio;
import sorcerio.webServer.messageQueue;
import std.concurrency;

void main() {
	shared queue = new MessageQueue;
	Tid gameServerTid = spawn(&startGameServer, queue);

	startWebServer(8080u, gameServerTid, queue);
}
