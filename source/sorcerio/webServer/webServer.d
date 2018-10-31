module sorcerio.webServer.webServer;

import sorcerio;
import vibe.vibe;
import std.concurrency;
import std.json;

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
	JSONValue configJSON;
	try {
		configJSON = parseJSON(socket.receiveText());
		configJSON["nickname"];//verify that "nickname" exists in configJSON. this will throw JSONException if it fails
	} catch (JSONException e) {//client send invalid playerConfig
		socket.close();
		import std.stdio;
		writeln("Client sent invalid PlayerConfig.");
		return;
	}

	PlayerConfig cfg = new PlayerConfig(configJSON["nickname"].str, socket);

	std.concurrency.send(gameServerTid, cast(shared) cfg);

	while (socket.connected) {
		vibe.core.core.yield();
	}
}
