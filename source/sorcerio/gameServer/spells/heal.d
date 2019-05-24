import sorcerio.gameServer.spell;
import sorcerio.gameServer.player;
import sorcerio.gameServer.server;
import sorcerio.gameServer.event;
import sorcerio.gameServer.spells.base.self;

class HealSpell : SelfSpell {
	mixin registerSpell!(SpellName.heal, 15000);

	private {
		enum ubyte healPercent = 30;///the percent of the caster's lost health to heal
		enum ushort healInterval = 1000;///how long between partial heals
		enum ubyte healTimes = 10;///how many times the health partially increases before reaching the final amount
	}

	override string humanReadableEffect() {
		import std.conv;
		return "Heals you " ~ healPercent.to!string ~ "% closer to full health";
	}

	override void affect() {
		immutable healthDiff = caster.maxHealth - caster.health;
		immutable healAmount = healthDiff * healPercent / 100;
		for (uint i = 0; i < healInterval * healTimes; i += healInterval) {
			EventManager.registerEvent(i, delegate void (Server) {
				caster.health += healAmount / healTimes;
			});
		}
	}
}
