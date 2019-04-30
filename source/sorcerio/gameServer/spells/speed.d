import sorcerio : millis;
import sorcerio.gameServer.spell;
import sorcerio.gameServer.spells.base.self;
import sorcerio.gameServer.player;
import sorcerio.gameServer.event;
import sorcerio.gameServer.server;

class SpeedSpell : SelfSpell {
	mixin registerSpell!(SpellName.speed, 7000);

	private {
		enum speedMultiplier = 1.5;
		enum effectDuration = 5000;///how long the effect lasts for
	}

	override string humanReadableEffect() {
		import std.conv;
		return "Makes your player move " ~ speedMultiplier.to!string ~ "x faster for " ~ (effectDuration / 1000).to!string ~ " seconds";
	}

	override void affect() {
		caster.speed *= speedMultiplier;
		EventManager.registerEvent(millis() + effectDuration, delegate void (Server) {
			caster.speed /= speedMultiplier;
		});
	}
}
