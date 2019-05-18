import sorcerio.gameServer.spell;
import sorcerio.gameServer.spells.base.projectile;
import sorcerio.gameServer.player;

class FireSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.fire, 500);

	private enum ushort damage = 100;

	override string humanReadableEffect() {
		import std.conv;
		return "Affected player gets -" ~ damage.to!string ~ " health";
	}

	override void initialize() {
		radius = 10;
		range = 700;
		speed = 1;
		super.initialize();
	}

	override void affectPlayer(Player affectedPlayer) {
		affectedPlayer.doRewardedDamage(damage, caster);
	}
}
