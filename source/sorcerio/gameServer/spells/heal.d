import sorcerio.gameServer.spell;
import sorcerio.gameServer.player;
import sorcerio.gameServer.spells.base.self;

class HealSpell : SelfSpell {
	mixin registerSpell!(SpellName.heal, 15000);

	private enum ubyte healPercent = 30;///the percent of the caster's lost health to heal

	override string humanReadableEffect() {
		import std.conv;
		return "Heals you " ~ healPercent.to!string ~ "% closer to full health";
	}

	override void affect() {
		immutable healthDiff = caster.maxHealth - caster.health;
		caster.health += healthDiff * healPercent / 100;
	}
}
