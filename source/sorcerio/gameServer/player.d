module sorcerio.gameServer.player;

import sorcerio;
import vibe.vibe : WebSocket;
import std.json;

class Player {
	immutable ushort id;
	private immutable string nickname;
	WebSocket socket;
	private float speed;
	private Point location;
	private Point facing;
	uint socketId;

	JSONValue JSONof() {
		JSONValue json = JSONValue();

		json["nickname"] = nickname;
		json["location"] = location.JSONof();
		json["facing"] = facing.JSONof();
		json["id"] = id;
		
		return json;
	}

	void tick() {
		///////DO NOT MOVE TOWARDS this.facing!!!! WASD TO MOVE! this.facing IS FOR ROTATION ANGLE ONLY!!!!!!!!!!!!!
		///////dt is gotten from client, and if it is more than CONFIG.maxDt, it is set to maxDt
	}

	this(string nickname, WebSocket socket, Point location, ushort id, uint socketId) {
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
		this.facing = new Point(0, 0);
		this.socketId = socketId;
		this.speed = CONFIG.defaultPlayerSpeed;
	}
}
