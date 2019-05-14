module sorcerio.gameServer.config;

import sorcerio;

///Various configuration settings
immutable struct CONFIG {
	static enum string defaultNickname = "Unnamed Sorcerer";///The default nickname if one isn't provided
	static enum ubyte maxNameLength = 15;///Maximum number of characters allowed in a player's nickname

	static enum float defaultPlayerSpeed = 1.0 / 6.5;///the default player speed in pixels/millisecond
	static enum ubyte playerRadius = 65;///The collision radius of players
	static enum long playerStartHealth = 1000;

	static enum ushort maxPlayers = 100;///the maximum players allowed in a single Server

	static enum int minMapSize = 3000;
	static enum int maxMapSize = 20000;

	static enum long updateInterval = 100;///the delay, in milliseconds, between updates being sent to clients
	static enum long physicsInterval = 10;///the delay, in milliseconds between iterations of the physics loop
	static enum ubyte maxInputDT = 20;///the maximum dt to trust from the client
	static enum ubyte masterLoopInterval = 5;///millis between ticks of the master loop

	static enum ubyte inventorySize = 4;///how many slots are in a player's inventory
}
