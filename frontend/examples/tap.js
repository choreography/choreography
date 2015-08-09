function tap(selector, callback) {
	var nav = {
		handleEvent: function(event) { this[event.type](event) },
		touchend: function(event) {
			if(!event.target.matches(selector)) return;
			var bbox = event.target.getBoundingClientRect();
			var touch = event.changedTouches[0];
			if(touch.screenX > bbox.left && touch.screenX < bbox.right && touch.screenY > bbox.top && touch.screenY < bbox.bottom)
				callback(event);
		},
		mouseup: function(event) {
			if(!event.target.matches(selector)) return;
			callback(event);
		}
	};
	
	document.addEventListener('touchend', nav);
	document.addEventListener('mouseup', nav);
}