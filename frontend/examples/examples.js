Choreo.Settings.noLayout = 'class'; // class-based hiding of views
Choreo.Settings.noPaint = 'class';

Choreo.define({
	from: null,
	to: 'article.examples'
}, function() {
	var header = this.to.querySelector('header.illustrious');
	var items = this.to.querySelectorAll('header.illustrious, a.tile, section.examples > h2, section.examples > p');
	
	return Choreo.Animate.evade(header, items, function(element) {
		return new KeyframeEffect(element, [
			{ opacity: 0, transform: 'translate3d(' + (this.direction.x*20) + 'px, ' + (this.direction.y*20) + 'px, 0px) scale(0.9)' },
			{ opacity: 1, transform: 'translate3d(0px, 0px, 0px) scale(1)' }
		], {
			delay: this.distance*0.8,
			duration: 400,
			fill: 'both',
			easing: 'cubic-bezier(.33,.55,.46,1.3)'
		});
	});
});


document.addEventListener('DOMContentLoaded', function(event) {
	Choreo.graph('article.examples');
});























