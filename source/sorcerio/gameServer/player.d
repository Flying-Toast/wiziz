module sorcerio.gameServer.player;

import sorcerio;
import vibe.vibe : WebSocket;

class Player {
	immutable ushort id;
	immutable string nickname;
	private WebSocket socket;
	Point location;

	this(string nickname, WebSocket socket, Point location, ushort id) {
		import std.string;
		nickname = nickname.strip();
		if (nickname == "") {
			this.nickname = CONFIG.defaultNickname;
		} else if (nickname.length > CONFIG.maxNameLength) {
			this.nickname = nickname[0 .. CONFIG.maxNameLength];
		} else {
			this.nickname = nickname;
		}
		
		this.socket = socket;
		this.location = location;
		this.id = id;
	}
}
