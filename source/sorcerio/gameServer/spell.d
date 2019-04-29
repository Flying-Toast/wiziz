///generic spell stuff
module sorcerio.gameServer.spell;

import std.json : JSONValue;

import sorcerio : millis;
import sorcerio.gameServer.server;
import sorcerio.gameServer.player;
import sorcerio.gameServer.config;

enum SpellName {
	fire,
	cannon,
	slow,
	freeze,
	blind,
	heal,
	bomb,
	invisible,
	teleport,
	speed,
	shock
}

private enum SpellName[][ushort] spellUnlocks = [
	2: [SpellName.heal],
	3: [SpellName.bomb, SpellName.slow],
	4: [SpellName.blind, SpellName.speed],
	5: [SpellName.shock, SpellName.freeze],
	6: [SpellName.teleport, SpellName.cannon],
	7: [SpellName.invisible]
];

version (unittest) {
	SpellName[] allUnlockableSpells() {///a single array of all SpellNames that are in spellUnlocks
		import std.algorithm.iteration;

		SpellName[] unlockableSpells;
		spellUnlocks.values.each!(value => value.each!(item => unlockableSpells ~= item));

		return unlockableSpells;
	}
}

///the spells that are unlocked at `level`
SpellName[] unlockedSpells(ushort level) {
	if (level in spellUnlocks) {
		return spellUnlocks[level];
	}
	return [];
}

///generates a JSON array of all spell types, used for /public/meta.json
JSONValue generateSpellTypesJSON() {
	import std.traits;
	import std.conv;

	string[] types;
	foreach (member; [EnumMembers!SpellName]) {
		types ~= member.to!string;
	}

	return JSONValue(types);
}

final class InventorySpell {
	immutable SpellName name;
	private immutable uint coolDownTime;
	private long timeOfLastCast;
	private Player owner;///the player whose inventory contains this

	static JSONValue JSONofInventory(InventorySpell[] inventory) {
		JSONValue[] inventorySpellsJSON;

		foreach (spell; inventory) {
			if (spell is null) {
				continue;
			}

			inventorySpellsJSON ~= spell.JSONof();
		}

		return JSONValue(inventorySpellsJSON);
	}

	JSONValue JSONof() {
		import std.conv;

		JSONValue json = JSONValue();

		json["spellName"] = name.to!string;
		json["coolDownTime"] = coolDownTime;
		json["cooling"] = isCooling;

		return json;
	}

	bool isCooling() {
		if (millis() - timeOfLastCast >= coolDownTime) {
			return false;
		}
		return true;
	}

	///trys to cast the spell, returns whether or not it was actually casted
	bool castSpell(Server game) {
		if (isCooling) {
			return false;
		}

		game.addSpell(SpellFactory.createSpell(name, owner));

		timeOfLastCast = millis();
		return true;
	}

	this(SpellName name, Player owner) {
		this.name = name;
		this.coolDownTime = SpellFactory.getCoolDownTime(name);
		this.timeOfLastCast = 0;
		this.owner = owner;
	}
}

private class RegistryEntry {
	Spell spell;
	uint coolDownTime;///the coolDownTime of the inventory spell

	this(Spell spell, uint coolDownTime) {
		this.spell = spell;
		this.coolDownTime = coolDownTime;
	}
}

final class SpellFactory {
	private static RegistryEntry[SpellName] registry;

	static void registerSpell(SpellName name, uint coolDownTime, Spell spell) {
		if (name !in registry) {
			registry[name] = new RegistryEntry(spell, coolDownTime);
		} else {
			import std.conv;
			throw new Exception(text("Spell '", name.to!string, "' already registered"));
		}
	}

	static Spell createSpell(SpellName name, Player caster) {
		return registry[name].spell.create(caster);
	}

	static uint getCoolDownTime(SpellName name) {
		return registry[name].coolDownTime;
	}

	static string[string] getHumanReadableEffects() {
		import std.conv;

		string[string] effects;
		foreach (name, entry; registry) {
			effects[name.to!string] = entry.spell.humanReadableEffect;
		}
		return effects;
	}
}


mixin template registerSpell(SpellName name, uint coolDownTime) {
	static this() {
		SpellFactory.registerSpell(name, coolDownTime, new typeof(this));
	}

	private this() {}

	this(Player caster) {
		this.caster = caster;
		cast(SpellName) this.name = name;
		initialize();
	}

	override Spell create(Player caster) {
		return new typeof(this)(caster);
	}
}


abstract class Spell {
	const SpellName name;

	bool removalFlag = false;///flags the spell to be removed from Server.spells on the next tick. ALWAYS use removalFlag instead of directly removing the spell from the Server.spells array.

	/**
	JSON that represents this Spell.

	All spell JSONs $(B need) to have a string property called "renderFunction".
	The "renderFunction" property is the name of a function in the clientside code, and the rest of the spell JSON will be passed to that function to render it.

	For example, for projectile spells, there might be a single function called "renderProjectile" that can render all projectile spells.
	Then, any spell that declares its renderFunction as "renderProjectile", and thus gets passed to the renderProjectile() function, needs to also implement various other properties (in this case, `location`, `radius`, etc) that are specific to that type of spell.
	Alternatively, a spell can specify "renderFunction":"nothing", and then the spell will not be sent to clients.
	*/
	abstract JSONValue JSONof();

	protected Player caster;

	abstract Spell create(Player caster);

	///called once, right after object creation
	abstract void initialize();

	abstract void tick(Server gameState);

	///returns a string describing the effects of the spell
	abstract string humanReadableEffect();
}
