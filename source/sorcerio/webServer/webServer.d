module sorcerio.webServer.webServer;

import vibe.vibe;
import std.json;
import std.conv;
import std.concurrency;
import std.traits;
import std.algorithm : map;
import std.range : array;

import sorcerio.webServer.messageQueue;
import sorcerio.webServer.playerConfig;
import sorcerio.gameServer.spell;
import CONFIG = sorcerio.gameServer.config;

private Tid gameServerTid;
private uint currentId = 0;
private uint generateSocketId() {return currentId++;};
private shared MessageQueue messageQueue;

private JSONValue metaJSONResponse;
private void serveMetaJSON(HTTPServerRequest req, HTTPServerResponse res) {
	res.writeJsonBody(metaJSONResponse);
}

private enum string[] spellTypes = [EnumMembers!SpellName].map!(a => a.to!string).array;
private string[string] humanReadableEffects;

void startWebServer(ushort port, Tid gsTid, shared MessageQueue queue) {
	gameServerTid = gsTid;
	messageQueue = queue;

	humanReadableEffects = SpellFactory.getHumanReadableEffects;

	metaJSONResponse = JSONValue([
		"spellTypes": generateSpellTypesJSON(),
		"inventorySize": JSONValue(CONFIG.inventorySize),
		"humanReadableEffects": JSONValue(humanReadableEffects),
		"maxNameLength": JSONValue(CONFIG.maxNameLength),
		"maxInputDT": JSONValue(CONFIG.maxInputDT)
	]);


	HTTPServerSettings settings = new HTTPServerSettings;
	settings.port = port;
	settings.errorPageHandler = toDelegate(&errorHandler);
	URLRouter router = new URLRouter;

	router.get("*", serveStaticFiles("public/"));
	router.get("/ws", handleWebSockets(&handleSocket));
	router.get("/meta.json", &serveMetaJSON);
	router.get("/spellList", &serveSpellList);

	listenHTTP(settings, router);

	version (unittest) {//this is for CI. If doing a test build, don't call runApplication() - it would freeze the CI build.
		pragma(msg, "Building without vibe.d application.");
	} else {
		runApplication();
	}
}

private void serveSpellList(HTTPServerRequest req, HTTPServerResponse res) {
	res.render!("spellList.dt", spellTypes, humanReadableEffects);
}

private void errorHandler(HTTPServerRequest req, HTTPServerResponse res, HTTPServerErrorInfo err) {
	if (err.code == 404) {
		sendFile(req, res, GenericPath!PosixPathFormat("public/404.html"));
	} else {
		import std.conv;
		res.writeBody(err.code.to!string);
	}
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
	socket.send(`{"type":"yourId","id":`~currentSocketId.to!string~`}`);

	PlayerConfig cfg = new PlayerConfig(configJSON["nickname"].str, socket, currentSocketId);

	std.concurrency.send(gameServerTid, cast(shared) cfg);

	while (socket.waitForData()) {
		messageQueue.queueMessage(currentSocketId, socket.receiveText());
	}

	std.concurrency.send(gameServerTid, currentSocketId);
}
