import wiziz : millis;

import wiziz.gameServer.spell;
import wiziz.gameServer.spells.base.projectile;
import wiziz.gameServer.player;
import wiziz.gameServer.event;
import wiziz.gameServer.server;

class FreezeSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.freeze, 6000);

	private enum freezeDuration = 3000;

	override string humanReadableEffect() {
		import std.conv;
		return `Affected player gets "frozen" and cannot move for ` ~ (freezeDuration / 1000).to!string ~ " seconds";
	}

	override void initialize() {
		speed = 0.7;
		radius = 10;
		range = 650;
		super.initialize();
	}

	override void affectPlayer(Player player) {
		immutable initialSpeed = player.speed;
		player.speed = 0;
		EventManager.registerEvent(freezeDuration, delegate void (Server game) {
			player.speed += initialSpeed;
		});
	}
}
