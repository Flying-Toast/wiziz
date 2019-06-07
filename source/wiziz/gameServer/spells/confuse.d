import wiziz.gameServer.spell;
import wiziz.gameServer.spells.base.projectile;
import wiziz.gameServer.player;
import wiziz.gameServer.event;

class ConfuseSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.confuse, 2300);

	private enum duration = 6500;

	override string humanReadableEffect() {
		import std.conv;
		return text("Inverts affected player's controls for ", duration / 1000.0, " seconds");
	}

	override void initialize() {
		radius = 15;
		range = 1000;
		speed = 1.4;
		super.initialize();
	}

	override void affectPlayer(Player affectedPlayer) {
		immutable speedDiff = affectedPlayer.speed * 2;
		affectedPlayer.speed -= speedDiff;
		EventManager.registerEvent(duration, delegate void (Server) {
			affectedPlayer.speed += speedDiff;
		});
	}
}
