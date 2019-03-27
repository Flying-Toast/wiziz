module sorcerio.gameServer.player;

import sorcerio;
import vibe.vibe : WebSocket;
import std.json;

class Player {
	immutable ushort id;
	private immutable string nickname;
	WebSocket socket;
	float speed;
	Point location;
	Point facing;
	uint socketId;
	private InventorySpell[CONFIG.inventorySize] inventory;
	private long health;
	private long maxHealth;
	private uint xp;
	private ushort level;

	///returns the amount of xp needed to get to `level`
	static uint xpNeededForLevel(ushort level) {
		import std.conv;
		return (((level / 0.9) ^^ 2) * 100).to!uint;
	}

	void doDamage(int damage) {
		health -= damage;
	}

	void heal(int amount) {
		doDamage(-amount);
	}

	JSONValue JSONof() {
		JSONValue json = JSONValue();

		json["nickname"] = nickname;
		json["location"] = location.JSONof();
		json["facing"] = facing.JSONof();
		json["id"] = id;
		json["inventory"] = InventorySpell.JSONofInventory(inventory);
		json["health"] = health;
		json["maxHealth"] = maxHealth;
		json["xp"] = xp;
		json["level"] = level;

		return json;
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
		this.health = CONFIG.playerStartHealth;
		this.maxHealth = health;
		this.xp = 0;
		this.level = 1;
	}
}
