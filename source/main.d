import sorcerio;
import std.concurrency;

void main() {
	Tid gameServerTid = spawn(&startGameServer);
	
	startWebServer(8080u, gameServerTid);
}
