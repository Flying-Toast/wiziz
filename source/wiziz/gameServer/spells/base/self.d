module wiziz.gameServer.spells.base.self;

import std.json : JSONValue;

import wiziz.gameServer.spell;
import wiziz.gameServer.server;

///A spell that deals its effect to the caster
abstract class SelfSpell : Spell {
	override void initialize() {}

	override JSONValue JSONof() {
		JSONValue json = JSONValue();

		json["renderFunction"] = "nothing";

		return json;
	}

	override void tick(Server game) {
		if (removalFlag) {
			return;
		}

		affect();
		die();
	}

	abstract void affect();//affects the caster with the spells effect

	protected void die() {
		removalFlag = true;
	}
}
