/*
infiniteslide v2 — vanilla port of https://github.com/woodroots/infiniteslidev2
The original plugin is jQuery ($.fn.infiniteslide). This file repeats the same
steps in plain JS: wrap, flex row, clone the children, measure one set, then a
linear CSS animation of that distance.

The animation stays on the compositor. Driving it from the GSAP ticker made the
strip freeze for a fraction of a second whenever the main thread was busy, then
jump forward. That is the horizontal hitch.
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
		} else if (vertical && firstClone && base[0]) {
			distance = firstClone.offsetTop - base[0].offsetTop;
		}
		distance = Math.round(distance);
		if (distance < 1) {
			return;
		}

		if (vertical) {
			wrap.style.height = distance + 'px';
		}

		var id = 'infiniteslide' + Date.now().toString(16) + Math.floor(Math.random() * 10000).toString(16);
		var axis = vertical ? '0,-' + distance + 'px,0' : '-' + distance + 'px,0,0';
		var style = document.createElement('style');
		style.id = id + '_style';
		style.textContent = '@keyframes ' + id + '{from{transform:translate3d(0,0,0);}to{transform:translate3d(' + axis + ');}}';
		document.head.appendChild(style);

		var reverse = (settings.direction === 'right' || settings.direction === 'down') ? ' reverse' : '';
		list.style.animation = id + ' ' + (distance / settings.speed) + 's linear 0s infinite' + reverse;

		if (settings.pauseonhover) {
			list.addEventListener('mouseenter', function () {
				list.style.animationPlayState = 'paused';
			});
			list.addEventListener('mouseleave', function () {
				list.style.animationPlayState = 'running';
			});
		}

		list.setAttribute('data-infiniteslide', 'ready');
		list.setAttribute('data-infiniteslide-distance', String(distance));
	}

	window.infiniteslide = infiniteslide;
}(window));
