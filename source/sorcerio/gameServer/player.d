module sorcerio.gameServer.player;

import vibe.vibe : WebSocket;
import std.json;

import sorcerio.gameServer.point;
import CONFIG = sorcerio.gameServer.config;
import sorcerio.gameServer.spell;

///
class Player {
	immutable ushort id;///an id that is uniqie to players in this `Server`
	WebSocket socket;
	float speed;
	Point location;///the player's current location
	Point facing;///global coords of the client's cursor
	uint socketId;///An id that is unique throughout all `Server`s.
	InventorySpell[CONFIG.inventorySize] inventory;
	InventorySpell[] storage;
	SpellName[] unlocks;///the current choice of unlocked spells
	ubyte selectedItemIndex;///the index of the currently selected item in the inventory, i.e. `inventory[selectedItemIndex]` is the currently selected spell.
	long health;
	long maxHealth;///How much the player has at full health
	bool[string] effectFlags;///Flags for sending extra data about the effects on a player to the clients

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

	///adds `spell` to the player's inventory, or to storage if inventory is full.
	void appendSpell(InventorySpell spell) {
		if (inventory[$-1] !is null) {//inventory is full - append `spell` to storage
			storage ~= spell;
		} else {//inventory has room
			foreach (index, item; inventory) {//replace the first null spell
				if (item is null) {
					inventory[index] = spell;
					break;
				}
			}
		}
	}

	bool isDead() {
		return health <= 0;
	}

	///increases the player's level by 1
	void levelUp() {
		level++;
		lastLevelUpAtXp = levelUpAtXp;
		levelUpAtXp = xpNeededForLevel(cast(ushort) (level+1));
		unlocks = unlockedSpells(level);
	}

	///checks if the player is able to level up
	bool shouldLevelUp() {
		return xp >= levelUpAtXp && unlocks.length == 0;//dont level up if the player has not chosen unlocked spells
	}

	/**
		subtracts `damage` from the player's health

		Returns: whether or not the damage dealt killed the player
	*/
	bool doDamage(int damage) {
		immutable wasDeadBefore = isDead;
		health -= damage;
		return isDead && !wasDeadBefore;
	}

	///JSON representation of the player that is sent to the clients
	JSONValue JSONof() {
		import std.conv;

		JSONValue json = JSONValue();

		json["nickname"] = nickname;
		json["location"] = location.JSONof();
		json["facing"] = facing.JSONof();
		json["id"] = id;
		json["inventory"] = InventorySpell.JSONofInventory(inventory);
		json["storage"] = InventorySpell.JSONofInventory(storage);
		json["health"] = health;
		json["maxHealth"] = maxHealth;
		json["xp"] = xp;
		json["level"] = level;
		json["selectedItem"] = selectedItemIndex;
		json["levelUpAtXp"] = levelUpAtXp;
		json["lastLevelUpAtXp"] = lastLevelUpAtXp;
		json["unlocks"] = JSONValue(unlocks.to!(string[]));
		json["flags"] = effectFlags;
		json["speed"] = speed;

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
