import wiziz.gameServer.spell;
import wiziz.gameServer.spells.base.splash;
import wiziz.gameServer.player;

class RepelSpell : SplashSpell {
	mixin registerSpell!(SpellName.repel, 5600);

	private ushort damage = 200;

	override void initialize() {
		speed = 1;
		range = 0;
		radius = 0;
		explosionRadius = 225;
		color = "#DAD216";
		explosionTTL = 1000;
		effectDelay = cast(ushort) (explosionTTL + 1);//set this to longer than explosionTTL so that it will only affect a given player once
		super.initialize();
	}

	override string humanReadableEffect() {
		import std.conv;
		return text("Explodes instantly and does ", damage, " damage to affected players (you are immune)");
	}

	override void splashAffect(Player player) {
		if (player !is caster) {
			player.doRewardedDamage(damage, caster);
		}
	}
}
