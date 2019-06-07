module wiziz.gameServer.spells.base.projectile;

import std.json : JSONValue;

import wiziz : millis;
import wiziz.gameServer.spell;
import wiziz.gameServer.point;
import wiziz.gameServer.server;
import wiziz.gameServer.player;
import CONFIG = wiziz.gameServer.config;

///A spell that moves towards its target and affects any player it hits on the way
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
		this.target = caster.location.dup();
		target.moveTowards(caster.facing, range);

		lenOriginToTarget = origin.distance(target);

		lastMove = millis();
	}

	override JSONValue JSONof() {
		import std.conv;

		JSONValue json = JSONValue();

		json["renderFunction"] = "projectileSpell";
		json["name"] = name.to!string;
		json["location"] = location.JSONof();

		return json;
	}

	abstract void affectPlayer(Player affectedPlayer);

	private bool hasReachedTarget() {
		return location.distance(origin) >= lenOriginToTarget;
	}

	protected void die() {
		removalFlag = true;
	}

	override void tick(Server game) {
		if (removalFlag) {
			return;
		}

		immutable currentTime = millis();
		immutable long dt = currentTime - lastMove;

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
