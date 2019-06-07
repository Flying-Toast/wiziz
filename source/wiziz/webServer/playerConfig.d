module wiziz.webServer.playerConfig;

///Holds information that is needed to create a player
class PlayerConfig {
	immutable string nickname;

	uint socketId;

	this(string nickname, uint socketId) {
		this.nickname = nickname;
		this.socketId = socketId;
	}
}
