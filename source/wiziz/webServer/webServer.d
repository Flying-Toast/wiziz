module wiziz.webServer.webServer;

import vibe.vibe;
import std.json;
import std.conv;
import std.concurrency;
import std.traits;
import std.algorithm : map;
import std.range : array;
import std.file;
import std.path : dirName;

import wiziz.webServer.messageQueue;
import wiziz.webServer.outgoingQueue;
import wiziz.webServer.playerConfig;
import wiziz.gameServer.spell;
import CONFIG = wiziz.gameServer.config;

private Tid gameServerTid;
private uint currentId = 1;
private uint generateSocketId() {
	currentId++;

	if (currentId == 0) {
		currentId++;
	}

	return currentId;
};
private shared MessageQueue messageQueue;
private shared OutgoingQueue outQueue;

private JSONValue metaJSONResponse;
private void serveMetaJSON(HTTPServerRequest req, HTTPServerResponse res) {
	res.writeJsonBody(metaJSONResponse);
}

private enum string[] spellTypes = [EnumMembers!SpellName].map!(a => a.to!string).array;
private string[string] humanReadableEffects;

void startWebServer(Tid gsTid, shared MessageQueue queue, shared OutgoingQueue outgoingQueue) {
	gameServerTid = gsTid;
	messageQueue = queue;
	outQueue = outgoingQueue;

	humanReadableEffects = SpellFactory.getHumanReadableEffects;

	metaJSONResponse = JSONValue([
		"spellTypes": generateSpellTypesJSON(),
		"inventorySize": JSONValue(CONFIG.inventorySize),
		"humanReadableEffects": JSONValue(humanReadableEffects),
		"maxNameLength": JSONValue(CONFIG.maxNameLength),
		"maxInputDT": JSONValue(CONFIG.maxInputDT)
	]);


	HTTPServerSettings settings = new HTTPServerSettings;
	ushort port = 8080;

	immutable basePath = thisExePath.dirName;
	if (exists(basePath~"/fullchain.pem") && exists(basePath~"/privkey.pem")) {//use https if certificate files exist
		import std.stdio;
		writeln("Found SSL certificates.");
		port = 8443;
		settings.tlsContext = createTLSContext(TLSContextKind.server);
		settings.tlsContext.useCertificateChainFile("fullchain.pem");
		settings.tlsContext.usePrivateKeyFile("privkey.pem");
	}

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

	PlayerConfig cfg = new PlayerConfig(configJSON["nickname"].str, currentSocketId);

	auto sender = runTask({
		while (socket.connected) {
			outQueue.waitForSend();
			while (outQueue.messageAvailable(currentSocketId)) {
				socket.send(outQueue.nextMessage(currentSocketId));
			}
		}
	});

	std.concurrency.send(gameServerTid, cast(shared) cfg);

	while (socket.waitForData()) {
		messageQueue.queueMessage(currentSocketId, socket.receiveText());
	}

	std.concurrency.send(gameServerTid, currentSocketId);

	sender.join();
}
