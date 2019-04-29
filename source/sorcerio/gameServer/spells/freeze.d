import sorcerio : millis;

import sorcerio.gameServer.spell;
import sorcerio.gameServer.spells.base.projectile;
import sorcerio.gameServer.player;
import sorcerio.gameServer.event;
import sorcerio.gameServer.server;

class FreezeSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.freeze, 5000);

	private enum freezeDuration = 2000;

	override string humanReadableEffect() {
		import std.conv;
		return `Affected player gets "frozen" and cannot move for ` ~ freezeDuration.to!string ~ " seconds";
	}

	override void initialize() {
		speed = 0.7;
		radius = 10;
		range = 500;
		super.initialize();
	}

	override void affectPlayer(Player player) {
		immutable initialSpeed = player.speed;
		player.speed = 0;
		EventManager.registerEvent(millis() + freezeDuration, delegate void (Server game) {
			player.speed = initialSpeed;
		});
	}
}