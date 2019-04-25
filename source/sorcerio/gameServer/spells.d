///spell implementations
module sorcerio.gameServer.spells;

public import sorcerio.gameServer.spell;
import sorcerio : millis;
import sorcerio.gameServer.point;
import sorcerio.gameServer.server;
import sorcerio.gameServer.player;
import sorcerio.gameServer.config;

import std.json;

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

abstract class SplashSpell : ProjectileSpell {
	///whether the spell has splashed. When it hasn't splashed, the spell behaves like a ProjectileSpell.
	private bool splashed;

	protected {
		ushort explosionRadius;///how big the effectArea is when exploded
		string color;///color of the explosion area (can be any valid CSS color, but use hex if possible)
	}

	///final override this to 'lock' it (because effects are applied using different logic than ProjectileSpells)
	final override void affectPlayer(Player player) {}

	///Affect `player` with the SplashSpell's effect.
	abstract void splashAffect(Player player);

	override void die() {
		if (!splashed) {
			splashed = true;
		} else {
			super.die();
		}
	}

	override void tick(Server game) {
		if (!splashed) {
			super.tick(game);
		} else {//SplashSpell tick:
			foreach (player; game.players) {
				if (player.location.distance(location) <= explosionRadius + CONFIG.playerRadius) {
					splashAffect(player);
				}
			}
		}
	}

	override JSONValue JSONof() {
		auto json = super.JSONof;

		if (splashed) {//SplashSpell specific JSON
			json["renderFunction"] = "splashSpell";
			json["radius"] = explosionRadius;
			json["color"] = color;
		}

		return json;
	}
}

abstract class SelfSpell : Spell {
	override void initialize() {}

	override JSONValue JSONof() {
		JSONValue json = JSONValue();

		json["renderFunction"] = "nothing";

		return json;
	}

	override void tick(Server game) {
		if (removalFlag) {
			return;
		}

		affect();
		die();
	}

	abstract void affect();//affects the caster with the spells effect

	protected void die() {
		removalFlag = true;
	}
}

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
		affectedPlayer.doDamage(damage);
	}
}

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

class HealSpell : SelfSpell {
	mixin registerSpell!(SpellName.heal, 15000);

	private enum ubyte healPercent = 30;//the percent of the caster's lost health to heal

	override string humanReadableEffect() {
		import std.conv;
		return "Heals you " ~ healPercent.to!string ~ "% closer to full health";
	}

	override void affect() {
		immutable healthDiff = caster.maxHealth - caster.health;
		caster.health += healthDiff * healPercent / 100;
	}
}
