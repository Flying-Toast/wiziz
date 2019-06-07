import wiziz.gameServer.spell;
import wiziz.gameServer.spells.base.self;
import wiziz.gameServer.player;
import wiziz.gameServer.event;
import wiziz.gameServer.server;

class InvisibleSpell : SelfSpell {
	mixin registerSpell!(SpellName.invisible, 11000);

	private enum duration = 5000;///how long the effect lasts for

	override string humanReadableEffect() {
		import std.conv;
		return "Makes your player invisible for " ~ (duration / 1000).to!string ~ " seconds";
	}

	override void affect() {
		caster.effectFlags["invisible"] = true;
		EventManager.registerEvent(duration, delegate void (Server) {
			caster.effectFlags["invisible"] = false;
		});
	}
}
