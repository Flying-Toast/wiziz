import sorcerio.gameServer.spell;
import sorcerio.gameServer.spells.base.projectile;
import sorcerio.gameServer.player;
import sorcerio.gameServer.event;

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
		affectedPlayer.speed *= -1;
		EventManager.registerEvent(duration, delegate void (Server) {
			affectedPlayer.speed *= -1;
		});
	}
}
