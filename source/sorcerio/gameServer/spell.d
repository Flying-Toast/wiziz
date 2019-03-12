///generic spell stuff
module sorcerio.gameServer.spell;

import std.json : JSONValue;

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

final class SpellFactory {
	private static Spell[SpellName] registry;

	static void registerSpell(SpellName name, Spell spell) {
		if (name !in registry) {
			registry[name] = spell;
		} else {
			throw new Exception("Spell already registered");
		}
	}

	static Spell createSpell(SpellName name, Player caster) {
		return registry[name].create(caster);
	}
}


mixin template registerSpell(SpellName name) {
	static this() {
		SpellFactory.registerSpell(name, new typeof(this));
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
