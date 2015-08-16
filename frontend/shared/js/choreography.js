/*
	The MIT License (MIT)
	
	Copyright (c) 2015 Martin Pitt
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
*/

var Choreo = {
	/// Properties
	Settings: {
		// This controls whether view transitions should happen at all, or just simply do instant view flipping
		isDisabled: false,
		
		noLayout: 'inline'
	},
	
	/// Here is where you start defining view transition animations
	/*
		Currently two signatures are supported,
		You can pass in an object with the { constructor: function(cache) { … }, exit: function(cache) { … } } interface
		Or you can pass in a function() { … }
		
		If you pass in a function, or a object with a constructor method, they MUST return an animation created with the Web Animation API.
		That is either a KeyframeEffect, GroupEffect or SequenceEffect. Something that can be run with document.timeline.play(…);
		
		The exit method is called upon animation completion, to allow you to clean up.
		The 'cache' argument is given to you so that you can store temporary data and pass it along to exit method, e.g. cached query selectors.
		
		An extra signature is provided to defining a 'default' view transition for ALL.
		Otherwise by default the library will only flip instantly between views.
		Common default animation to set up is cross fading.
	*/
	define: function(what, transition) {
		if(what === 'default')
		{
			this.transits.default = transition;
			return this;
		}
		
		var transit = {
			from: null,
			to: null,
			transition: transition
		};
		
		if(typeof what === 'string') transit.to = what;
		else
		{
			transit.from = what.from;
			transit.to = what.to;
		}
		
		this.transits.list.push(transit);
		
		return this;
	},
	
	/// The single most important method;  Allows you to trigger a view transition between two DOM elements
	/// 'from' is optional, so you can either call:  `Choreo.graph(from, to);`  or  `Choreo.graph(to);`
	/// 'from' and 'to' can be a CSS selector, a DOM element or null
	graph: function(from, to) {
		if(arguments.length === 1)
		{
			to = from;
			from = null;
		}
		
		var _from = from, _to = to;
		
		if(typeof to === 'string') to = document.querySelector(to);
		if(typeof from === 'string') from = document.querySelector(from);
		
		if(Choreo.Settings.isDisabled)
		{
			Choreo.Entry(from, to);
			Choreo.Exit(from, to);
			return null;
		}
		
		
		/// Find view transition
		var transition = this.transits.find(from, to);
		
		/// Otherwise check for a reversible transition
		var isReverse = false;
		if(!transition)
		{
			transition = this.transits.find(to, from);
			isReverse = true;
		}
		
		/// We haven't found a view transition yet, use a default if available
		if(!transition && this.transits.default)
		{
			transition = this.transits.default;
			isReverse = false;
		}
		
		/// Worst case, just do the minimal
		if(!transition)
		{
			Choreo.Entry(from, to);
			Choreo.Exit(from, to);
			return null;
		}
		
		
		var context = {
			// DOM elements
			from: null,
			to: null,
			
			// Original CSS selectors
			_from: null,
			_to: null,
			
			// Whether this animation is playing in reverse
			isReverse: isReverse
		};
		
		
		if(isReverse)
		{
			context.from = to;
			context._from = _to;
			context.to = from;
			context._to = _from;
		}
		else
		{
			context.from = from;
			context._from = _from;
			context.to = to;
			context._to = _to;
		}
		
		var cache = {};
		if(transition.pre) transition.pre.call(context, cache);
		
		Choreo.Entry(context.from, context.to); // (We use from/to of context to respect reversibility)
		
		var animation = (typeof transition === 'function'? transition.call(context, cache): transition.constructor.call(context, cache));
		// TODO: Test if animation is truthy/valid?
		
		Choreo.trigger('preprocess', context, animation);
		
		var player = document.timeline.play(animation);
		
		if(isReverse)
		{
			player.currentTime = player.effect.activeDuration;
			player.reverse();
		}
		
		// TODO: 'onfinish' attribute has been removed from W3C spec, switch to 'finished' Promise (wait for polyfill/browsers to catch up first a bit)
		player.finished.then(function() {
			if(transition.exit) transition.exit.call(context, cache);
			Choreo.Exit.call(player, from, to);
			player.cancel();
		});
		
		Choreo.trigger('postprocess', context, player);
		return player;
	},
	
	/// Internal abstraction layer for storing view transitions/settings
	transits: {
		default: null,
		list: [],
		
		find: function(from, to) {
			if(arguments.length === 1)
			{
				to = from;
				from = null;
			}
			
				var iter = this.list.length;
				while(iter-->0) {
					var transit = this.list[iter];
				if((to? to.matches(transit.to) : to === transit.to) && (from? from.matches(transit.from) : from === transit.from)) return transit.transition;
			}
			
			return null;
		}
	},
	
	
	/// Internal function for Entering view transitions
	/// Sets up DOM (puts them closely together; to avoid need of z-index'ing which may affect stacking context)
	/// and makes sure view containers stay in their final layouts, so you can safely do crazy stuff during your animation
	/// NOTE: This means inline styles affected will be overwritten and affected view containers will be moved in your DOM
	Entry: function entryDOM(from, to) {
		/// Show new view
		if(from && to)
		{
			var ancestor = from.parentNode;
			
			// We place the to DOM element (or common siblings) after the from DOM element, for higher natural order
			// Same ancestor?
			if(from.parentNode === to.parentNode)
			{
				from.parentNode.insertBefore(to, from.nextSibling);
			}
			
			// Get sibling ancestors then
			else
			{
				var siblings = Choreo.Utility.commonSiblings(from, to);
				siblings[0].parentNode.insertBefore(siblings[1], siblings[0].nextSibling);
			}
			
			// Need to fix ancestor as per above...
			
			/// Allow layout and then calculate it
			if(Choreo.Settings.noLayout === 'inline') to.style.display = ''; else
			if(Choreo.Settings.noLayout === 'class') to.classList.remove('no-layout');
			
			/// Get bounding boxes and prep layouts
			var fbox = from.getBoundingClientRect();
			var tbox = to.getBoundingClientRect();
			var abox = ancestor.getBoundingClientRect();
			
			/// Share layout coordinates
			to.style.position = from.style.position = 'absolute';
			to.style.top = from.style.top = (fbox.top - abox.top) + 'px';
			to.style.left = from.style.left = (fbox.left - abox.left) + 'px';
			from.style.width = fbox.width + 'px';
			from.style.height = fbox.height + 'px';
			to.style.width = tbox.width + 'px';
			to.style.height = tbox.height + 'px';
			
			ancestor.style.position = 'relative';
			ancestor.style.width = abox.width + 'px';
			ancestor.style.height = abox.height + 'px';
		}
		
		
		else if(to)
		{
			/// Allow layout
			if(Choreo.Settings.noLayout === 'inline') to.style.display = ''; else
			if(Choreo.Settings.noLayout === 'class') to.classList.remove('no-layout');
		}
	},
	
	/// Internal function for Exitting view transitions
	/// Removes inline styles
	Exit: function exitDOM(from, to, isReverse) {
		/// Just to make it absolutely clear here on what is front-facing or behind the other view
		var back = from, front = to;
		
		// TODO: Make reversable for cancelations, e.g. swap front with back?
		
		// Make front permanent, hide back
		if(back)
		{
			if(Choreo.Settings.noLayout === 'inline') back.style.display = 'none'; else
			if(Choreo.Settings.noLayout === 'class') back.classList.add('no-layout');
		}

		if(front && back)
		{
			front.style.position = '';
			front.style.top = '';
			front.style.left = '';
			front.style.width = '';
			front.style.height = '';
			
			back.style.position = '';
			back.style.top = '';
			back.style.left = '';
			back.style.width = '';
			back.style.height = '';
			
			var ancestor = front.parentNode;
			ancestor.style.position = '';
			ancestor.style.width = '';
			ancestor.style.height = '';
		}
	},
	
	
	/// Choreo.Animate.* contains all the useful functions for composing a View Transition
	Animate: {
		/// Lightweight fade in / fade out; Maybe this is unnecessary? It's too simple and hides the beauty of the Web Anim API
		fade: function(element, direction, timing) {
			var keyframes = null;
			if(direction === 'in') keyframes = [ { offset: 0, opacity: 0 }, { offset: 1, opacity: 1 } ]; else
			if(direction === 'out') keyframes = [ { offset: 0, opacity: 1 }, { offset: 1, opacity: 0 } ];
			return new KeyframeEffect(element, keyframes, timing);
		},
		
		/// Allows you to move elements to or from offscreen locations (determined by the parent that is clipping its' appearance)
		edge: function(element, direction, timing) {
			/// Get current locations of view & element
			var viewRect = Choreo.Utility.closestClip(element).getBoundingClientRect();
			var elementRect = element.getBoundingClientRect();
			
			/// We only have one syntax support at the moment, example usage: "to top", "to left bottom" or "from right"
			var match = direction.match(/(to|from) (?:(top|bottom|left|right)? ?(top|bottom|left|right)?)/);
			if(match)
			{
				direction = match[1];
				var deltaPos = { x: 0, y: 0 };
				
				if(match[2] === 'top' || match[3] === 'top') deltaPos.y = viewRect.top - elementRect.bottom;
				else if(match[2] === 'bottom' || match[3] === 'bottom') deltaPos.y = viewRect.bottom - elementRect.top;
				
				if(match[2] === 'left' || match[3] === 'left') deltaPos.x = viewRect.left - elementRect.right;
				else if(match[2] === 'right' || match[3] === 'right') deltaPos.x = viewRect.right - elementRect.left;
				
				var keyframes = direction === 'to'? [
					{ offset: 0, transform: 'translate(0px, 0px)' },
					{ offset: 1, transform: 'translate(' + deltaPos.x + 'px, ' + deltaPos.y + 'px)' }
				]: [
					{ offset: 0, transform: 'translate(' + deltaPos.x + 'px, ' + deltaPos.y + 'px)' },
					{ offset: 1, transform: 'translate(0px, 0px)' }
				];
				
				return new KeyframeEffect(element, keyframes, timing);
			}
			
			/// Otherwise, just throw an error
			else throw new Error('Syntax Error in Animation.edge!', direction);
		},
		
		/// Work in Progress; I want to be able to reveal an element from growing or shrinking from a circle (or other shape)
		reveal: function(element, options) {
			var isWrapped = false;
			var view = Choreo.Utility.closestClip(element);
			var parent = options.context? options.context.from.parentNode : view;
			var viewRect = view.getBoundingClientRect();
			var elementRect = element.getBoundingClientRect();
			var proxy = element.cloneNode(true);
			var wrapper = document.createElement('div');
			proxy.style.position = 'absolute';
			proxy.style.top = '50%';
			proxy.style.left = '50%';
			proxy.style.width = elementRect.width + 'px';
			proxy.style.height = elementRect.height + 'px';
			proxy.style.margin = '0';
			proxy.style.willChange = 'transform';
			wrapper.style.position = 'absolute';
			if(options.occlude) wrapper.style.overflow = 'hidden';
			wrapper.style.borderRadius = '50%';
			if(options.background) wrapper.style.background = options.background;
			wrapper.style.willChange = 'transform';
			wrapper.appendChild(proxy);
			
			var minDiameter = Math.sqrt(elementRect.width*elementRect.width + elementRect.height*elementRect.height);
			var maxDiameter = (function(a, b) {
				var width = a.width + 2*Math.abs((a.left + a.width*.5) - (b.left + b.width*.5));
				var height = a.height + 2*Math.abs((a.top + a.height*.5) - (b.top + b.height*.5));
				var centerToEdge = Math.sqrt(width*width + height*height);
				return centerToEdge;
			})(viewRect, elementRect);
			wrapper.style.width = wrapper.style.height = minDiameter + 'px';
			
			var max = 1 + (maxDiameter/minDiameter);
			var min = 0;
			function renderAt(fraction) {
// 				var scale = 1.0 + (maxDiameter/minDiameter) * fraction;
				var scale = min + (max - min)*fraction;
				scale = Math.max(0.00001, scale);
				proxy.style.transform = proxy.style.webkitTransform = proxy.style.msTransform = 'translate(-50%, -50%) scale(' + (1/scale) + ')';
				wrapper.style.transform = wrapper.style.webkitTransform = wrapper.style.msTransform = 'translate(-50%, -50%) scale(' + scale + ')';
			}
			
			var effect = new KeyframeEffect(element, [], {
				duration: options.duration || 500,
				delay: options.delay || 0,
				fill: options.fill || 'none',
				easing: options.easing || 'linear'
			});
			
			/// checking for null is the correct/specced way of doing things, but right now is really buggy (e.g. on .reverse();)
			effect.onsample = function(fraction, target, effect) {
				/// Interpolate
				if(isWrapped && (fraction < 1 && fraction > 0)) // fraction !== null)
				{
					renderAt(fraction);
				}
				
				/// Enter
				if(!isWrapped && (fraction > 0 && fraction < 1)) // fraction !== null)
				{
					wrapper.style.left = (element.offsetLeft + element.offsetWidth*.5) + 'px';
					wrapper.style.top = (element.offsetTop + element.offsetHeight*.5) + 'px';
					element.style.visibility = 'hidden';
					if(options.context && options.context.from.nextSibling) parent.insertBefore(wrapper, options.context.from.nextSibling);
					else parent.appendChild(wrapper);
					
					isWrapped = true;
					
					renderAt(fraction);
				}
				
				/// Exit
				else if(isWrapped && !(fraction > 0 && fraction < 1)) // fraction === null)
				{
					parent.removeChild(wrapper);
					element.style.visibility = null;
					isWrapped = false;
				}
			};
			return effect;
		},
		
		/// Play multiple animations at once but each element has their animation delayed based on distance to an origin position
		/// Great for the 'hierarchical timing' technique
		step: function(elements, keyframes, options) {
			/// Get all them rects
			var rects = Array.prototype.map.call(elements, function(element) { return element.getBoundingClientRect() });
			
			var origin;
			/// A relative string definition (e.g. "left top")
			if(!options.origin || typeof options.origin === 'string')
			{
				/// Figure out the big bounding box covering the rects
				var bounds = { left: rects[0].left, top: rects[0].top, right: rects[0].right, bottom: rects[0].bottom, width: 0, height: 0 };
				rects.forEach(function(rect) {
					if(rect.left < bounds.left) bounds.left = rect.left;
					if(rect.right > bounds.right) bounds.right = rect.right;
					if(rect.top < bounds.top) bounds.top = rect.top;
					if(rect.bottom > bounds.bottom) bounds.bottom = rect.bottom;
				});
				bounds.width = bounds.right - bounds.left;
				bounds.height = bounds.bottom - bounds.top;
				
				/// Parse the origin from the user and apply it with the bounding box
				origin = Choreo.Utility.parseCoordinate(options.origin || 'left top', bounds);
			}
			
			else if(typeof options.origin === 'object' && 'x' in options.origin && 'y' in options.origin)
			{
				/// Take the origin as-is
				origin = options.origin;
			}
			
			
			/// Loop through the elements and build the animations into a group
			var group = [];
			for(var iter = 0, total = elements.length; iter < total; ++iter)
			{
				var element = elements[iter];
				var rect = rects[iter];
				var delta = {
					x: (rect.left+rect.width*.5) - origin.x,
					y: (rect.top+rect.height*.5) - origin.y
				}
				var distance = Math.sqrt(
					Math.pow(delta.x, 2) +
					Math.pow(delta.y, 2)
				);
				
				var frames = [];
				if(typeof keyframes === 'function')
				{
					frames = keyframes.call({
						element: element,
						rect: rect,
						delta: delta,
						distance: distance
					}, options);
				}
				
				else frames = keyframes;
				
				
				if(frames.length)
				{
					group.push(new KeyframeEffect(element, frames, {
						delay: (options.delay || 0) + (distance / 4 * (options.stepMult || 1)),
						duration: options.duration,
						fill: options.fill,
						easing: options.easing
					}));
				}
			}
			
			/// Return our users' glorious animation, all composited together :)
			return new GroupEffect(group, { fill: 'both' });
		},
		
		/// Allows you to run a callback on multiple elements and contrast it in relation to a single element
		/// Common usecases tends to be having a bunch of elements move in sequence away or towards that single element
		/// Calculates layout, relative vectors, distances and normalised direction vectors, then passes it as a 'this' for onEach
		evade: function(target, elements, onEach) {
			/// Get and calculate all that fancy geometry
			var rects = Array.prototype.map.call(elements, function(element) { return element.getBoundingClientRect() });
			var from = target.getBoundingClientRect();
			var deltas = rects.map(function(rect) {
				return {
					x: (rect.left + rect.width*.5) - (from.left + from.width*.5),
					y: (rect.top + rect.height*.5) - (from.top + from.height*.5)
				}
			});
			var distances = deltas.map(function(delta) { return Math.sqrt(Math.pow(delta.x, 2) + Math.pow(delta.y, 2)) });
			var directions = deltas.map(function(delta, index) {
				var magnitude = distances[index];
				if(magnitude == 0) return { x: 0, y: 0 };
				return { x: delta.x / magnitude, y: delta.y / magnitude }
			});
			
			/// Loop through it all and hit the onEach callback for an animation to composite
			var effects = [];
			for(var iter = 0, total = elements.length; iter < total; ++iter)
			{
				var effect = onEach.call({
					rect: rects[iter],
					delta: deltas[iter],
					direction: directions[iter],
					distance: distances[iter]
				}, elements[iter]);
				
				if(effect) effects.push(effect);
			}
			
			/// Finally return our animation
			return new GroupEffect(effects);
		},
		

		quadraticCurve: function(a, b, c, iterations, fn) {
			var frames = [];
			for(var iter = 0; iter <= iterations; ++iter)
			{
				var t = iter/iterations;
				var x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * b.x + t * t * c.x;
				var y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * b.y + t * t * c.y;
				frames.push(fn? fn(x, y, t) : { transform: ['translate(', x, 'px, ', y, 'px)'].join('') });
			}
			return frames;
		}
		
		
		/*
			Any other useful animation-creating functions?
			I would like to compile all the techniques and tricks here
			That would allow people to make the amazing stuff that people come up with
		*/
	},
	
	
	/// Choreo.Preset.* contains default view transitions you can use
	Preset: {
		/// Fades one animation from one to the other
		fade: function(settings) {
			return function fadePreset () {
				if(this.to && this.from)
					return new GroupEffect([
						Choreo.Animate.fade(this.from, 'out', { duration: settings.duration }),
						Choreo.Animate.fade(this.to, 'in', { duration: settings.duration })
					], { fill: 'both' });
				
				else if(this.to)
					return Choreo.Animate.fade(this.to, 'in', { duration: settings.duration });
				
				else if(this.from)
					return Choreo.Animate.fade(this.from, 'out', { duration: settings.duration });
			}
		},
		
		/// Work in Progress; I want to be able to reveal a view from growing or shrinking from a circle (or other shape)
		reveal: function() {
			return function() {}
		}
	},
	
	
	/// Various *internal* utility functions
	/// If your sly, feel free to use them :), but NO API CONTRACT PROMISES here!
	Utility: {
		parseCoordinate: function(str, reference) {
			var match = str.match(/(left|center|right) (top|center|bottom)/);
			if(match)
			{
				var relative = { x: 0, y: 0 };
				
				if(match[1] === 'left') relative.x = 0; else
				if(match[1] === 'center') relative.x = 0.5; else
				if(match[1] === 'right') relative.x = 1;
				
				if(match[2] === 'top') relative.y = 0; else
				if(match[2] === 'center') relative.y = 0.5; else
				if(match[2] === 'bottom') relative.y = 1;
				
				return {
					x: reference.left + reference.width * relative.x,
					y: reference.top + reference.height * relative.y
				};
			}
			
			match = str.match(/(left|right|top|bottom|center)/);
			if(match)
			{
				var relative = { x: 0, y: 0 };
				
				if(match[1] === 'left') relative.x = 0; else
				if(match[1] === 'right') relative.x = 1; else
				if(match[1] === 'top') relative.y = 0; else
				if(match[1] === 'bottom') relative.y = 1; else
				if(match[1] === 'center') { relative.x = 0.5; relative.y = 0.5; }
				
				return {
					x: reference.left + reference.width * relative.x,
					y: reference.top + reference.height * relative.y
				};
			}
			
			match = str.match(/([\.\d]+)% ([\.\d]+)%/);
			if(match)
			{
				var relative = {
					x: parseFloat(match[1])/100.0,
					y: parseFloat(match[2])/100.0
				};
				
				return {
					x: reference.left + reference.width * relative.x,
					y: reference.top + reference.height * relative.y
				};
			}
		},
		
		/// Loop through, grabbing all the ancestors in one big array
		parents: function parents(node) {
			var nodes = [node];
			for (; node; node = node.parentNode) nodes.unshift(node);
			return nodes;
		},
		
		/// Figure out the common ancestor of two nodes
		commonSiblings: function commonSiblings(a, b) {
			var x = this.parents(a);
			var y = this.parents(b);
			if (x[0] != y[0]) throw "No common ancestor!";
			for (var i = 1; i < x.length; i++) if(x[i] != y[i]) return [x[i - 1], y[i - 1]];
		},
		
		/// Find closest element (that is not itself) that clips the view, e.g. has overflow hidden, otherwise return document
		closestClip: function closestClippingAncestor(node) {
			while(node && (node = node.parentNode) && node instanceof Element && node !== document.body) {
				if(getComputedStyle(node).overflow !== 'visible')
					return node;
			}
			
			return document.body;
		}
	},
	
	
	/// Event Listeners
	on: function(type, func) {
		var subscribers = (type in this.events)? this.events[type] : (this.events[type] = []);
		if(subscribers.indexOf(func) === -1) subscribers.push(func);
	},
	
	off: function(type, func) {
		if(!(type in this.events)) return;
		var subscribers = this.events[type];
		var index = subscribers.indexOf(func);
		if(index === -1) return;
		subscribers.splice(index, 1);
	},
	
	trigger: function(type, context) {
		if(!(type in this.events)) return;
		var subscribers = this.events[type];
		var args = Array.prototype.slice.call(arguments, 2);
		for(var iter = 0, total = subscribers.length; iter < total; ++iter)
		{
			var subscriber = subscribers[iter];
			subscriber.apply(context, args);
		}
	},
	
	events: {
		preprocess: []
	},
	
	
	/// Creating shaped 'Reveal' animations is more complex and difficult than I'd prefer.
	/// Usually I would try to create very lightweight and highly composable constructs, but as
	/// this animation technique requires some heavy lifting this is the most optimal method at this time.
	/// (A 'reveal' animation is what I call the growing/shrinking circle animations)
	Revealer: (function() {
		function Revealer (element, options) {
			this.element = element;
			this.view = options.view || Choreo.Utility.closestClip(element);
			this.parent = options.parent || this.view;
			this.viewRect = this.view.getBoundingClientRect();
			var elementRect = element.getBoundingClientRect();
			var target = this.target = element.cloneNode(true);
			target.style.position = 'absolute';
			target.style.top = target.style.left = '50%';
			target.style.width = elementRect.width + 'px';
			target.style.height = elementRect.height + 'px';
			target.style.margin = '0';
			target.style.willChange = 'transform';
			
			var wrapper = this.wrapper = document.createElement('div');
			wrapper.style.position = 'absolute';
			wrapper.style.willChange = 'transform';
			wrapper.appendChild(target);
			
			this.calculateShape(options);
			
			if(options.from === 'nothing') this.startScale = this.minScale; else
			if(options.from === 'normal') this.startScale = this.midScale; else
			if(options.from === 'everything') this.startScale = this.maxScale;
			else this.startScale = this.midScale;
			
			if(options.to === 'nothing') this.endScale = this.minScale; else
			if(options.to === 'normal') this.endScale = this.midScale; else
			if(options.to === 'everything') this.endScale = this.maxScale;
			else this.endScale = this.maxScale;
			
// 			Hmm, lets see, how does the API look?
// 			new Choreo.Revealer(element, {
// 				shape: 'circle',
// 				from: 'normal',
// 				to: 'everything'
// 			});
			
			this.createEffect(options);
		}
		
		Revealer.prototype.calculateShape = function (options) {
			var shape = options.shape || 'circle';
			if(shape === 'circle') // Wrap target element with circle
			{
				var elementRect = this.element.getBoundingClientRect();
				var minDiameter = (function(element, offset) {
					var width = element.width + Math.abs(offset.x);
					var height = element.height + Math.abs(offset.y);
					return Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
				})(elementRect, options.position || { x: 0, y: 0 });
				var maxDiameter = (function(view, element) {
					var width = view.width + Math.abs(element.x - view.x);
					var height = view.height + Math.abs(element.y - view.y);
					return Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
				})({
					x: this.viewRect.left + this.viewRect.width*.5,
					y: this.viewRect.top + this.viewRect.height*.5,
					width: this.viewRect.width,
					height: this.viewRect.height
				}, options.position || {
					x: elementRect.left + elementRect.width*.5,
					y: elementRect.top + elementRect.height*.5
				});
				
				var wrapper = this.wrapper.style;
				wrapper.overflow = 'hidden';
				wrapper.background = options.background || 'none';
				wrapper.borderRadius = '50%';
				wrapper.border = options.border || '';
				wrapper.width = wrapper.height = minDiameter + 'px';
				
				this.maxScale = 1 + (maxDiameter/minDiameter);
				this.midScale = 1;
				this.minScale = 0;
			}
			
			/// else if(shape === 'ellipse') // Wrap to cover element with an ellipse (same ratio as target)
			/// else if(shape === 'square') // Wrap to cover element from widest width/height (or contain? Hmm.)
			/// else if(shape === 'rectangle') // Wrap target element exactly from width/height
			
			else throw new Error('Unknown shape defined for Choreo.Revealer!', shape);
		};
		
		Revealer.prototype.createEffect = function (options) {
			var effect = this.effect = new KeyframeEffect(this.element, [], {
				duration: options.duration || 500,
				delay: options.delay || 0,
				fill: options.fill || 'none',
				easing: options.easing || 'linear'
			});
			
			/// Checking for null is the correct/specced way of doing things, but right now is really buggy (e.g. on .reverse();)
			/// So I am entering/exiting reveal animations via checking if the fraction is between 0.0 and 1.0 or not
			var isWrapped = false;
			var Revealer = this;
			effect.onsample = function(fraction, target, effect) {
				/// Interpolate
				if(isWrapped && (fraction < 1 && fraction > 0)) // fraction !== null)
				{
					Revealer.renderAt(fraction);
				}
				
				/// Enter
				if(!isWrapped && (fraction > 0 && fraction < 1)) // fraction !== null)
				{
					if(options.position)
					{
						var rect = Revealer.element.getBoundingClientRect();
						Revealer.targetOffset = {
							x: (rect.left + rect.width*.5) - options.position.x,
							y: (rect.top + rect.height*.5) - options.position.y
						};
// 						Revealer.target.style.left = ((elementRect.left + elementRect.width*.5) - options.position.x) + 'px';
// 						Revealer.target.style.top = ((elementRect.top + elementRect.height*.5) - options.position.y) + 'px';
// 						Revealer.target.style.left = ((Revealer.element.offsetLeft + Revealer.element.offsetWidth*.5) - options.position.x) + 'px;';
// 						Revealer.target.style.top = ((Revealer.element.offsetTop + Revealer.element.offsetHeight*.5) - options.position.y) + 'px;';
					}
					
					else
					{
						Revealer.wrapper.style.left = (Revealer.element.offsetLeft + Revealer.element.offsetWidth*.5) + 'px';
						Revealer.wrapper.style.top = (Revealer.element.offsetTop + Revealer.element.offsetHeight*.5) + 'px';
					}

					Revealer.element.style.visibility = 'hidden';
					if(options.context && options.context.from.nextSibling) parent.insertBefore(Revealer.wrapper, options.context.from.nextSibling);
					else Revealer.parent.appendChild(Revealer.wrapper);
					
					isWrapped = true;
					
					Revealer.renderAt(fraction);
				}
				
				/// Exit
				else if(isWrapped && !(fraction > 0 && fraction < 1)) // fraction === null)
				{
					Revealer.parent.removeChild(Revealer.wrapper);
					Revealer.element.style.visibility = null;
					isWrapped = false;
				}
			};
			
			return effect;
		};
		
		Revealer.prototype.setScale = function (scale) {
			scale = Math.max(0.00001, scale);
			var target = this.target.style;
			var wrapper = this.wrapper.style;
			target.transform = target.webkitTransform = target.msTransform = 'translate(-50%, -50%) scale(' + (1/scale) + ')' + (this.targetOffset? ' translate(' + this.targetOffset.x + 'px, ' + this.targetOffset.y + 'px)' : '');
			wrapper.transform = wrapper.webkitTransform = wrapper.msTransform = 'translate(-50%, -50%) scale(' + scale + ')';
		};
		
		/// Set the animation state of the Revealer
		Revealer.prototype.renderAt = function (fraction) {
			var scale = this.startScale + (this.endScale - this.startScale) * fraction;
			this.setScale(scale);
		}
		
		
		return Revealer;
	})(),
	
	/*
			var isWrapped = false;
			var view = Choreo.Utility.closestClip(element);
			var parent = options.context? options.context.from.parentNode : view;
			var viewRect = view.getBoundingClientRect();
			var elementRect = element.getBoundingClientRect();
			var proxy = element.cloneNode(true);
			var wrapper = document.createElement('div');
			proxy.style.position = 'absolute';
			proxy.style.top = '50%';
			proxy.style.left = '50%';
			proxy.style.width = elementRect.width + 'px';
			proxy.style.height = elementRect.height + 'px';
			proxy.style.margin = '0';
			proxy.style.willChange = 'transform';
			wrapper.style.position = 'absolute';
			if(options.occlude) wrapper.style.overflow = 'hidden';
			wrapper.style.borderRadius = '50%';
			if(options.background) wrapper.style.background = options.background;
			wrapper.style.willChange = 'transform';
			wrapper.appendChild(proxy);
			
			var minDiameter = Math.sqrt(elementRect.width*elementRect.width + elementRect.height*elementRect.height);
			var maxDiameter = (function(a, b) {
				var width = a.width + 2*Math.abs((a.left + a.width*.5) - (b.left + b.width*.5));
				var height = a.height + 2*Math.abs((a.top + a.height*.5) - (b.top + b.height*.5));
				var centerToEdge = Math.sqrt(width*width + height*height);
				return centerToEdge;
			})(viewRect, elementRect);
			wrapper.style.width = wrapper.style.height = minDiameter + 'px';
			
			var max = 1 + (maxDiameter/minDiameter);
			var min = 0;
			function renderAt(fraction) {
// 				var scale = 1.0 + (maxDiameter/minDiameter) * fraction;
				var scale = min + (max - min)*fraction;
				scale = Math.max(0.00001, scale);
				proxy.style.transform = proxy.style.webkitTransform = proxy.style.msTransform = 'translate(-50%, -50%) scale(' + (1/scale) + ')';
				wrapper.style.transform = wrapper.style.webkitTransform = wrapper.style.msTransform = 'translate(-50%, -50%) scale(' + scale + ')';
			}
			
			var effect = new KeyframeEffect(element, [], {
				duration: options.duration || 500,
				delay: options.delay || 0,
				fill: options.fill || 'none',
				easing: options.easing || 'linear'
			});
			
			/// checking for null is the correct/specced way of doing things, but right now is really buggy (e.g. on .reverse();)
			effect.onsample = function(fraction, target, effect) {
				/// Interpolate
				if(isWrapped && (fraction < 1 && fraction > 0)) // fraction !== null)
				{
					renderAt(fraction);
				}
				
				/// Enter
				if(!isWrapped && (fraction > 0 && fraction < 1)) // fraction !== null)
				{
					wrapper.style.left = (element.offsetLeft + element.offsetWidth*.5) + 'px';
					wrapper.style.top = (element.offsetTop + element.offsetHeight*.5) + 'px';
					element.style.visibility = 'hidden';
					if(options.context && options.context.from.nextSibling) parent.insertBefore(wrapper, options.context.from.nextSibling);
					else parent.appendChild(wrapper);
					
					isWrapped = true;
					
					renderAt(fraction);
				}
				
				/// Exit
				else if(isWrapped && !(fraction > 0 && fraction < 1)) // fraction === null)
				{
					parent.removeChild(wrapper);
					element.style.visibility = null;
					isWrapped = false;
				}
			};
			return effect;
	*/
	
	
	
	
	
	
	/// This namespace will contain the effort to bring us physics-based animation
	/// We are constrained by Web Anim requiring definition of durations, so physics calcs can't truly be iterative
	/// I recently found Dynamics.JS which does this really well, I recommend checking it out: https://github.com/michaelvillar/dynamics.js
	Physics: {
		/*
			The MIT License (MIT)
			
			Copyright (c) 2015 Michael Villar
			
			Permission is hereby granted, free of charge, to any person obtaining a copy
			of this software and associated documentation files (the 'Software'), to deal
			in the Software without restriction, including without limitation the rights
			to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
			copies of the Software, and to permit persons to whom the Software is
			furnished to do so, subject to the following conditions:
			
			The above copyright notice and this permission notice shall be included in
			all copies or substantial portions of the Software.
			
			THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
			IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
			FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
			AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
			LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
			OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
			THE SOFTWARE.
		*/
		
		
		/// You can replace the `easing: '…'` in the timing object of your animation with these:
		easeIn: function(friction) { if(arguments.length === 0) friction = 500; return 'cubic-bezier(' + (0.98 - (friction/1000)) + ',0,1,1)' },
		easeOut: function(friction) { if(arguments.length === 0) friction = 500; return 'cubic-bezier(0,0,' + (0.02 + (friction/1000)) + ',1)' },
		easeInOut: function(friction) { if(arguments.length === 0) friction = 500; return 'cubic-bezier(' + (0.98 - (friction/1000)) + ',0,' + (0.02 + (friction/1000)) + ',1)' },
		

		/// These on the other hand are too complex for the Web Animation API to handle in it's `easing` property does NOT allow custom easing functions
		
// Note for self when implementing:
// initialForce means swapping END value when interpolation => 1.0 for the START value
// (that is, the curve loops back to beginning, like bounce & forceWithGravity)
// (It's a hack by applying temp middle-man option to re-use code)

// Note2: I have been reading quite a bit of backlash against hacky spring dynamic animations:
// https://medium.com/@flyosity/your-spring-animations-are-bad-and-it-s-probably-apple-s-fault-784932e51733
// I am reconsidering that duration ought to be calculated automatically based on the rest state.
// So, rather than affecting the easing, we should create keyframes. The only problem with this is, how do you interpolate keyframes manually?
// Possible workaround 'hack' is to create a custom AnimationPlayer that we manually seek to position? Hmm…

// 		spring: function
/*
var A1, A2, decal, frequency, friction, s;
  if (options == null) {
    options = {};
  }
  applyDefaults(options, arguments.callee.defaults);
  frequency = Math.max(1, options.frequency / 20);
  friction = Math.pow(20, options.friction / 100);
  s = options.anticipationSize / 1000;
  decal = Math.max(0, s);
  A1 = function(t) {
    var M, a, b, x0, x1;
    M = 0.8;
    x0 = s / (1 - s);
    x1 = 0;
    b = (x0 - (M * x1)) / (x0 - x1);
    a = (M - b) / x0;
    return (a * t * options.anticipationStrength / 100) + b;
  };
  A2 = function(t) {
    return Math.pow(friction / 10, -t) * (1 - t);
  };
  return function(t) {
    var A, At, a, angle, b, frictionT, y0, yS;
    frictionT = (t / (1 - s)) - (s / (1 - s));
    if (t < s) {
      yS = (s / (1 - s)) - (s / (1 - s));
      y0 = (0 / (1 - s)) - (s / (1 - s));
      b = Math.acos(1 / A1(yS));
      a = (Math.acos(1 / A1(y0)) - b) / (frequency * (-s));
      A = A1;
    } else {
      A = A2;
      b = 0;
      a = 1;
    }
    At = A(frictionT);
    angle = frequency * (t - s) * a + b;
    return 1 - (At * Math.cos(angle));
  };
*/
// 		bounce: function
/*
var A, fn, frequency, friction;
  if (options == null) {
    options = {};
  }
  applyDefaults(options, arguments.callee.defaults);
  frequency = Math.max(1, options.frequency / 20);
  friction = Math.pow(20, options.friction / 100);
  A = function(t) {
    return Math.pow(friction / 10, -t) * (1 - t);
  };
  fn = function(t) {
    var At, a, angle, b;
    b = -3.14 / 2;
    a = 1;
    At = A(t);
    angle = frequency * t * a + b;
    return At * Math.cos(angle);
  };
  fn.initialForce = true;
  return fn;
*/
// 		gravity: function
/*
var L, bounciness, curves, elasticity, fn, getPointInCurve, gravity;
  if (options == null) {
    options = {};
  }
  applyDefaults(options, arguments.callee.defaults);
  bounciness = Math.min(options.bounciness / 1250, 0.8);
  elasticity = options.elasticity / 1000;
  gravity = 100;
  curves = [];
  L = (function() {
    var b, curve;
    b = Math.sqrt(2 / gravity);
    curve = {
      a: -b,
      b: b,
      H: 1
    };
    if (options.initialForce) {
      curve.a = 0;
      curve.b = curve.b * 2;
    }
    while (curve.H > 0.001) {
      L = curve.b - curve.a;
      curve = {
        a: curve.b,
        b: curve.b + L * bounciness,
        H: curve.H * bounciness * bounciness
      };
    }
    return curve.b;
  })();
  getPointInCurve = function(a, b, H, t) {
    var c, t2;
    L = b - a;
    t2 = (2 / L) * t - 1 - (a * 2 / L);
    c = t2 * t2 * H - H + 1;
    if (options.initialForce) {
      c = 1 - c;
    }
    return c;
  };
  (function() {
    var L2, b, curve, results;
    b = Math.sqrt(2 / (gravity * L * L));
    curve = {
      a: -b,
      b: b,
      H: 1
    };
    if (options.initialForce) {
      curve.a = 0;
      curve.b = curve.b * 2;
    }
    curves.push(curve);
    L2 = L;
    results = [];
    while (curve.b < 1 && curve.H > 0.001) {
      L2 = curve.b - curve.a;
      curve = {
        a: curve.b,
        b: curve.b + L2 * bounciness,
        H: curve.H * elasticity
      };
      results.push(curves.push(curve));
    }
    return results;
  })();
  fn = function(t) {
    var curve, i, v;
    i = 0;
    curve = curves[i];
    while (!(t >= curve.a && t <= curve.b)) {
      i += 1;
      curve = curves[i];
      if (!curve) {
        break;
      }
    }
    if (!curve) {
      v = options.initialForce ? 0 : 1;
    } else {
      v = getPointInCurve(curve.a, curve.b, curve.H, t);
    }
    return v;
  };
  fn.initialForce = options.initialForce;
  return fn;
*/
// 	forceWithGravity: function
/*
if (options == null) {
    options = {};
  }
  applyDefaults(options, arguments.callee.defaults);
  options.initialForce = true;
  return dynamics.gravity(options);
*/
	}
};


