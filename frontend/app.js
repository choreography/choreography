document.addEventListener('DOMContentLoaded', function lastUserVisit (event) {
	var lastVisit = +sessionStorage.getItem('last-visit') || +localStorage.getItem('last-visit');
	localStorage.setItem('last-visit', +new Date);
	sessionStorage.setItem('last-visit', lastVisit);
	if(!lastVisit) return;
	
	function timeSince(date) {
		var seconds = Math.floor((new Date() - date) / 1000);
		var intervalType;

		var interval = Math.floor(seconds / 31536000);
		if (interval >= 1) intervalType = 'year';
		else {
			interval = Math.floor(seconds / 2592000);
			if (interval >= 1) intervalType = 'month';
			else {
				interval = Math.floor(seconds / 86400);
				if (interval >= 1) intervalType = 'day';
				else {
					interval = Math.floor(seconds / 3600);
					if (interval >= 1) intervalType = "hour";
					else {
						interval = Math.floor(seconds / 60);
						if (interval >= 1) intervalType = "minute";
						else {
							interval = seconds;
							intervalType = "second";
		}	}	}	}	}
		
		if (interval > 1 || interval === 0) intervalType += 's';
		return [interval, intervalType].join(' ');
	}

	var span = document.querySelector('span.last-visit');
	span.textContent = ['Last visit was', timeSince(lastVisit), 'ago'].join(' ');
	span.title = 'How long ago your last session with the website was. This is only to help YOU and is calculated and stored ONLY client-side with localStorage & sessionStorage.';
});




document.addEventListener('DOMContentLoaded', function SlackInviter (event) {
	/// Code adapted from the Slackin js
	if (!document.body.getBoundingClientRect || !document.body.querySelectorAll || !window.postMessage) return;
	
	function search(){
		var buttons = document.querySelectorAll('a.slack');
		if(buttons) Array.prototype.forEach.call(buttons, replace);
	}
	
	function replace(button){
		var parent = button.parentNode;
		if(!parent) return;
		
		var iframe = document.createElement('iframe');
		var iframePath = '/iframe?large';
		iframe.src = 'https://choreography-slackin.herokuapp.com' + iframePath;
		iframe.style.borderWidth = 0;
		iframe.className = '__slackin';
		
		iframe.style.width = '171px';
		iframe.style.height = '30px';
		iframe.style.visibility = 'hidden';
		
		button.visibility = 'hidden';

		parent.insertBefore(iframe, button);
		parent.removeChild(button);
		iframe.onload = function() { setup(iframe); };
	}
	
	function setup(iframe){
		var id = Math.random() * (1 << 24) | 0;
		iframe.contentWindow.postMessage('slackin:' + id, '*');
		window.addEventListener('message', function(e){
			if ('slackin-click:' + id  == e.data) showDialog(iframe);
			
			// update width
			var wp = 'slackin-width:' + id + ':';
			if (wp == e.data.substr(0, wp.length)) {
				var width = e.data.substr(wp.length);
				iframe.style.width = width + 'px';
				iframe.style.visibility = 'visible';
			}
		});
	}
	
	var showing = false;
	function showDialog(iframe){
		if (showing) return;
		showing = true;
		
		// container div
		var div = document.createElement('div');
		div.className = '__slackin';
		
		// new iframe
		var ni = document.createElement('iframe');
		ni.className = '__slackin';
		ni.style.width = '250px';
		ni.style.height = '124px';
		ni.style.borderWidth = 0;
		ni.src = iframe.src.replace(/\?.*/, '') + '/dialog';
		ni.onload = function(){
			window.addEventListener('scroll', dposition);
			window.addEventListener('resize', dposition);
			position();
		};
		
		// arrows
		var a1 = document.createElement('div');
		var a2 = document.createElement('div');
		a1.className = 'arrow';
		a2.className = 'arrow';
		
		// append
		div.appendChild(a1);
		div.appendChild(a2);
		div.appendChild(ni);
		document.body.appendChild(div);
		
		function position(){
			[div, a1, a2].forEach(function(el){
				el.style.left = '';
				el.style.right = '';
				el.style.bottom = '';
				el.style.top = '';
			});

			var divPos = div.getBoundingClientRect();
			var iframePos = iframe.getBoundingClientRect();
			var divHeight = divPos.height + 9; // arrow height

			var st = document.body.scrollTop;
			var sl = document.body.scrollLeft;
			var iw = window.innerWidth;
			var ih = window.innerHeight;
			var iframeTop = iframePos.top + st;
			var iframeLeft = iframePos.left + sl;

			// position vertically / arrows
			if (st + iframePos.bottom + divHeight > st + ih) {
				div.style.top = (iframeTop - divHeight) + 'px';
				a1.style.top = a2.style.top = '100%';

				a1.style.borderBottomColor = 'rgba(214, 214, 214, 0)';
				a2.style.borderBottomColor = 'rgba(250, 250, 250, 0)';
				a1.style.borderTopColor = '#d6d6d6';
				a2.style.borderTopColor = '#fafafa';
			} else {
				div.style.top = (iframeTop + iframePos.height + 9) + 'px';
				a1.style.bottom = a2.style.bottom = '100%';

				a1.style.borderTopColor = 'rgba(214, 214, 214, 0)';
				a2.style.borderTopColor = 'rgba(250, 250, 250, 0)';
				a1.style.borderBottomColor = '#d6d6d6';
				a2.style.borderBottomColor = '#fafafa';
			}
			
			// position horizontally
			var left = iframePos.left
			+ Math.round(iframePos.width / 2)
			- Math.round(divPos.width / 2);
			if (left < sl) left = sl;
			if (left + divPos.width > sl + iw) {
				left = sl + iw - divPos.width;
			}
			div.style.left = left + 'px';
			
			a1.style.left =
			a2.style.left = (iframeLeft - left + Math.round(iframePos.width / 2)) + 'px';
		}

		// debounced positionining
		var timer;
		function dposition(){
			clearTimeout(timer);
			timer = setTimeout(position, 100);
		}

		function hide(){
			showing = false;
			window.removeEventListener('scroll', dposition);
			window.removeEventListener('resize', dposition);
			document.body.removeChild(div);
			document.documentElement.removeEventListener('click', click, true);
		}

		function click(ev){
			if ('__slackin' != ev.target.className) {
				hide();
			}
		}

		document.documentElement.addEventListener('click', click, true);
	}
	
	search();
});




Choreo.Settings.noLayout = 'class'; // class-based hiding of views

Choreo.define({
	from: null,
	to: 'article.intro'
}, function() {
	var gloriousHeader = this.to.querySelector('header.glorious');
	var navItems = this.to.querySelectorAll('header.glorious, a.flat, iframe.__slackin, section.blurb, footer.curious');
	
	return Choreo.Animate.evade(gloriousHeader, navItems, function(element) {
		return new KeyframeEffect(element, [
			{ opacity: 0, transform: 'translate3d(' + (this.direction.x*20) + 'px, ' + (this.direction.y*20) + 'px, 0px) scale(0.9)' },
			{ opacity: 1, transform: 'translate3d(0px, 0px, 0px) scale(1)' }
		], {
			delay: this.distance*1.2,
			duration: 400,
			fill: 'both',
			easing: 'cubic-bezier(.33,.55,.46,1.14)'
		});
	});
});

Choreo.define({
	from: 'article.intro',
	to: 'article.external'
}, function() {
	var tapped = this.from.querySelector('.tapped');
	if(!tapped) return new KeyframeEffect(this.from, [
		{ opacity: 1 },
		{ opacity: 0 }
	], { duration: 250 });
	
	var cover = new Choreo.Revealer(tapped, {
		shape: 'circle',
		from: 'normal',
		to: 'everything',
		background: 'hsl(140, 50%, 100%)',
		
		duration: 400,
		fill: 'both',
		easing: 'ease-in'
	});
	
	return new GroupEffect([
		cover.effect,
		
		new KeyframeEffect(cover.proxy, [
			{ opacity: 1 }, { opacity: 0 }
		], { delay: 300, duration: 100, fill: 'both' }),
		
		new KeyframeEffect(this.to, [
			{ opacity: 0 }, { opacity: 1 }
		], { duration: 200, delay: 400, fill: 'both' })
	], { fill: 'both' });
});


document.addEventListener('DOMContentLoaded', function(event) {
	Choreo.graph('article.intro');
	
	document.addEventListener('click', function(event) {
		if(!(event.target.matches('a[href]') && !event.defaultPrevented)) return;
		event.preventDefault();

		event.target.classList.add('tapped');
		var player = Choreo.graph('article.intro', 'article.external');
		
		player.finished.then(function() {
			if('history' in window) history.pushState(null, null, location.pathname);
			location = event.target.href;
		});
	});
});


