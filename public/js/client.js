//(function() {

window.addEventListener("load", function() {
	document.querySelector("#loading").style.display = "none";
	document.querySelector("#instructionsToggle").checked = true;
});

let playButton = document.querySelector("#playButton");

let ws;

function getGameState() {
	if (ws === undefined) {
		return "notPlaying";
	}

	if (ws.readyState === 1 || ws.readyState === 0) {
		return "playing";
	} else if (ws.readyState === 2 || readyState === 3) {
		return "notPlaying"
	}
}

playButton.addEventListener("click", function() {

	if (getGameState() === "playing") {
		return; //don't start a new game if already playing
	}

	ws = new WebSocket(`ws${(window.location.protocol==="https:")?"s":""}://${window.location.host}/ws`);

	ws.addEventListener("message", function(message) {
		console.log(message.data);
	});

});

//})();
