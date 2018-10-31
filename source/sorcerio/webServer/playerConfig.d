module sorcerio.webServer.playerConfig;

import vibe.vibe : WebSocket;

class PlayerConfig {
	immutable string nickname;

	WebSocket socket;

	this(string nickname, WebSocket socket) {
		this.nickname = nickname;
		this.socket = socket;
	}
}
