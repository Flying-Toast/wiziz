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
	settings.errorPageHandler = toDelegate(&errorHandler);
	URLRouter router = new URLRouter;

	router.get("*", serveStaticFiles("public/"));
	router.get("/ws", handleWebSockets(&handleSocket));
	router.get("/meta.json", &serveMetaJSON);
	router.get("/spellList", &serveSpellList);

	listenHTTP(settings, router);
	runApplication();
}

private void serveSpellList(HTTPServerRequest req, HTTPServerResponse res) {
	res.render!("spellList.dt", req);
}

private void errorHandler(HTTPServerRequest req, HTTPServerResponse res, HTTPServerErrorInfo err) {
	if (err.code == 404) {
		sendFile(req, res, GenericPath!PosixPathFormat("public/404.html"));
	} else {
		import std.conv;
		res.writeBody(err.code.to!string);
	}
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
		messageQueue.queueMessage(currentSocketId, socket.receiveText());
	}

	std.concurrency.send(gameServerTid, currentSocketId);
}
