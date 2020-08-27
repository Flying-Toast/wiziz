///Various configuration settings
module wiziz.gameServer.config;


///The default nickname if one isn't provided
enum defaultNickname = "Unnamed Wizard";

///Maximum number of characters allowed in a player's nickname
enum ubyte maxNameLength = 16;

///the default player speed in pixels/millisecond
enum float defaultPlayerSpeed = 1.0 / 4.8;

///when a player levels up, their speed gets multiplied by this
enum double levelUpSpeedMultiplier = 0.94;

///multiplying player's speed by levelUpSpeedMultiplier cannot make the player slower than this
enum float minPlayerSpeed = defaultPlayerSpeed / 1.5;

///The collision radius of players
enum ubyte playerRadius = 65;

///
enum long playerStartHealth = 1000;

///the maximum players allowed in a single Server
enum ushort maxPlayers = 15;

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

///Max # of bots per server
enum uint numBots = 3;
