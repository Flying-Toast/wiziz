module sorcerio.gameServer.player;

import sorcerio;
import vibe.vibe : WebSocket;
import std.json;

class Player {
	immutable ushort id;
	WebSocket socket;
	float speed;
	Point location;
	Point facing;
	uint socketId;
	InventorySpell[CONFIG.inventorySize] inventory;
	ubyte selectedItemIndex;
	long health;
	long maxHealth;

	private {
		immutable string nickname;
		uint xp;
		ushort level;
		uint levelUpAtXp;///the amount of XP needed to get to the next level
		uint lastLevelUpAtXp;///the amount of xp that _was_ needed to get to the current level. Used for rendering the xp slider on client side.
	}

	invariant {
		assert(selectedItemIndex < CONFIG.inventorySize, "Player selectedItemIndex out of bounds.");
	}

	///returns the amount of xp needed to get to `level`
	static uint xpNeededForLevel(ushort level) {
		return cast(uint) (((level / 0.9) ^^ 2) * 100);
	}

	bool isDead() {
		return health <= 0;
	}

	///increases the player's level by 1
	void levelUp() {
		level++;
		lastLevelUpAtXp = levelUpAtXp;
		levelUpAtXp = xpNeededForLevel(level);
	}

	bool shouldLevelUp() {
		return xp >= levelUpAtXp;
	}

	void doDamage(int damage) {
		health -= damage;
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
		json["selectedItem"] = selectedItemIndex;
		json["levelUpAtXp"] = levelUpAtXp;
		json["lastLevelUpAtXp"] = lastLevelUpAtXp;

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
		this.inventory[0] = new InventorySpell(SpellName.fire, this);//default starting inventory
		this.levelUpAtXp = xpNeededForLevel(2);
		this.lastLevelUpAtXp = xpNeededForLevel(1);
	}
}
