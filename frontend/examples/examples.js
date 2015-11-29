Choreo.Settings.noLayout = 'class'; // class-based hiding of views
Choreo.Settings.noPaint = 'class';

Choreo.define({
	from: null,
	to: 'article.examples'
}, function() {
	var header = this.to.querySelector('header.illustrious');
	var items = this.to.querySelectorAll('header.illustrious, a.tile, section.examples > h2, section.examples > p');
	
	return new SequenceEffect([
		new KeyframeEffect(this.to, [
			{ opacity: 0 },
			{ opacity: 1 }
		], 120),
		Choreo.Animate.evade({
			x: window.innerWidth/2,
			y: window.innerHeight/2
		}, items, function(element) {
			return new KeyframeEffect(element, [
				{ opacity: 0, transform: 'translate3d(' + (this.direction.x*40) + 'px, ' + (this.direction.y*40) + 'px, 0px) scale(0.9)' },
				{ opacity: 1, transform: 'translate3d(0px, 0px, 0px) scale(1)' }
			], {
				delay: this.distance*0.4 - 100,
				duration: 600,
				fill: 'both',
				easing: 'cubic-bezier(.33,.55,.46,1.15)'
			});
		})
	]);
});



window.GoogleAnalyticsObject = 'ga';
window.ga = function() { (ga.q = ga.q || []).push(arguments) };
window.ga.l = +new Date();

document.addEventListener('DOMContentLoaded', function(event) {
	ga('create', 'UA-65315940-1', 'auto');
	ga('send', 'pageview');
	Choreo.graph('article.examples');
});























