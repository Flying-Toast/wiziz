module sorcerio.gameServer.config;

import sorcerio;

immutable struct CONFIG {
	static enum string defaultNickname = "Unnamed Sorcerer";
	static enum ubyte maxNameLength = 15;

	static enum float defaultPlayerSpeed = 1.0 / 4.5;///the default player speed in pixels/millisecond

	static enum ushort maxPlayers = 100;///the maximum players allowed in a single Server

	static enum int minMapSize = 3000;
	static enum int maxMapSize = 20000;

	static enum long updateInterval = 100;///the delay, in milliseconds, between updates being sent to clients
	static enum long physicsInterval = 10;///the delay, in milliseconds between iterations of the physics loop
	static enum ubyte inventorySize = 5;///how many slots are in a player's inventory
}
