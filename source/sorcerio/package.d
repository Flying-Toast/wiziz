module sorcerio;

import core.time;
long millis() {
	return ticksToNSecs(MonoTime.currTime.ticks) / 1000000;
}
