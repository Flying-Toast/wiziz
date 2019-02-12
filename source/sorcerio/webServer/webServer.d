module sorcerio.webServer.webServer;

import sorcerio;
import vibe.vibe;
import std.concurrency;
import std.json;
import std.conv;

private Tid gameServerTid;
private uint currentId = 0;
private uint generateSocketId() {return currentId++;};

void startWebServer(ushort port, Tid gsTid) {
	gameServerTid = gsTid;

	HTTPServerSettings settings = new HTTPServerSettings;
	settings.port = port;
	URLRouter router = new URLRouter;

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
		return;
	}

	uint currentSocketId = generateSocketId();
	socket.send(`{"type":"yourId", "id":`~currentSocketId.to!string~`}`);

	PlayerConfig cfg = new PlayerConfig(configJSON["nickname"].str, socket, currentSocketId);

	std.concurrency.send(gameServerTid, cast(shared) cfg);

	while (socket.waitForData()) {
		vibe.core.core.yield();
	}

	std.concurrency.send(gameServerTid, currentSocketId);
}
