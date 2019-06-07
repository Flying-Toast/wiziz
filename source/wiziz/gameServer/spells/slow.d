import wiziz : millis;
import wiziz.gameServer.spell;
import wiziz.gameServer.spells.base.splash;
import wiziz.gameServer.player;
import wiziz.gameServer.server;
import wiziz.gameServer.event;

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
		immutable speedDiff = player.speed - (player.speed * speedMultiplier);
		player.speed -= speedDiff;
		EventManager.registerEvent(effectDelay, delegate void (Server game) {
			player.speed += speedDiff;
		});
	}
}
