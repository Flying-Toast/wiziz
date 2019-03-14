///spell implementations
module sorcerio.gameServer.spells;

public import sorcerio.gameServer.spell;
import sorcerio : millis;
import sorcerio.gameServer.point;
import sorcerio.gameServer.server;
import sorcerio.gameServer.player;

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

	override void tick(Server game) {
		if (removalFlag) {
			return;
		}

		long currentTime = millis();
		long dt = currentTime - lastMove;

		//TODO: check collisions here

		location.moveTowards(target, speed * dt);
		lastMove = millis();

		if (this.hasReachedTarget) {
			removalFlag = true;
		}
	}
}
