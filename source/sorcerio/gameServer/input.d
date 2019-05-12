module sorcerio.gameServer.input;

import sorcerio.gameServer.point;
import sorcerio.gameServer.config;

import std.json;

///a class to make it easier to handle client input, which comes in as JSON
class Input {
	immutable Point facing;///The global coords of the client's cursor
	immutable bool moveUp;///if the client is pressing the up key
	immutable bool moveDown;///if the client is pressing the down key
	immutable bool moveLeft;///if the client is pressing the left key
	immutable bool moveRight;///if the client is pressing the right key
	immutable ubyte dt;///elapsed time (millis) since the client sent the previous input
	immutable bool isCasting;///if the client is casting their selected spell.
	immutable ubyte selectedItemIndex;///see Player.selectedItemIndex
	immutable bool hasChosenUnlock;///if the client made their choice from their unlocks
	immutable byte chosenUnlockIndex;///index of the chosen item in the players `unlocks`
	immutable ubyte storageSwapIndex;///index of the storage item currently being swapped, or -1 if none are being swapped

	this(string json) {
		JSONValue j = json.parseJSON();
		facing = cast(immutable) new Point(j["facing"]["x"].integer, j["facing"]["y"].integer);

		moveUp = j["keys"]["u"].boolean;
		moveDown = j["keys"]["d"].boolean;
		moveLeft = j["keys"]["l"].boolean;
		moveRight = j["keys"]["r"].boolean;

		auto rawDT = cast(ubyte) j["dt"].integer;
		if (rawDT > CONFIG.maxInputDT) {
			rawDT = CONFIG.maxInputDT;
		}
		dt = rawDT;

		isCasting = j["casting"].boolean;

		immutable rawSelectedItemIndex = cast(ubyte) j["selectedItem"].integer;
		if (rawSelectedItemIndex < CONFIG.inventorySize) {//make sure that the selected item index that was sent is not out of bounds
			selectedItemIndex = rawSelectedItemIndex;
		} else {
			selectedItemIndex = 0;
		}

		hasChosenUnlock = j["hasChosenUnlock"].boolean;
		if (hasChosenUnlock) {
			chosenUnlockIndex = cast(byte) j["chosenUnlockIndex"].integer;
		} else {
			chosenUnlockIndex = -1;
		}

		storageSwapIndex = cast(ubyte) j["storageSwapIndex"].integer;
	}
}
