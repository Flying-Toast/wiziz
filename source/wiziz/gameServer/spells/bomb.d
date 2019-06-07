import wiziz.gameServer.spell;
import wiziz.gameServer.spells.base.splash;
import wiziz.gameServer.player;

class BombSpell : SplashSpell {
	mixin registerSpell!(SpellName.bomb, 2300);

	private ushort damage = 100;

	override void initialize() {
		speed = 0.5;
		range = 1500;
		radius = 10;
		explosionRadius = 300;
		color = "#E80606";
		explosionTTL = 700;
		effectDelay = cast(ushort) (explosionTTL + 1);//set this to longer than explosionTTL so that it will only affect a given player once
		super.initialize();
	}

	override string humanReadableEffect() {
		import std.conv;
		return "Affected players get -" ~ damage.to!string ~ " health";
	}

	override void splashAffect(Player player) {
		player.doRewardedDamage(damage, caster);
	}
}
