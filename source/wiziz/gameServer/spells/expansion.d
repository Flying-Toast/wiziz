import wiziz : millis;
import wiziz.gameServer.spell;
import wiziz.gameServer.server;
import wiziz.gameServer.spells.base.splash;
import wiziz.gameServer.player;

class ExpansionSpell : SplashSpell {
	mixin registerSpell!(SpellName.expansion, 1400);

	private {
		long lastResize;///timestamp that the explosionRadius was last updated
		enum ushort initialExplosionRadius = 10;///the minimum/starting explosionRadius
		enum expansionSpeed = 0.2;///speed at which the explosionRadius expands, in pixels/millisecond
		private double preciseExplosionRadius;///a floating-point version of `explosionRadius`
		private const ushort maxRadius = 0;///the maximum radius of the spell. (do not manually set this, it is calulated. changing its value doesn't do anything.)
	}


	override void tick(Server game) {
		super.tick(game);
		if (isSplashed) {
			resize();
		}
	}

	///updates the explosionRadius
	private void resize() {
		immutable currentTime = millis();
		immutable dt = currentTime - lastResize;

		preciseExplosionRadius += expansionSpeed * dt;
		explosionRadius = cast(ushort) preciseExplosionRadius;

		lastResize = currentTime;
	}

	override void die() {
		if (!isSplashed) {
			lastResize = millis();
		}
		super.die();
	}

	override void initialize() {
		lastResize = millis();
		speed = 0.7;
		range = 500;
		radius = 4;
		explosionRadius = initialExplosionRadius;
		preciseExplosionRadius = initialExplosionRadius;
		explosionTTL = 1200;
		cast(ushort) maxRadius = cast(short) (initialExplosionRadius + (expansionSpeed * explosionTTL));
		color = "#B32020";
		effectDelay = cast(ushort) (explosionTTL + 1);//set this to longer than explosionTTL so that it will only affect a given player once
		super.initialize();
	}

	override string humanReadableEffect() {
		import std.conv;
		return "Expands over time, but does less damage the larger it gets";
	}

	private ushort damage() {
		return cast(ushort) (0.6 * (maxRadius - explosionRadius));
	}

	override void splashAffect(Player player) {
		player.doRewardedDamage(damage, caster);
	}
}
