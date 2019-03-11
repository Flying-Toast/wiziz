module sorcerio.gameServer.spell;

import sorcerio.gameServer.server;

enum SpellName {//TODO: use SpellName to generate public/spellTypes.json
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

final class SpellFactory {
	private static Spell[SpellName] registry;

	static void registerSpell(SpellName name, Spell spell) {
		if (name !in registry) {
			registry[name] = spell;
		} else {
			throw new Exception("Spell already registered");
		}
	}

	static Spell createSpell(SpellName name) {//add other constructor args here if needed
		return registry[name].create();
	}
}


mixin template registerSpell(SpellName name) {
	static this() {
		SpellFactory.registerSpell(name, this.create());
	}
}

mixin template spellCreateMethod() {
	override Spell create() {
		return new typeof(this);
	}
}


abstract class Spell {
	abstract Spell create();

	abstract void tick(Server gameState);
}
