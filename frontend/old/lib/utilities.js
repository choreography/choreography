/// Function for tappable buttons
function tapDat(element, filter, callback) {
	var listener = {
		startAt: null,
		startFrom: { x: 0, y: 0 },
		maxDist: 20,
		handleEvent: function(event) {
			if(!filter(event)) return;
			
			if(event.type === 'touchstart') {
				this.startFrom.x = event.changedTouches[0].screenX;
				this.startFrom.y = event.changedTouches[0].screenY;
			} else if(event.type === 'mousedown') {
				this.startFrom.x = event.screenX;
				this.startFrom.y = event.screenY;
			}
			
			if(event.type === 'touchstart' || event.type === 'mousedown') {
				this.startAt = +new Date;
				event.target.classList.add('is-held');
			}
			
			if(!this.startAt) return;
			
			if(event.type === 'touchmove' || event.type === 'mousemove')
			{
				var screenX, screenY;
				if(event.type === 'touchmove') {
					screenX = event.changedTouches[0].screenX;
					screenY = event.changedTouches[0].screenY;
				} else {
					screenX = event.screenX;
					screenY = event.screenY;
				}
				
				var deltaX = screenX - this.startFrom.x;
				var deltaY = screenY - this.startFrom.y;
				var dist = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
				if(dist > this.maxDist) {
					event.target.classList.remove('is-held');
					event.target.blur();
					this.startAt = null;
					return;
				}
			}
			
			if(event.type === 'touchend' || event.type === 'mouseup')
			{
				event.target.classList.remove('is-held');
				var deltaTime = +new Date - this.startAt;
				this.startAt = null;
				
				var screenX, screenY;
				if(event.type === 'touchmove') {
					screenX = event.changedTouches[0].screenX;
					screenY = event.changedTouches[0].screenY;
				} else {
					screenX = event.screenX;
					screenY = event.screenY;
				}
				
				var deltaX = screenX - this.startFrom.x;
				var deltaY = screenY - this.startFrom.y;
				var dist = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
				
				if(dist > this.maxDist) return;
				
				callback(event);
			}
		}
	};
	
	element.addEventListener('touchstart', listener);
	element.addEventListener('touchmove', listener);
	element.addEventListener('touchend', listener);
	element.addEventListener('mousedown', listener);
	element.addEventListener('mousemove', listener);
	element.addEventListener('mouseup', listener);
}

