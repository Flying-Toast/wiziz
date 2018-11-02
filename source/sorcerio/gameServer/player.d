module sorcerio.gameServer.player;

import sorcerio;
import vibe.vibe : WebSocket;
import std.json;

class Player {
	immutable ushort id;
	immutable string nickname;
	WebSocket socket;
	private long lastMove;
	float speed;
	Point location;
	Point facing;
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
		long currentTime = millis();

		if (lastMove == 0) {
			lastMove = currentTime;
			return;
		}

		long dt = millis - lastMove;
		location.moveTowards(facing, speed * dt);
		lastMove = currentTime;
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
		this.lastMove = 0;
		this.facing = new Point(0, 0);
		this.socketId = socketId;
		this.speed = CONFIG.defaultPlayerSpeed;
	}
}
