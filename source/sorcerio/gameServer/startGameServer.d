module sorcerio.gameServer.startGameServer;

import sorcerio;
import sorcerio.webServer.messageQueue;

import std.concurrency;
import vibe.vibe : WebSocket;
import core.time;
import core.thread;

void startGameServer(shared MessageQueue queue) {
	version (Posix) {
		scope (exit) {
			import core.stdc.stdlib;
			_Exit(EXIT_FAILURE);
		}
	}

	version (dubTest) {//make sure that all spells are implemented
		import std.traits;
		import core.exception;
		import std.stdio;
		import std.conv;

		bool error = false;
		foreach (name; [EnumMembers!SpellName]) {
			//make sure that all spells in are registered:
			try {
				SpellFactory.getCoolDownTime(name);
			} catch (RangeError e) {
				writeln("Spell not registered with SpellFactory: ", name);
				//error = true; TODO: uncomment this once all spells are implemented
			}

			//make sure that all spells have images for their inventory slot:
			bool fileExists(string path) {
				import std.file;
				if (path.exists && path.isFile) {
					return true;
				}
				return false;
			}

			string inventoryItemPath = "public/media/images/" ~ name.to!string ~ "Spell.png";
			if (!fileExists(inventoryItemPath)) {
				writeln("'", name.to!string, "' spell does not have an inventory image at ", inventoryItemPath);
				error = true;
			}

			//make sure that all spells have sounds:
			string baseSoundPath = "public/media/sounds/" ~ name.to!string ~ "Spell.";
			if (!fileExists(baseSoundPath~"ogg")) {
				writeln("'", name.to!string, "' spell does not have a sound at ", baseSoundPath~"ogg");
				error = true;
			}

			if (!fileExists(baseSoundPath~"mp3")) {
				writeln("'", name.to!string, "' spell does not have a sound at ", baseSoundPath~"mp3");
				error = true;
			}
		}

		if (error) {
			writeln("Not all spells defined in SpellName are fully implemented (see above messages).");
			throw new Exception("Not all spells defined in SpellName are fully implemented (see above messages).");
		}
	}

	ServerManager master = new ServerManager(queue);

	while (true) {
		void receiveMessages() {
			receiveTimeout(Duration.zero,
				(shared PlayerConfig cfg) {
					master.addPlayerToServer(cast(PlayerConfig) cfg);
				},
				(uint disconnectSocketId) {
					master.removePlayerBySocketId(disconnectSocketId);
				}
			);
		}

		version (dubTest) {//for CI - don't fail if owner thread terminates
			try {
				receiveMessages();
			} catch (OwnerTerminated e) {
				import core.stdc.stdlib;
				_Exit(EXIT_SUCCESS);
			}
		} else {//normal behavior:
			receiveMessages();
		}

		master.tick();
		Thread.sleep(dur!"msecs"(5));
	}
}
