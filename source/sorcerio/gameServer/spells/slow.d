import sorcerio : millis;
import sorcerio.gameServer.spell;
import sorcerio.gameServer.spells.base.splash;
import sorcerio.gameServer.player;
import sorcerio.gameServer.server;
import sorcerio.gameServer.event;

class SlowSpell : SplashSpell {
	mixin registerSpell!(SpellName.slow, 4500);

	private enum speedMultiplier = 0.5;

	override void initialize() {
		speed = 0.5;
		range = 850;
		radius = 10;
		explosionRadius = 200;
		color = "#11330C";
		explosionTTL = 5500;
		effectDelay = 2000;
		super.initialize();
	}

	override string humanReadableEffect() {
		import std.conv;
		return "Affected players get slowed down to " ~ (speedMultiplier * 100).to!string ~ "% of their original speed";
	}

	override void splashAffect(Player player) {
		player.speed *= speedMultiplier;
		EventManager.registerEvent(effectDelay, delegate void (Server game) {
			player.speed /= speedMultiplier;
		});
	}
}
