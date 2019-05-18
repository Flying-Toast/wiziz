module sorcerio.gameServer.spells.base.splash;

import std.json : JSONValue;

import sorcerio : millis;
import sorcerio.gameServer.spells.base.projectile;
import sorcerio.gameServer.player;
import sorcerio.gameServer.server;
import CONFIG = sorcerio.gameServer.config;

///Acts like a `ProjectileSpell`, but when it hits a player or reaches its target, it leaves an explosion area behind
abstract class SplashSpell : ProjectileSpell {
	private {
		bool splashed;///whether the spell has splashed. When it hasn't splashed, the spell behaves like a ProjectileSpell.
		long[ushort] lastAffectTimes;
		long splashTime;///timestamp that the spell splashed
	}

	protected {
		ushort explosionRadius;///how big the effectArea is when exploded
		string color;///color of the explosion area (can be any valid CSS color, but use hex if possible)
		ushort effectDelay;///(millis) minimum time between the same player being affected.
		ushort explosionTTL;///explosion time to live
	}

	///final override this to 'lock' it (because effects are applied using different logic than ProjectileSpells)
	final override void affectPlayer(Player player) {}

	///Affect `player` with the SplashSpell's effect.
	abstract void splashAffect(Player player);

	override void die() {
		if (!splashed) {
			splashed = true;
			splashTime = millis();
		} else {
			super.die();
		}
	}

	///whether the player can be affected or not (if at least effectDelay has passed since they were last affected).
	protected bool canAffectPlayer(Player player) {
		return player.id !in lastAffectTimes || millis() - lastAffectTimes[player.id] >= effectDelay;
	}

	override void tick(Server game) {
		if (removalFlag) {
			return;
		}

		if (!splashed) {
			super.tick(game);
		} else {//SplashSpell tick:
			if (millis() - splashTime >= explosionTTL) {//if time to live has elapsed, die
				die();
				return;
			}

			foreach (player; game.players) {
				if (player.location.distance(location) <= explosionRadius + CONFIG.playerRadius && canAffectPlayer(player)) {
					splashAffect(player);
					lastAffectTimes[player.id] = millis();//update the time that the player was last affected
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
