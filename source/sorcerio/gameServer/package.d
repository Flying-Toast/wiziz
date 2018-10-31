module sorcerio.gameServer;

public import sorcerio.gameServer.startGameServer;
public import sorcerio.gameServer.server;
public import sorcerio.gameServer.player;
public import sorcerio.gameServer.config;
public import sorcerio.gameServer.point;
public import sorcerio.gameServer.serverManager;

import core.time;
long millis() {
	return ticksToNSecs(MonoTime.currTime.ticks) / 1000000;
}
