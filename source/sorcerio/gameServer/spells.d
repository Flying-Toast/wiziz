///spell implementations
module sorcerio.gameServer.spells;

public import sorcerio.gameServer.spell;
import sorcerio : millis;
import sorcerio.gameServer.point;
import sorcerio.gameServer.server;
import sorcerio.gameServer.player;
import sorcerio.gameServer.config;

abstract class ProjectileSpell : Spell {
	protected {
		Point origin;
		Point target;
		Point location;

		ushort radius;
		ushort range;
		float speed;
	}

	private {
		long lastMove;
		double lenOriginToTarget;
	}

	override void initialize() {
		this.origin = caster.location.dup();
		this.location = caster.location.dup();
		this.target = new Point(
			origin.x + (range / caster.facing.distance(origin) * (caster.facing.x - origin.x)),
			origin.y + (range / caster.facing.distance(origin) * (caster.facing.y - origin.y))
		);
		lenOriginToTarget = origin.distance(target);

		lastMove = millis();
	}

	abstract void affectPlayer(Player affectedPlayer);

	private bool hasReachedTarget() {
		if (location.distance(origin) >= lenOriginToTarget) {
			return true;
		}
		return false;
	}

	protected void die() {
		removalFlag = true;
	}

	override void tick(Server game) {
		if (removalFlag) {
			return;
		}

		long currentTime = millis();
		long dt = currentTime - lastMove;

		foreach (player; game.players) {
			if (player == caster) {//skip the caster of this spell
				continue;
			}

			if (player.location.distance(location) <= radius + CONFIG.playerRadius) {
				affectPlayer(player);
				die();
				return;
			}
		}

		location.moveTowards(target, speed * dt);
		lastMove = currentTime;

		if (this.hasReachedTarget || location.x < 0 || location.y < 0 || location.x > game.getMapSize || location.y > game.getMapSize) {
			die();
		}
	}
}

class FireSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.fire, 500);

	private ushort damage = 100;

	override string humanReadableEffect() {
		import std.conv;
		return "Affected player gets -" ~ damage.to!string ~ " health";
	}

	override void initialize() {
		super.initialize();
		radius = 10;
		range = 700;
		speed = 1;
	}

	override void affectPlayer(Player affectedPlayer) {
		affectedPlayer.doDamage(damage);
	}
}

class TeleportSpell : ProjectileSpell {
	mixin registerSpell!(SpellName.teleport, 7000);

	override string humanReadableEffect() {
		return "Teleports your player to its location when it either reaches its target or hits another player";
	}

	override void initialize() {
		super.initialize();
		radius = 10;
		range = 600;
		speed = 0.8;
	}

	override void affectPlayer(Player affectedPlayer) {}

	override void die() {
		caster.location.moveTo(location);
		super.die();
	}
}
