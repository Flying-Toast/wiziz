module sorcerio.webServer.messageQueue;

shared class MessageQueue {
	private string[][uint] queue;

	///checks if there is a message available in the queue for `socketId`.
	bool messageAvailable(uint socketId) {
		return (socketId in queue) && queue[socketId].length > 0;
	}

	///appends `message` to the queue for `socketId`.
	void queueMessage(uint socketId, string message) {
		queue[socketId] ~= message;
	}

	///pops the next message from `socketId` off the queue and returns it.
	string nextMessage(uint socketId) {
		import std.algorithm.mutation;

		string message = queue[socketId][0];
		queue[socketId] = queue[socketId].remove(0);
		return message;
	}

	///removes `socketId`'s queue
	void removeSocket(uint socketId) {
		queue.remove(socketId);
	}
}
