import sorcerio : millis;
import sorcerio.gameServer.spell;
import sorcerio.gameServer.spells.base.self;
import sorcerio.gameServer.player;
import sorcerio.gameServer.event;
import sorcerio.gameServer.server;

class SpeedSpell : SelfSpell {
	mixin registerSpell!(SpellName.speed, 8000);

	private {
		enum speedMultiplier = 1.5;
		enum effectDuration = 3500;///how long the effect lasts for
	}

	override string humanReadableEffect() {
		import std.conv;
		return "Makes your player move " ~ speedMultiplier.to!string ~ "x as fast for " ~ (effectDuration / 1000.0).to!string ~ " seconds";
	}

	override void affect() {
		immutable speedDiff = caster.speed - (caster.speed * speedMultiplier);
		caster.speed -= speedDiff;
		EventManager.registerEvent(effectDuration, delegate void (Server) {
			caster.speed += speedDiff;
		});
	}
}
