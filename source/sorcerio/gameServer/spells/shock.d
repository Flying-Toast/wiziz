import sorcerio : millis;
import sorcerio.gameServer.spell;
import sorcerio.gameServer.spells.base.projectile;
import sorcerio.gameServer.player;
import sorcerio.gameServer.event;
import sorcerio.gameServer.server;

class ShockSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.shock, 1200);

	private {
		enum totalZaps = 3;
		enum zapDamage = 90;///amount of damage that each zap does
		enum zapDelay = 1000;///milliseconds between each zap
	}

	override string humanReadableEffect() {
		import std.conv;
		return "Affected player loses " ~ zapDamage.to!string ~ " health every " ~ (zapDelay / 1000).to!string ~ " seconds, a total of " ~ totalZaps.to!string ~ " times";
	}

	override void initialize() {
		radius = 10;
		range = 650;
		speed = 0.8;
		super.initialize();
	}

	override void affectPlayer(Player player) {
		for (int i = 1; i <= totalZaps; i++) {
			EventManager.registerEvent(i * zapDelay, delegate void (Server) {
				player.doRewardedDamage(zapDamage, caster);
			});
		}
	}
}
