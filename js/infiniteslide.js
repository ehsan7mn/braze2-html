/*
infiniteslide v2 — vanilla port of https://github.com/woodroots/infiniteslidev2
Same steps as $.fn.infiniteslide: wrap (overflow hidden), flex row, clone the
children, sum outerWidth of the originals (margin included), then one linear
CSS animation of that distance. No jQuery.
*/
(function (window) {
	'use strict';

	function outerSize(el, vertical) {
		var style = window.getComputedStyle(el);
		if (vertical) {
			return el.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
		}
		return el.offsetWidth + (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
	}

	function measure(list, vertical) {
		var total = 0;
		Array.prototype.forEach.call(list.children, function (child) {
			if (!child.classList.contains('infiniteslide_clone')) {
				total += outerSize(child, vertical);
			}
		});
		return total;
	}

	function infiniteslide(list, options) {
		if (!list || list.getAttribute('data-infiniteslide') === 'ready') {
			return;
		}
		var settings = {
			speed: 100,
			direction: 'left',
			pauseonhover: true,
			clone: 1
		};
		if (options) {
			Object.keys(settings).forEach(function (key) {
				if (options[key] !== undefined) {
					settings[key] = options[key];
				}
			});
		}

		var vertical = settings.direction === 'up' || settings.direction === 'down';
		var wrap = document.createElement('div');
		wrap.className = 'infiniteslide_wrap';
		/* The plugin clips with overflow:hidden. Inside ScrollSmoother that
		   property squashes the transform animation into the page layer, so
		   the strip repaints instead of running on the compositor. inset(0)
		   clips the same box and leaves the animation composited. */
		wrap.style.clipPath = 'inset(0px)';
		list.parentNode.insertBefore(wrap, list);
		wrap.appendChild(list);

		list.style.display = 'flex';
		list.style.flexWrap = 'nowrap';
		list.style.alignItems = 'center';
		list.style.flexDirection = vertical ? 'column' : 'row';
		Array.prototype.forEach.call(list.children, function (child) {
			child.style.flex = 'none';
			child.style.display = 'block';
		});

		var unit = measure(list, vertical);
		if (!unit) {
			return;
		}
		/* clone is the plugin option. One set must stay wider than the wrapper,
		   otherwise the loop shows empty space. */
		var copies = settings.clone < 1 ? 1 : settings.clone;
		var view = vertical ? wrap.clientHeight : wrap.clientWidth;
		if (view) {
			copies = Math.max(copies, Math.ceil(view / unit));
		}
		var base = Array.prototype.slice.call(list.children);
		var n = 0;
		while (n < copies) {
			base.forEach(function (child) {
				var clone = child.cloneNode(true);
				clone.classList.add('infiniteslide_clone');
				list.appendChild(clone);
			});
			n += 1;
		}

		var distance = measure(list, vertical);
		if (distance < 1) {
			return;
		}
		if (vertical) {
			wrap.style.height = distance + 'px';
		}

		var id = 'infiniteslide' + Date.now() + Math.floor(10000 * Math.random()).toString(16);
		var axis = vertical ? '0,-' + distance + 'px,0' : '-' + distance + 'px,0,0';
		var style = document.createElement('style');
		style.id = id + '_style';
		style.textContent = '@keyframes ' + id + '{from{transform:translate3d(0,0,0);}to{transform:translate3d(' + axis + ');}}';
		document.head.appendChild(style);

		var reverse = (settings.direction === 'right' || settings.direction === 'down') ? ' reverse' : '';
		list.style.animation = id + ' ' + (distance / settings.speed) + 's linear 0s infinite' + reverse;
		list.setAttribute('data-style', id);

		if (settings.pauseonhover) {
			list.addEventListener('mouseenter', function () {
				list.style.animationPlayState = 'paused';
			});
			list.addEventListener('mouseleave', function () {
				list.style.animationPlayState = 'running';
			});
		}

		list.setAttribute('data-infiniteslide', 'ready');
	}

	window.infiniteslide = infiniteslide;
}(window));
