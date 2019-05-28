module sorcerio.webServer.outgoingQueue;

import vibe.vibe;

import sorcerio.webServer.messageQueue;

shared class OutgoingQueue : MessageQueue {
	private ManualEvent sendEvent;

	///sends the queued messages (just queueing a message does not send it, only sendMessages() sends them)
	void sendMessages() {
		sendEvent.emit();
	}

	///waits for the send event
	void waitForSend() {
		sendEvent.wait(sendEvent.emitCount);
	}

	this() {
		sendEvent = createSharedManualEvent();
	}
}
