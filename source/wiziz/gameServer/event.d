module wiziz.gameServer.event;

import wiziz : millis;
import wiziz.gameServer.server;

///
final class EventManager {
	private static Event[] events;

	///calls `callback` after `delay` millis.
	static void registerEvent(long delay, void delegate(Server) callback) {
		events ~= new Event(millis() + delay, callback);
	}

	///Fire the events that are ready
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
		immutable long fireTime;///millis timestamp at which to fire the event
		void delegate(Server) callback;
		bool dead;
	}

	///if the event is done and can be removed from the EventManager
	bool removalFlag() {
		return dead;
	}

	/**
	 Fires the event if it is ready.

	Params:
		currentTime = the current timestamp at the time of the tick
		game = the current game state
	*/
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
