/* scripts Design By Ehsan Mehdizadeh - Persiantik.net */
(function () {
	'use strict';

	var clamp = function (v, min, max) {
		return v < min ? min : (v > max ? max : v);
	};

	/* start hero slider */
	if (window.Swiper && document.querySelector('.heroSwiper')) {
		new Swiper('.heroSwiper', {
			effect: 'fade',
			fadeEffect: { crossFade: true },
			/* the visible fade lives in css, swiper only needs to flip the active class */
			speed: 10,
			rewind: true,
			allowTouchMove: false,
			autoplay: {
				delay: 4000,
				disableOnInteraction: false
			}
		});
	}
	/* end hero slider */

	/* start lightBlock */
	Array.prototype.forEach.call(document.querySelectorAll('.lightArea'), function (area) {
		var light = area.querySelector('.lightBlock');
		if (!light) {
			return;
		}
		area.addEventListener('mousemove', function (e) {
			var box = area.getBoundingClientRect();
			light.style.transform = 'matrix(1, 0, 0, 1, ' + (e.clientX - box.left) + ', ' + (e.clientY - box.top) + ')';
		});
		area.addEventListener('mouseenter', function () {
			light.classList.add('lightBlock_active');
		});
		area.addEventListener('mouseleave', function () {
			light.classList.remove('lightBlock_active');
		});
	});
	/* end lightBlock */

	/* start braze dissolve */
	var VERTEX_SHADER = [
		'attribute vec2 aPos;',
		'varying vec2 vUv;',
		'void main() {',
		'  vUv = aPos * 0.5 + 0.5;',
		'  gl_Position = vec4(aPos, 0.0, 1.0);',
		'}'
	].join('\n');

	var FRAGMENT_SHADER = [
		'precision highp float;',
		'uniform float uProgress;',
		'uniform vec2 uResolution;',
		'uniform vec3 uColor;',
		'uniform float uSpread;',
		'varying vec2 vUv;',
		'float Hash(vec2 p) {',
		'  vec3 p2 = vec3(p.xy, 1.0);',
		'  return fract(sin(dot(p2, vec3(37.1, 61.7, 12.4))) * 3758.5453123);',
		'}',
		'float noise(in vec2 p) {',
		'  vec2 i = floor(p);',
		'  vec2 f = fract(p);',
		'  f *= f * (3.0 - 2.0 * f);',
		'  return mix(',
		'    mix(Hash(i + vec2(0.0, 0.0)), Hash(i + vec2(1.0, 0.0)), f.x),',
		'    mix(Hash(i + vec2(0.0, 1.0)), Hash(i + vec2(1.0, 1.0)), f.x),',
		'    f.y',
		'  );',
		'}',
		'float fbm(vec2 p) {',
		'  float v = 0.0;',
		'  v += noise(p * 1.0) * 0.5;',
		'  v += noise(p * 2.0) * 0.25;',
		'  v += noise(p * 4.0) * 0.125;',
		'  return v;',
		'}',
		'void main() {',
		'  vec2 uv = vUv;',
		'  float aspect = uResolution.x / uResolution.y;',
		'  vec2 centeredUv = (uv - 0.5) * vec2(aspect, 1.0);',
		'  float dissolveEdge = uv.y - uProgress * 1.2;',
		'  float noiseValue = fbm(centeredUv * 15.0);',
		'  float d = dissolveEdge + noiseValue * uSpread;',
		'  float pixelSize = 1.0 / uResolution.y;',
		'  float alpha = 1.0 - smoothstep(-pixelSize, pixelSize, d);',
		'  gl_FragColor = vec4(uColor, alpha);',
		'}'
	].join('\n');

	var DISSOLVE_COLOR = [0.882, 0.882, 0.882]; /* #e1e1e1, keep in sync with --bg_gray */
	var DISSOLVE_SPREAD = 0.5;

	function compile(gl, type, source) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			return null;
		}
		return shader;
	}

	function createDissolve(section) {
		var canvas = section.querySelector('.dissolveCanvas');
		var fallback = section.querySelector('.dissolveFallback');
		var gl = canvas && canvas.getContext('webgl', {
			alpha: true,
			premultipliedAlpha: false,
			antialias: false,
			/* the frame is only redrawn on scroll, so it has to survive compositing */
			preserveDrawingBuffer: true
		});

		if (!gl) {
			section.classList.add('noWebgl');
			return function (progress) {
				if (fallback) {
					fallback.style.transform = 'scaleY(' + clamp(progress * 1.2, 0, 1) + ')';
				}
			};
		}

		var vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
		var fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.useProgram(program);

		var buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		var aPos = gl.getAttribLocation(program, 'aPos');
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		var uProgress = gl.getUniformLocation(program, 'uProgress');
		var uResolution = gl.getUniformLocation(program, 'uResolution');
		gl.uniform3fv(gl.getUniformLocation(program, 'uColor'), DISSOLVE_COLOR);
		gl.uniform1f(gl.getUniformLocation(program, 'uSpread'), DISSOLVE_SPREAD);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.clearColor(0, 0, 0, 0);

		var width = 0;
		var height = 0;

		function resize() {
			var ratio = Math.min(window.devicePixelRatio || 1, 2);
			width = Math.round(window.innerWidth * ratio);
			height = Math.round(window.innerHeight * ratio);
			canvas.width = width;
			canvas.height = height;
			gl.viewport(0, 0, width, height);
			gl.uniform2f(uResolution, width, height);
		}

		resize();
		window.addEventListener('resize', resize);

		return function (progress) {
			gl.uniform1f(uProgress, progress);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		};
	}

	var dissolveWrap = document.querySelector('.dissolveWrap');
	var dissolveSection = document.querySelector('.dissolveSec');
	var dissolveTitleHold = document.querySelector('.dissolveTitleHold');
	var dissolveClip = document.querySelector('.dissolveClip');
	var drawDissolve = dissolveWrap ? createDissolve(dissolveWrap) : null;
	var navOuter = document.querySelector('.navOuter');
	/* end braze dissolve */

	/* start split title into words */
	Array.prototype.forEach.call(document.querySelectorAll('.revealWords'), function (title) {
		title.innerHTML = title.textContent.trim().split(/\s+/).map(function (word) {
			return '<span class="word">' + word + '</span>';
		}).join(' ');
	});
	/* end split title into words */

	/* start scroll driven effects */
	var parallaxItems = document.querySelectorAll('[data-parallax]');
	var visionCards = document.querySelectorAll('[data-vision-card]');
	var revealTitles = document.querySelectorAll('.revealWords');

	function updateParallax(viewport) {
		Array.prototype.forEach.call(parallaxItems, function (item) {
			var holder = item.parentElement;
			var extra = item.offsetHeight - holder.offsetHeight;
			if (extra <= 0) {
				return;
			}
			var box = holder.getBoundingClientRect();
			var progress = clamp((viewport - box.top) / (viewport + box.height), 0, 1);
			item.style.transform = 'translate3d(0, ' + (-extra * (1 - progress)).toFixed(2) + 'px, 0)';
		});
	}

	function updateVisionCards(viewport) {
		Array.prototype.forEach.call(visionCards, function (card) {
			var side = card.getAttribute('data-vision-card');
			if (side === 'center') {
				return;
			}
			var box = card.getBoundingClientRect();
			var progress = clamp((viewport * 0.85 - box.top) / (viewport * 0.6), 0, 1);
			var rest = 1 - progress;
			/* the two outer cards start stacked on the middle one and fan out while scrolling */
			var shift = side === 'left' ? 100 : -100;
			var tilt = side === 'left' ? -2 : 2;
			card.style.transform = 'translateX(' + (shift * rest).toFixed(2) + '%) rotate(' + (tilt * rest).toFixed(2) + 'deg)';
		});
	}

	function updateRevealTitles(viewport) {
		Array.prototype.forEach.call(revealTitles, function (title) {
			var words = title.querySelectorAll('.word');
			var box = title.getBoundingClientRect();
			var progress = clamp((viewport * 0.6 - box.top) / (viewport * 0.2), 0, 1);
			var total = words.length;
			Array.prototype.forEach.call(words, function (word, index) {
				var start = index / total;
				var end = (index + 1) / total;
				var opacity = 0.2;
				if (progress >= end) {
					opacity = 1;
				} else if (progress > start) {
					opacity = Math.max((progress - start) / (end - start), 0.2);
				}
				word.style.opacity = opacity;
			});
		});
	}

	function updateDissolve(viewport) {
		if (!drawDissolve || !dissolveSection) {
			return;
		}
		/* starts the frame the hero leaves the top — same mapping as Vexium */
		var progress = clamp((window.pageYOffset || window.scrollY || 0) / viewport, 0, 1);
		drawDissolve(progress * 1.1);

		var wrapBox = dissolveWrap.getBoundingClientRect();
		var overlayH = clamp(wrapBox.bottom, 0, viewport);
		if (dissolveClip) {
			dissolveClip.style.height = overlayH + 'px';
			dissolveClip.style.visibility = overlayH <= 0 ? 'hidden' : 'visible';
		}

		if (dissolveTitleHold) {
			/* title rides the gray curtain, not a later black slab */
			dissolveTitleHold.style.opacity = clamp((progress - 0.06) / 0.22, 0, 1);
		}

		if (navOuter) {
			navOuter.classList.toggle('isOnLight', progress > 0.45 && wrapBox.bottom >= 14);
		}
	}

	var ticking = false;

	function update() {
		var viewport = window.innerHeight;
		updateParallax(viewport);
		updateVisionCards(viewport);
		updateRevealTitles(viewport);
		updateDissolve(viewport);
		ticking = false;
	}

	function requestUpdate() {
		if (!ticking) {
			ticking = true;
			window.requestAnimationFrame(update);
		}
	}

	window.addEventListener('scroll', requestUpdate, { passive: true });
	window.addEventListener('resize', requestUpdate);
	window.addEventListener('load', requestUpdate);
	update();
	/* end scroll driven effects */

	/* start reviews swiper */
	if (window.Swiper && document.querySelector('.review-swiper')) {
		new Swiper('.review-swiper', {
			slidesPerView: 3,
			spaceBetween: 16,
			loop: true,
			watchOverflow: true,
			speed: 650,
			autoplay: {
				delay: 4200,
				disableOnInteraction: false
			},
			navigation: {
				nextEl: '.review-next',
				prevEl: '.review-prev'
			},
			breakpoints: {
				0: { slidesPerView: 1 },
				768: { slidesPerView: 2 },
				1200: { slidesPerView: 3 }
			}
		});
	}
	var reviewsLayout = document.querySelector('.reviews-layout');
	var reviewsSide = document.querySelector('.reviews-side');
	function syncReviewHeight() {
		if (!reviewsLayout || !reviewsSide) {
			return;
		}
		reviewsLayout.style.setProperty('--side-h', reviewsSide.offsetHeight + 'px');
	}
	Array.prototype.forEach.call(document.querySelectorAll('.review-card'), function (card) {
		var text = card.querySelector('.review-text');
		if (text) {
			text.style.display = 'block';
			text.style.webkitLineClamp = 'unset';
		}
		card.style.height = 'auto';
		card.style.setProperty('--full', card.scrollHeight + 'px');
		card.style.height = '';
		if (text) {
			text.style.display = '';
			text.style.webkitLineClamp = '';
		}
	});
	syncReviewHeight();
	window.addEventListener('resize', syncReviewHeight);
	/* end reviews swiper */

	/* start stats counters */
	function inView(el, topRatio, bottomRatio) {
		var rect = el.getBoundingClientRect();
		var vh = window.innerHeight || document.documentElement.clientHeight;
		return rect.top < vh * topRatio && rect.bottom > vh * bottomRatio;
	}
	function runCount(el) {
		var target = parseInt(el.getAttribute('data-count'), 10);
		var start = performance.now();
		var duration = 1750;
		function tick(now) {
			var progress = Math.min(1, (now - start) / duration);
			var eased = 1 - Math.pow(1 - progress, 3);
			el.textContent = Math.round(target * eased).toLocaleString('en-US');
			if (progress < 1) {
				window.requestAnimationFrame(tick);
			}
		}
		window.requestAnimationFrame(tick);
	}
	var counters = document.querySelectorAll('[data-count]');
	var stats = document.querySelector('.stats-card');
	var counted = false;
	function maybeCount() {
		if (counted || !stats || !counters.length) {
			return;
		}
		if (!inView(stats, 0.9, 0.1)) {
			return;
		}
		counted = true;
		Array.prototype.forEach.call(counters, runCount);
		window.removeEventListener('scroll', maybeCount);
		window.removeEventListener('resize', maybeCount);
	}
	if (stats && counters.length) {
		window.addEventListener('scroll', maybeCount, { passive: true });
		window.addEventListener('resize', maybeCount);
		maybeCount();
	}
	/* end stats counters */

	/* start logo grayscale → color */
	var logoSets = document.querySelectorAll('.logo-set');
	var logoMarquee = document.querySelector('.logo-marquee');
	if (logoSets.length) {
		var seed = logoSets[0].innerHTML;
		var guard = 0;
		while (logoSets[0].getBoundingClientRect().width < window.innerWidth + 80 && guard < 5) {
			Array.prototype.forEach.call(logoSets, function (set) {
				set.insertAdjacentHTML('beforeend', seed);
			});
			guard += 1;
		}
	}
	if (logoMarquee) {
		var logoImgs = logoMarquee.querySelectorAll('img');
		var paintLogos = function () {
			var box = logoMarquee.getBoundingClientRect();
			var mid = box.left + box.width / 2;
			var half = box.width / 2 || 1;
			Array.prototype.forEach.call(logoImgs, function (img) {
				var rect = img.getBoundingClientRect();
				var center = rect.left + rect.width / 2;
				var dist = Math.min(1, Math.abs(center - mid) / half);
				img.style.filter = 'grayscale(' + dist.toFixed(3) + ')';
			});
			window.requestAnimationFrame(paintLogos);
		};
		if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			paintLogos();
		}
	}
	/* end logo grayscale → color */

	/* start aos */
	if (window.AOS) {
		AOS.init({
			duration: 800,
			easing: 'ease-out',
			offset: 80,
			once: true
		});
	}
	/* end aos */
})();
