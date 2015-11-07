/// Initialise Choreography to use class-based states
Choreo.Settings.noLayout = 'class'; // will use `.no-layout`
Choreo.Settings.noPaint = 'class'; // `.no-paint`



/// Register our CTA button
function onCheck(event) {
	event.preventDefault();
	
	/// Switch UI state (article.a to article.b)
	Choreo.graph('article.a', 'article.b');
}

function onChecked(event) {
	event.preventDefault();
	
	/// Switch UI state (article.b to article.a)
	Choreo.graph('article.b', 'article.a');
}

var cta = document.querySelector('article.a button.cta');
cta.addEventListener('mousedown', onCheck);
cta.addEventListener('touchend', onCheck);

var cta = document.querySelector('article.b button.cta');
cta.addEventListener('mousedown', onChecked);
cta.addEventListener('touchend', onChecked);





/// For any animations between these two views
Choreo.define({
	from: 'article.a',
	to: 'article.b'
}, function() {
	/// We'll return a Web Animations API friendly effect
	var cta = this.to.querySelector('button.cta');
	var ctaBox = cta.getBoundingClientRect();
	
	/// Create reveal animation
	var revealer = new Choreo.Revealer(this.to, {
		shape: 'circle',
		from: ctaBox.width,			// From the diameter of the CTA
		to: 'everything',			// to cover the full view (this.to)
		parent: this.from,			// we attach it to our starting view
		position: {					// Offset it to the center of the CTA
			x: ctaBox.left + ctaBox.width*.5,
			y: (this.isReverse? this.to : this.from).scrollTop + ctaBox.top + ctaBox.height*.5
				// account for the current page scroll affecting calculated position
		},
// 		background: 'hsl(120, 90%, 40%)',
		
		duration: 200 + (window.innerHeight*.2),
		easing: 'ease-in'
	});
	revealer.proxy.classList.remove('no-paint');
	Array.prototype.slice.call(revealer.proxy.querySelectorAll('header.upfront, em.counter, footer.credit'))
	.forEach(function(element) {
		element.classList.add('no-paint');
	});
	
	/// Make sure to normalise page scrolls from and to
	if(this.isReverse)
		this.from.scrollTop = revealer.proxy.scrollTop = this.to.scrollTop;
	else
		this.to.scrollTop = revealer.proxy.scrollTop = this.from.scrollTop;
	
	/// Return effect
	return new GroupEffect([
		revealer.effect,

		Choreo.Animate.evade(cta, this.from.querySelectorAll('header.upfront, em.counter'), function(element) {
			return new KeyframeEffect(element, [
				{ opacity: 1, transform: 'translate3d(0px, 0px, 0px) scale(1)' },
				{ opacity: 0, transform: 'translate3d(' + (this.direction.x*20) + 'px, ' + (this.direction.y*20) + 'px, 0px) scale(0.9)' }
			], {
// 				delay: this.distance*0.2,
				duration: 200,
				fill: 'both',
				easing: 'cubic-bezier(.33,.55,.46,1.3)'
			});
		}),
		
		Choreo.Animate.evade(cta, this.to.querySelectorAll('header.upfront, em.counter'), function(element) {
			return new KeyframeEffect(element, [
				{ opacity: 0, transform: 'translate3d(' + (-this.direction.x*20) + 'px, ' + (-this.direction.y*20) + 'px, 0px) scale(0.9)' },
				{ opacity: 1, transform: 'translate3d(0px, 0px, 0px) scale(1)' }
			], {
				delay: 200 + (window.innerHeight*.2), // + this.distance*0.2,
				duration: 200,
				fill: 'both',
				easing: 'cubic-bezier(.33,.55,.46,1.3)'
			});
		})
	]);
});
