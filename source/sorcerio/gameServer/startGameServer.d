module sorcerio.gameServer.startGameServer;

import sorcerio;
import std.concurrency;
import vibe.vibe : WebSocket;
import core.time : Duration;

void startGameServer() {
	ServerManager master = new ServerManager;

	while (true) {
		receiveTimeout(Duration.zero,
			(shared WebSocket skt) {
				WebSocket socket = cast(WebSocket) skt;
				socket.send("hi from gameServer :)  :)  :)  :)  :)");
			}
		);

	}
}
