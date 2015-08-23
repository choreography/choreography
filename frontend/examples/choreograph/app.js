tap('article.a button.rounded', function(event) {
	event.target.classList.add('tapped');
	Choreo.graph('article.a', 'article.b');
	event.target.classList.remove('tapped');
});

Choreo.define({ from: 'article.a', to: 'article.b' }, function() {
	var tapped = this.from.querySelector('button.tapped');
	var fromHeader = this.from.querySelector('header');
	var toHeader = this.to.querySelector('header');
	
	var tappedRect = tapped.getBoundingClientRect();
	var headerRect = toHeader.getBoundingClientRect();
	var headerCenter = {
		x: headerRect.left + headerRect.width*.5,
		y: headerRect.top + headerRect.height*.5
	};
	var tapCenter = {
		x: tappedRect.left + tappedRect.width*.5,
		y: tappedRect.top + tappedRect.height*.5
	};
	var delta = {
		x: headerCenter.x - tapCenter.x,
		y: headerCenter.y - tapCenter.y
	};
	
	return new GroupEffect([
		new KeyframeEffect(fromHeader, [
			{ opacity: 1 },
			{ opacity: 0 }
		], { duration: 300, fill: 'both' }),
		
		new KeyframeEffect(
			tapped,
			Choreo.Animate.quadraticCurve(
				{ x: 0, y: 0 },
				{ x: delta.x, y: 0 },
				{ x: delta.x, y: delta.y },
				14
			),
			{ duration: 400, fill: 'both', easing: 'ease-out' }
		),
		
		new KeyframeEffect(tapped, [
			{ color: 'white' },
			{ color: 'transparent' }
		], { duration: 100, fill: 'both' }),
		
		Choreo.Animate.step(this.from.querySelectorAll('button:not(.tapped)'), function(options) {
			return [
				{ opacity: 1, transform: 'scale(1) translate(0px, 0px)' },
				{ opacity: 0, transform: 'scale(0.4) translate('
					+ (this.delta.x/this.distance)*50*(120/this.distance) + 'px,'
					+ (this.delta.y/this.distance)*50*(120/this.distance) + 'px)'
				}
			]
		}, {
			origin: tapCenter,
			duration: 300,
			stepMult: 2,
			fill: 'both',
			easing: 'cubic-bezier(.11,.57,.54,1.4)'
		}),
		
		
		new KeyframeEffect(this.to, [
			{ opacity: 0 },
			{ opacity: 1 }
		], { duration: 0, delay: 400, fill: 'both' }),
		
		(new Choreo.Revealer(toHeader, {
			shape: 'circle',
			from: 'nothing',
			to: 'normal',
// 			position: headerCenter,
			parent: this.to,
			
			duration: 600,
			delay: 400,
			easing: 'ease-in-out'
		})).effect
		

		/*
			The following doesn't seem to work, I wonder why?
		
		(new Choreo.Revealer(this.to, {
			shape: 'circle',
			from: 'nothing',
			to: 'normal',
			position: tapCenter,

			duration: 600,
			delay: 300,
			easing: 'ease-in-out'
		})).effect
		*/
	], { fill: 'both' });
});





