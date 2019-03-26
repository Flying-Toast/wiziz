module sorcerio.gameServer.input;

import sorcerio.gameServer.point;

import std.json;

///a class to make it easier to handle client input, which comes in as JSON
class Input {
	Point facing;
	immutable bool moveUp;
	immutable bool moveDown;
	immutable bool moveLeft;
	immutable bool moveRight;

	this(string json) {
		JSONValue j = json.parseJSON();
		facing = new Point(j["movement"]["facing"]["x"].integer, j["movement"]["facing"]["y"].integer);

		moveUp = j["movement"]["keys"]["u"].boolean;
		moveDown = j["movement"]["keys"]["d"].boolean;
		moveLeft = j["movement"]["keys"]["l"].boolean;
		moveRight = j["movement"]["keys"]["r"].boolean;
	}
}
