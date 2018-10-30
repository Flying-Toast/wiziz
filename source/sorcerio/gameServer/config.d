module sorcerio.gameServer.config;

import sorcerio;

immutable struct CONFIG {
	static string defaultNickname = "Unnamed Sorcerer";
	static ubyte maxNameLength = 15;

	static ushort maxPlayers = 100;///the maximum players allowed in a single Server
	static ushort maxServers = 5;///the maximum number of Servers allowed in a ServerManager

	static int minMapSize = 3000;
	static int maxMapSize = 20000;
}
