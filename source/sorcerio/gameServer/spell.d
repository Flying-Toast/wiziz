///generic spell stuff
module sorcerio.gameServer.spell;

import std.json : JSONValue;

import sorcerio : millis;
import sorcerio.gameServer.server;
import sorcerio.gameServer.player;

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

///generates a JSON array of all spell types, used for /public/spells.json
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
			throw new Exception("Spell already registered");
		}
	}

	static Spell createSpell(SpellName name, Player caster) {
		return registry[name].spell.create(caster);
	}

	static uint getCoolDownTime(SpellName name) {
		return registry[name].coolDownTime;
	}
}


mixin template registerSpell(SpellName name, uint coolDownTime) {
	static this() {
		SpellFactory.registerSpell(name, coolDownTime, new typeof(this));
	}

	private this() {}

	this(Player caster) {
		this.caster = caster;
		initialize();
	}

	override Spell create(Player caster) {
		return new typeof(this)(caster);
	}
}


abstract class Spell {
	protected Player caster;

	abstract Spell create(Player caster);

	///called once, right after object creation
	abstract void initialize();

	abstract void tick(Server gameState);
}
