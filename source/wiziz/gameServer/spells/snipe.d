import wiziz.gameServer.spell;
import wiziz.gameServer.spells.base.projectile;
import wiziz.gameServer.player;

class SnipeSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.snipe, 1300);

	private enum ushort damage = 77;

	override string humanReadableEffect() {
		import std.conv;
		return text("Does ", damage, " damage to affected players");
	}

	override void initialize() {
		radius = 5;
		range = 825;
		speed = 3;
		super.initialize();
	}

	override void affectPlayer(Player affectedPlayer) {
		affectedPlayer.doRewardedDamage(damage, caster);
	}
}
