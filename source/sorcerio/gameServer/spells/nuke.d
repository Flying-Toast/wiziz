import sorcerio.gameServer.spell;
import sorcerio.gameServer.spells.base.splash;
import sorcerio.gameServer.player;

class NukeSpell : SplashSpell {
	mixin registerSpell!(SpellName.nuke, 16000);

	private enum damage = 10;

	override void initialize() {
		speed = 0.3;
		range = 600;
		radius = 22;
		explosionRadius = 400;
		color = "#527A15";
		explosionTTL = 10000;
		effectDelay = 500;
		super.initialize();
	}

	override string humanReadableEffect() {
		import std.conv;
		return "";
	}

	override void splashAffect(Player player) {
		player.doRewardedDamage(damage, caster);
	}
}
