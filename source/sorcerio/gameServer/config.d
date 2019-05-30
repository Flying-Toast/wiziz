///Various configuration settings
module sorcerio.gameServer.config;


///The default nickname if one isn't provided
enum defaultNickname = "Unnamed Sorcerer";

///Maximum number of characters allowed in a player's nickname
enum ubyte maxNameLength = 15;

///the default player speed in pixels/millisecond
enum float defaultPlayerSpeed = 1.0 / 6.0;

///The collision radius of players
enum ubyte playerRadius = 65;

///
enum long playerStartHealth = 1000;

///the maximum players allowed in a single Server
enum ushort maxPlayers = 100;

///
enum int minMapSize = 3000;

///
enum int maxMapSize = 20000;

///the delay, in milliseconds, between updates being sent to clients
enum long updateInterval = 17;

///the delay, in milliseconds between iterations of the physics loop
enum long physicsInterval = 10;

///the maximum dt to trust from the client
enum ubyte maxInputDT = 40;

///millis between ticks of the master loop
enum ubyte masterLoopInterval = 2;

///how many slots are in a player's inventory
enum ubyte inventorySize = 4;

///the maximum number of socket connect/disconnect messages to receive per server per master tick
enum ubyte maxConnectionMessagesPerServer = 10;

///the maximum number of inputs to process per player per physics tick
enum ubyte maxInputsPerTick = 10;
