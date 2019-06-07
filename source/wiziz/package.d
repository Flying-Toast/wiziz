module wiziz;

import core.time;
long millis() {
	return ticksToNSecs(MonoTime.currTime.ticks) / 1000000;
}
