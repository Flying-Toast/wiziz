module sorcerio.webServer.playerConfig;

import vibe.vibe : WebSocket;

///Holds information that is needed to create a player
class PlayerConfig {
	immutable string nickname;

	WebSocket socket;

	uint socketId;

	this(string nickname, WebSocket socket, uint socketId) {
		this.nickname = nickname;
		this.socket = socket;
		this.socketId = socketId;
	}
}
