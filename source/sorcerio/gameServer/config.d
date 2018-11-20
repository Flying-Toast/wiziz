module sorcerio.gameServer.config;

import sorcerio;

immutable struct CONFIG {
	static string defaultNickname = "Unnamed Sorcerer";
	static ubyte maxNameLength = 15;

	static float defaultPlayerSpeed = 1.0 / 4.5;///the default player speed in pixels/millisecond

	static ushort maxPlayers = 100;///the maximum players allowed in a single Server

	static int minMapSize = 3000;
	static int maxMapSize = 20000;
	
	static long updateInterval = 100;///the delay, in milliseconds, between updates being sent to clients
	static long physicsInterval = 10;///the delay, in milliseconds between iterations of the physics loop
}
