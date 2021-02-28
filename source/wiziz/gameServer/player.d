module wiziz.gameServer.player;

import std.json;

import wiziz.gameServer.point;
import CONFIG = wiziz.gameServer.config;
import wiziz.gameServer.spell;

///
class Player {
	immutable ushort id;///an id that is uniqie to players in this `Server`
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
	uint xp;///The player's experience points
	uint lastInputId;///the id of the last input that was applied to the player
	bool isBot;
	long botLastSpellCast;

	private {
		immutable string nickname;
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

	///returns the max health that a player at `level` has
	static long maxHealthAtLevel(ushort level) {
		return (level * 250) + CONFIG.playerStartHealth;
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

	///increases the player's level by 1 and updates level-dependent things
	void levelUp() {
		import std.algorithm : max;

		level++;
		lastLevelUpAtXp = levelUpAtXp;
		levelUpAtXp = xpNeededForLevel(cast(ushort) (level+1));
		unlocks = unlockedSpells(level);
		speed = max(speed * CONFIG.levelUpSpeedMultiplier, CONFIG.minPlayerSpeed);

		//update maxHealth, and increase the current health so that the % health is the same as it was before
		immutable initialMaxHealth = maxHealth;
		maxHealth = maxHealthAtLevel(level);
		health = (health * maxHealth) / initialMaxHealth;
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

	/**
		Deals `damage` to this player, increasing `attacker`'s xp if this player is killed by the damage

		Params:
			damage = the amount of damage to deal
			attacker = the player who dealt the damage
	*/
	void doRewardedDamage(int damage, Player attacker) {
		if (doDamage(damage)) {
			attacker.xp += cast(uint) ((level + 1.5) ^^ 2) * 100;
		}
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
		json["lastInput"] = lastInputId;
		json["isBot"] = isBot;

		return json;
	}

	this(string nickname, Point location, ushort id, uint socketId, bool isBot) {
		import std.string;
		nickname = nickname.strip();
		if (!isBot) {
			if (nickname == "") {
				this.nickname = CONFIG.defaultNickname;
			} else if (nickname.length > CONFIG.maxNameLength) {
				this.nickname = CONFIG.defaultNickname;
			} else {
				this.nickname = nickname;
			}
		} else {
			this.nickname = nickname;
		}

		this.location = location;
		this.isBot = isBot;
		this.id = id;
		this.facing = new Point(0, 0);
		this.socketId = socketId;
		this.speed = CONFIG.defaultPlayerSpeed;
		this.health = CONFIG.playerStartHealth;
		this.maxHealth = health;
		this.xp = 0;
		this.level = 1;
		static foreach (i; unlockedSpells(1)) {//fill the inventory with the default spells
			appendSpell(new InventorySpell(i, this));
		}
		this.levelUpAtXp = xpNeededForLevel(2);
		this.lastLevelUpAtXp = xpNeededForLevel(1);
	}
}
