module sorcerio.gameServer.input;

import sorcerio.gameServer.point;
import sorcerio.gameServer.config;

import std.json;

///a class to make it easier to handle client input, which comes in as JSON
class Input {
	Point facing;
	immutable bool moveUp;
	immutable bool moveDown;
	immutable bool moveLeft;
	immutable bool moveRight;
	immutable ubyte dt;
	immutable bool isCasting;
	immutable ubyte selectedItemIndex;
	immutable bool hasChosenUnlock;
	immutable byte chosenUnlockIndex;

	this(string json) {
		JSONValue j = json.parseJSON();
		facing = new Point(j["facing"]["x"].integer, j["facing"]["y"].integer);

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
	}
}
