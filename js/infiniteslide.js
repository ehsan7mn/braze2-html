/*
infiniteslide v2 — vanilla port of https://github.com/woodroots/infiniteslidev2
Same steps: flex row, clone the children, measure non-clone outer width (margin included),
keyframes translate3d by that width, linear infinite. No jQuery.
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
		list.parentNode.insertBefore(wrap, list);
		wrap.appendChild(list);

		var vertical = settings.direction === 'up' || settings.direction === 'down';
		list.style.display = 'flex';
		list.style.flexWrap = 'nowrap';
		list.style.alignItems = 'center';
		list.style.flexDirection = vertical ? 'column' : 'row';
		list.style.width = 'max-content';
		list.style.margin = '0';
		Array.prototype.forEach.call(list.children, function (child) {
			child.style.flex = 'none';
			child.style.display = 'block';
		});

		var source = Array.prototype.slice.call(list.children);
		var copies = settings.clone < 1 ? 1 : settings.clone;
		var n = 0;
		while (n < copies) {
			source.forEach(function (child) {
				var clone = child.cloneNode(true);
				clone.classList.add('infiniteslide_clone');
				list.appendChild(clone);
			});
			n += 1;
		}

		var distance = vertical
			? originals(list).reduce(function (sum, child) {
				return sum + child.offsetHeight;
			}, 0)
			: widthOf(list);
		if (!distance) {
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
	}

	window.infiniteslide = infiniteslide;
}(window));
