/*
infiniteslide v2 — vanilla port of https://github.com/woodroots/infiniteslidev2
The original plugin is jQuery ($.fn.infiniteslide). This file is the same steps
in plain JS: wrap, flex row, clone the children, measure one set.

The original then loops a CSS @keyframes translate. That animation restarts at
the end of every cycle, and on a row that is not on a whole pixel the restart
reads as a 1px tick. Here the same distance is applied by hand, in whole pixels,
on one continuous clock, so the wrap is just the next 1px step.
*/
(function (window) {
	'use strict';

	function outerWidth(el) {
		var style = window.getComputedStyle(el);
		var marginLeft = parseFloat(style.marginLeft) || 0;
		var marginRight = parseFloat(style.marginRight) || 0;
		return el.offsetWidth + marginLeft + marginRight;
	}

	function originals(list) {
		return Array.prototype.filter.call(list.children, function (child) {
			return !child.classList.contains('infiniteslide_clone');
		});
	}

	function widthOf(list) {
		return originals(list).reduce(function (sum, child) {
			return sum + outerWidth(child);
		}, 0);
	}

	function snapToPixel(el) {
		if (!el.hasAttribute('data-snap-base')) {
			var current = parseFloat(window.getComputedStyle(el).marginTop) || 0;
			el.setAttribute('data-snap-base', String(current));
		}
		el.style.marginTop = '';
		var root = document.getElementById('smooth-content') || document.body;
		var top = el.getBoundingClientRect().top - root.getBoundingClientRect().top;
		var frac = top - Math.round(top);
		if (Math.abs(frac) < 0.01) {
			return;
		}
		var base = parseFloat(el.getAttribute('data-snap-base')) || 0;
		el.style.marginTop = (base - frac) + 'px';
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

		var wrap = document.createElement('div');
		wrap.className = 'infiniteslide_wrap';
		wrap.style.overflow = 'hidden';
		wrap.style.width = '100%';
		list.parentNode.insertBefore(wrap, list);
		wrap.appendChild(list);

		var vertical = settings.direction === 'up' || settings.direction === 'down';
		list.style.display = 'flex';
		list.style.flexWrap = 'nowrap';
		list.style.alignItems = 'center';
		list.style.flexDirection = vertical ? 'column' : 'row';
		list.style.width = 'max-content';
		list.style.margin = '0';
		list.style.padding = '0';
		list.style.fontSize = '0';
		list.style.lineHeight = '0';
		list.style.willChange = 'transform';
		list.style.backfaceVisibility = 'hidden';
		list.style.animation = 'none';
		Array.prototype.forEach.call(list.children, function (child) {
			child.style.flex = 'none';
			child.style.display = 'block';
		});

		var base = originals(list).slice();
		var unit = vertical
			? base.reduce(function (sum, child) {
				return sum + child.offsetHeight;
			}, 0)
			: widthOf(list);
		if (!unit) {
			return;
		}

		var copies = settings.clone < 1 ? 1 : settings.clone;
		var view = vertical ? wrap.clientHeight : wrap.clientWidth;
		if (view) {
			copies = Math.max(copies, Math.ceil(view / unit));
		}
		var n = 0;
		while (n < copies) {
			base.forEach(function (child) {
				var clone = child.cloneNode(true);
				clone.classList.add('infiniteslide_clone');
				clone.style.flex = 'none';
				clone.style.display = 'block';
				list.appendChild(clone);
			});
			n += 1;
		}

		var distance = unit;
		var firstClone = list.querySelector('.infiniteslide_clone');
		if (!vertical && firstClone && base[0]) {
			distance = firstClone.offsetLeft - base[0].offsetLeft;
		}
		distance = Math.round(distance);
		if (distance < 1) {
			return;
		}

		if (vertical) {
			wrap.style.height = distance + 'px';
		}

		var marquee = list.closest('.logo-marquee');
		if (marquee) {
			snapToPixel(marquee);
		}

		var reverse = settings.direction === 'right' || settings.direction === 'down';
		var pos = 0;
		var carry = 0;
		var last = window.performance.now();
		var paused = false;

		function apply() {
			var px = reverse ? pos : -pos;
			list.style.transform = vertical
				? 'translate3d(0,' + px + 'px,0)'
				: 'translate3d(' + px + 'px,0,0)';
		}

		function frame() {
			var now = window.performance.now();
			var dt = now - last;
			last = now;
			if (paused) {
				return;
			}
			if (dt < 0 || dt > 50) {
				dt = 16.7;
			}
			carry += (dt / 1000) * settings.speed;
			var step = Math.floor(carry);
			if (step < 1) {
				return;
			}
			carry -= step;
			pos += step;
			if (pos >= distance) {
				pos %= distance;
			}
			apply();
		}

		if (window.gsap && window.gsap.ticker) {
			window.gsap.ticker.add(frame);
		} else {
			var loop = function () {
				frame();
				window.requestAnimationFrame(loop);
			};
			window.requestAnimationFrame(loop);
		}

		if (settings.pauseonhover) {
			list.addEventListener('mouseenter', function () {
				paused = true;
			});
			list.addEventListener('mouseleave', function () {
				paused = false;
				last = window.performance.now();
			});
		}

		if (marquee && window.ScrollTrigger) {
			window.ScrollTrigger.addEventListener('refresh', function () {
				snapToPixel(marquee);
			});
		}

		list.setAttribute('data-infiniteslide', 'ready');
		list.setAttribute('data-infiniteslide-distance', String(distance));
	}

	window.infiniteslide = infiniteslide;
}(window));
