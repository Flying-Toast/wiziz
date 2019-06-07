import wiziz.gameServer.spells.base.projectile;
import wiziz.gameServer.player;
import wiziz.gameServer.spell;

class TeleportSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.teleport, 7000);

	override string humanReadableEffect() {
		return "Teleports your player to its location when it either reaches its target or hits another player";
	}

	override void initialize() {
		radius = 10;
		range = 600;
		speed = 0.8;
		super.initialize();
	}

	override void affectPlayer(Player affectedPlayer) {}

	override void die() {
		caster.location.moveTo(location);
		super.die();
	}
}
