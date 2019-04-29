module sorcerio.gameServer.event;

import sorcerio : millis;
import sorcerio.gameServer.server;

///
final class EventManager {
	private static Event[] events;

	static void registerEvent(long fireTime, void delegate(Server) callback) {
		events ~= new Event(fireTime, callback);
	}

	static void tick(Server game) {
		immutable long currentTime = millis();

		for (size_t i = events.length; i-- > 0;) {//loop backwards so items can be removed from within the loop
			auto event = events[i];

			if (event.removalFlag) {
				import std.algorithm.mutation : remove;

				events = events.remove(i);
				continue;
			}

			event.tick(currentTime, game);
		}
	}
}

///A wrapper that contains a timestamp and a callback function
private final class Event {
	private {
		immutable long fireTime;///Time at which that the spell should be fired
		void delegate(Server) callback;
		bool dead;
	}

	bool removalFlag() {
		return dead;
	}

	void tick(long currentTime, Server game) {
		if (dead) {
			return;
		}

		if (currentTime >= fireTime) {
			callback(game);
			dead = true;
		}
	}

	this(long fireTime, void delegate(Server) callback) {
		this.fireTime = fireTime;
		this.callback = callback;
	}
}
