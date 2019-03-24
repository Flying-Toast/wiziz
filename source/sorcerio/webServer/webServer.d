module sorcerio.webServer.webServer;

import sorcerio;
import sorcerio.webServer.messageQueue;
import vibe.vibe;
import std.concurrency;
import std.json;
import std.conv;

private Tid gameServerTid;
private uint currentId = 0;
private uint generateSocketId() {return currentId++;};
private shared MessageQueue messageQueue;

void startWebServer(ushort port, Tid gsTid, shared MessageQueue queue) {
	gameServerTid = gsTid;
	messageQueue = queue;

	HTTPServerSettings settings = new HTTPServerSettings;
	settings.port = port;
	URLRouter router = new URLRouter;

	router.get("*", serveStaticFiles("public/"));
	router.get("/ws", handleWebSockets(&handleSocket));
	router.get("/meta.json", &serveMetaJSON);

	listenHTTP(settings, router);
	runApplication();
}

private void serveMetaJSON(HTTPServerRequest req, HTTPServerResponse res) {
	enum response = JSONValue([
		"spellTypes": generateSpellTypesJSON(),
		"inventorySize": JSONValue(CONFIG.inventorySize)
	]);
	res.writeJsonBody(response);
}

private void handleSocket(scope WebSocket socket) {
	JSONValue configJSON;
	try {
		configJSON = parseJSON(socket.receiveText());
		configJSON["nickname"];//verify that "nickname" exists in configJSON. this will throw JSONException if it fails
	} catch (JSONException e) {//client sent invalid playerConfig
		socket.close();
		return;
	}

	uint currentSocketId = generateSocketId();
	socket.send(`{"type":"yourId", "id":`~currentSocketId.to!string~`}`);

	PlayerConfig cfg = new PlayerConfig(configJSON["nickname"].str, socket, currentSocketId);

	std.concurrency.send(gameServerTid, cast(shared) cfg);

	while (socket.waitForData()) {

	}

	std.concurrency.send(gameServerTid, currentSocketId);
}
