module sorcerio.webServer.webServer;

import sorcerio;
import vibe.vibe;
import std.concurrency;

private Tid gameServerTid;

void startWebServer(ushort port, Tid gsTid) {
	gameServerTid = gsTid;

	auto settings = new HTTPServerSettings;
	settings.port = port;
	settings.bindAddresses = ["::1", "127.0.0.1"];
	auto router = new URLRouter;

	router.get("*", serveStaticFiles("public/"));
	router.get("/ws", handleWebSockets(&handleSocket));

	listenHTTP(settings, router);
	runApplication();
}

private void handleSocket(scope WebSocket socket) {
	std.concurrency.send(gameServerTid, cast(shared) socket);

	while (socket.connected) {
		vibe.core.core.yield();
	}
}
