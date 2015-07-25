/// We want to be good citizen, check battery usage on the device
if(navigator.getBattery)
{
	navigator.getBattery()
	.then(function(battery) {
		/// If the battery level is below a certain percent, lets switch off view transitions entirely
		if(battery.level < 0.2)
		{
			Choreo.isDisabled = true;
			
			var banner = document.createElement('aside');
			banner.className = 'banner low-battery';
			banner.innerHTML = '<button class="close">x</button>We have detected that your battery is below 20% and therefore optimised the web app for efficiency';
			document.body.appendChild(banner);
		}
		
		/// We could also alternatively load a specialised stylesheet for low battery usage (E.g. disable text-shadow, box-shadow and filters)
	});
	
	/// Note: By the time the promise kicks in, the view transition for the home screen may have happened already
}

/// The ability above to hack/control Choreography globally might prove really useful
/// E.g. providing some accessibility features for the user:
/// http://www.alphr.com/apple/1001057/why-apple-s-next-operating-systems-are-already-making-users-sick



/// Setup our default preset
Choreo.define('default', Choreo.Preset.fade);


/// Define animation for our introduction view
Choreo.define('article.home', {
	/// Just before anything happens at all, lets do some setup
	pre: function(cache) {
		cache.header = this.to.querySelector('header');
		cache.content = this.to.querySelector('main');
		cache.nav = this.to.querySelector('nav');
		this.to.style.opacity = 0;
	},
	
	/// Creating our animation using the Web Animation API
	constructor: function(cache) {
		return new GroupEffect([
			Choreo.Animate.fade(this.to, 'in', {
				duration: 300,
				fill: 'both'
			}),
			
			new KeyframeEffect(cache.header, [
				{ opacity: 0, transform: 'translateY(-30px)' },
				{ opacity: .2, transform: 'translateY(-15px)' },
				{ opacity: 1, transform: 'translateY(0px)' }
			], {
				delay: 250,
				duration: 500,
				fill: 'both',
				easing: Choreo.Physics.easeOut(200)
			}),
			
			Choreo.Animate.step(cache.nav.children, [
				{ opacity: 0, transform: 'scale(0.9)' },
				{ opacity: 1, transform: 'scale(1)' }
			], {
				origin: 'left top',
				delay: 700,
				duration: 500,
				stepMult: 2,
				fill: 'both',
				easing: 'cubic-bezier(.11,.57,.54,1.4)'
			})
		]);
	},
	
	/// Exit is mainly for doing cleanup when having finished an animation
	exit: function(cache) {
		this.to.style.opacity = null;
	}
});


/// They are really truly just CSS selectors, so we can use commas for multiple selections
// Choreo.define({ from: 'article.home', to: 'article.why, article.docs, article.downoad' }, Choreo.Preset.fade);



Choreo.define({ from: 'article.home', to: 'article:not(.home)' }, {
	constructor: function(cache) {
		cache.nav = this.from.querySelector('nav');
		cache.tapped = this.from.querySelector('.tile[data-view="article.' + this.to.className.replace('view ', '') + '"]');
		cache.tiles = Array.prototype.slice.call(this.from.querySelectorAll('.tile'));
		cache.tiles.splice(cache.tiles.indexOf(cache.tapped), 1);
		cache.fromHeader = this.from.querySelector('header');
		cache.toHeader = this.to.querySelector('header');
		
		this.to.style.top = window.scrollTop() + 'px';
		
		var tappedRect = cache.tapped.getBoundingClientRect();
		var headerRect = cache.toHeader.getBoundingClientRect();
		var delta = {
			left: (headerRect.left + headerRect.width*.5) - (tappedRect.left + tappedRect.width*.5),
			top: (headerRect.top + headerRect.height*.5) - (tappedRect.top + tappedRect.height*.5),
			width: headerRect.width / tappedRect.width,
			height: headerRect.height/  tappedRect.height
		};
		
		this.to.style.opacity = 0;
		this.to.style.zIndex = 2;
		cache.tapped.style.color = 'transparent';
		
		return new GroupEffect([
			
			/// Choreo.Physics.spring ...?
			/// Maybe wrap KeyframeEffect into a player and seek with custom interpolation? :)
		(function() { var kf = 
			
			new KeyframeEffect(this.to, [
				{ opacity: 0 },
				{ opacity: 1 }
			], {
				delay: 600,
				duration: 300,
				fill: 'both'
			})
			
		kf.onsample = function(t, effect, animation) {
			console.log(t)
		};
		return kf; }).bind(this)(),
			
			Choreo.Animate.fade(cache.fromHeader, 'out', {
				duration: 100,
				fill: 'both'
			}),
			
			Choreo.Animate.evade(cache.tapped, cache.tiles, function(element) {
				return new KeyframeEffect(element, [
					{ opacity: 1, transform: 'translate(0px, 0px) scale(1)' },
					{ opacity: 0, transform: 'translate(' + (this.direction.x*40) + 'px, ' + (this.direction.y*40) + 'px) scale(0.9)'}
				], {
					duration: 300,
					fill: 'both',
					easing: 'ease-in'
				});
			}),
			
			new KeyframeEffect(cache.tapped, [
				{ transform: 'translate(0px, 0px) scale(1, 1)' },
				{ transform: 'translate(' + delta.left + 'px, ' + delta.top + 'px) scale(' + delta.width + ', ' + delta.height + ')' }
			], {
// 				delay: 200,
				duration: 600,
				fill: 'both',
				easing: 'cubic-bezier(.74,-0.21,.45,1.09)'
// 				easing: Choreo.Physics.easeOut(150)
			})
		], { fill: 'both' });
	},
	
	exit: function(cache) {
		var relativeScroll = this.to.getBoundingClientRect().top;
		
		cache.tapped.style.color = null;
		this.to.style.opacity = null;
		this.to.style.top = null;
		this.to.style.zIndex = null;
		
		window.scrollTop(-relativeScroll);
	}
});





// Choreo.define({ from: 'article.home', to: 'article.why' }, Choreo.Preset.fade);



/// Kick off application with our first view
Choreo.graph('article.home');


/// Catching page-to-page interaction
var currentView = 'article.home';
function onDataView(event) {
	var interactive = event.target.closest('a, button');
	if(!interactive || !interactive.matches('[data-view]')) return;
	
	event.preventDefault();
	
	interactive.classList.add('active');
	
	var view = interactive.dataset.view;
	
	// Google Analytics present? Then track the pageview
	if(window.ga)
	{
		var element = document.querySelector(view);
		var title = element.querySelector('h1');
		title = title? title.textContent : null;
		
		ga('send', 'pageview', {
			'page': '/' + view.replace('article.', ''),
			'title': title || ''
		});
	}
	
	Choreo.graph(currentView, view);
	currentView = view;
	interactive.classList.remove('active');
	interactive.blur();
}

document.addEventListener('mouseup', onDataView);
document.addEventListener('touchend', onDataView);



function onCloseBanner(event) {
	if(!event.target.matches('aside.banner button.close')) return;
	event.preventDefault();
	
	var banner = event.target.closest('aside.banner');
	banner.parentNode.removeChild(banner);
}

document.addEventListener('mouseup', onCloseBanner);
document.addEventListener('touchend', onCloseBanner);





/// Utility function to set/get the scrollTop cross-browser (read: webkit is buggy)
/// see: https://dev.opera.com/articles/fixing-the-scrolltop-bug/
/// (I tried to use document.scrollingElement, but had no luck? Is it because I have `overflow-y: scroll;` explicitly on <body>?)
window.scrollTop = function (top) {
	if(arguments.length) { document.documentElement.scrollTop = top; document.body.scrollTop = top; }
	else return document.documentElement.scrollTop || document.body.scrollTop;
};


