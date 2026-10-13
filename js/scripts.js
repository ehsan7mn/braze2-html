/* scripts Design By Ehsan Mehdizadeh - Persiantik.net */
(function () {
	'use strict';

	var clamp = function (v, min, max) {
		return v < min ? min : (v > max ? max : v);
	};

	/* start scroll smoother — Vexium / Lumna #smooth-wrapper + #smooth-content */
	var smoother = null;
	if (window.gsap && window.ScrollTrigger && window.ScrollSmoother && document.querySelector('#smooth-content')) {
		window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollSmoother);
		window.ScrollTrigger.normalizeScroll(false);
		smoother = window.ScrollSmoother.create({
			wrapper: '#smooth-wrapper',
			content: '#smooth-content',
			smooth: 2,
			effects: true
		});
	}

	function getScroll() {
		if (smoother) {
			return smoother.scrollTop();
		}
		return window.pageYOffset || window.scrollY || 0;
	}
	/* end scroll smoother */

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

	var DISSOLVE_COLOR = [0.882, 0.882, 0.882]; /* #e1e1e1, Vexium CONFIG.color */
	var DISSOLVE_SPREAD = 0.5;
	var DISSOLVE_SPEED = 0.3;

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
			width = Math.round(section.offsetWidth * ratio);
			height = Math.round(section.offsetHeight * ratio);
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

	var heroSec = document.querySelector('.heroSec');
	var drawDissolve = heroSec ? createDissolve(heroSec) : null;
	var dissolveProgress = 0;
	/* end braze dissolve */

	/* start title underline — in from the right, out to the left */
	Array.prototype.forEach.call(document.querySelectorAll('.titleLink'), function (link) {
		link.addEventListener('mouseenter', function () {
			link.classList.remove('titleLink--out');
			link.classList.add('titleLink--in');
		});
		link.addEventListener('mouseleave', function () {
			link.classList.remove('titleLink--in');
			link.classList.add('titleLink--out');
		});
	});
	/* end title underline */

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
			if (item.hasAttribute('data-speed')) {
				return;
			}
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

	function updateDissolve() {
		if (!drawDissolve || !heroSec) {
			return;
		}
		/* Vexium script-hero1.js: (scroll / (heroH - viewport)) * 0.3, capped at 1.1 */
		var maxScroll = Math.max(heroSec.offsetHeight - window.innerHeight, 1);
		dissolveProgress = Math.min((getScroll() / maxScroll) * DISSOLVE_SPEED, 1.1);
		drawDissolve(dissolveProgress);
	}

	var ticking = false;

	function update() {
		var viewport = window.innerHeight;
		updateParallax(viewport);
		updateVisionCards(viewport);
		updateRevealTitles(viewport);
		updateDissolve();
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
	if (window.gsap) {
		window.gsap.ticker.add(requestUpdate);
	}
	update();

	if (smoother && window.ScrollTrigger && document.querySelector('.productsHead')) {
		window.ScrollTrigger.matchMedia({
			'(min-width: 992px)': function () {
				var pin = window.ScrollTrigger.create({
					trigger: '.productsHead',
					start: 'top 140px',
					endTrigger: '.productsSec',
					end: 'bottom bottom',
					pin: true,
					pinSpacing: false,
					pinType: 'transform',
					anticipatePin: 1,
					invalidateOnRefresh: true
				});
				window.ScrollTrigger.refresh();
				return function () {
					pin.kill();
				};
			}
		});
		window.addEventListener('load', function () {
			window.ScrollTrigger.refresh();
		});
	}
	/* end scroll driven effects */

	/* start blog glitch — Lumna journal hover-effect, raw WebGL, no Three/GSAP */
	var GLITCH_VERT = [
		'attribute vec2 aPos;',
		'varying vec2 vUv;',
		'void main() {',
		'  vUv = aPos * 0.5 + 0.5;',
		'  gl_Position = vec4(aPos, 0.0, 1.0);',
		'}'
	].join('\n');

	var GLITCH_FRAG = [
		'precision highp float;',
		'varying vec2 vUv;',
		'uniform float dispFactor;',
		'uniform sampler2D disp;',
		'uniform sampler2D texture1;',
		'uniform sampler2D texture2;',
		'uniform float angle1;',
		'uniform float angle2;',
		'uniform float intensity1;',
		'uniform float intensity2;',
		'uniform vec2 uCover;',
		'mat2 getRotM(float angle) {',
		'  float s = sin(angle);',
		'  float c = cos(angle);',
		'  return mat2(c, -s, s, c);',
		'}',
		'void main() {',
		'  vec4 dispCol = texture2D(disp, vUv);',
		'  vec2 dispVec = vec2(dispCol.r, dispCol.g);',
		'  vec2 myUV = (vUv - vec2(0.5)) * uCover + vec2(0.5);',
		'  vec2 distortedPosition1 = myUV + getRotM(angle1) * dispVec * intensity1 * dispFactor;',
		'  vec2 distortedPosition2 = myUV + getRotM(angle2) * dispVec * intensity2 * (1.0 - dispFactor);',
		'  vec4 _texture1 = texture2D(texture1, distortedPosition1);',
		'  vec4 _texture2 = texture2D(texture2, distortedPosition2);',
		'  gl_FragColor = mix(_texture1, _texture2, dispFactor);',
		'}'
	].join('\n');

	function expoOut(t) {
		return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
	}

	function loadGlTexture(gl, url, wrap, onLoad) {
		var tex = gl.createTexture();
		var img = new Image();
		img.onload = function () {
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
			onLoad(tex, img);
		};
		img.src = url;
		return tex;
	}

	function createBlogGlitch(media) {
		var images = media.querySelectorAll('.blogItem__img');
		if (images.length < 2) {
			return;
		}
		var img1 = images[0];
		var img2 = images[1];
		var dispUrl = media.getAttribute('data-displacement') || 'img/heightMap.png';
		var canvas = document.createElement('canvas');
		var gl = canvas.getContext('webgl', {
			alpha: false,
			antialias: false,
			premultipliedAlpha: false,
			preserveDrawingBuffer: true
		});
		if (!gl) {
			return;
		}

		var vs = compile(gl, gl.VERTEX_SHADER, GLITCH_VERT);
		var fs = compile(gl, gl.FRAGMENT_SHADER, GLITCH_FRAG);
		if (!vs || !fs) {
			return;
		}
		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			return;
		}
		gl.useProgram(program);

		var buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		var aPos = gl.getAttribLocation(program, 'aPos');
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		var uDispFactor = gl.getUniformLocation(program, 'dispFactor');
		var uCover = gl.getUniformLocation(program, 'uCover');
		var uAngle1 = gl.getUniformLocation(program, 'angle1');
		var uAngle2 = gl.getUniformLocation(program, 'angle2');
		var uInt1 = gl.getUniformLocation(program, 'intensity1');
		var uInt2 = gl.getUniformLocation(program, 'intensity2');
		gl.uniform1i(gl.getUniformLocation(program, 'texture1'), 0);
		gl.uniform1i(gl.getUniformLocation(program, 'texture2'), 1);
		gl.uniform1i(gl.getUniformLocation(program, 'disp'), 2);
		gl.uniform1f(uAngle1, Math.PI / 4);
		gl.uniform1f(uAngle2, -3 * Math.PI / 4);
		gl.uniform1f(uInt1, 0.5);
		gl.uniform1f(uInt2, 0.5);

		var tex1 = null;
		var tex2 = null;
		var texDisp = null;
		var ready = 0;
		var ratio = 1;
		var dispFactor = 0;
		var animFrom = 0;
		var animTo = 0;
		var animStart = 0;
		var animDur = 1;
		var raf = 0;

		function coverSize() {
			var w = media.clientWidth;
			var h = media.clientHeight;
			if (h / w < ratio) {
				gl.uniform2f(uCover, 1, (h / w) / ratio);
			} else {
				gl.uniform2f(uCover, (w / h) * ratio, 1);
			}
		}

		function resize() {
			var dpr = Math.min(window.devicePixelRatio || 1, 2);
			var w = Math.max(1, media.clientWidth);
			var h = Math.max(1, media.clientHeight);
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			gl.viewport(0, 0, canvas.width, canvas.height);
			coverSize();
			draw();
		}

		function draw() {
			if (ready < 3) {
				return;
			}
			gl.uniform1f(uDispFactor, dispFactor);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, tex1);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, tex2);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, texDisp);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			canvas.dataset.disp = String(dispFactor);
		}

		function tick(now) {
			var t = clamp((now - animStart) / (animDur * 1000), 0, 1);
			dispFactor = animFrom + (animTo - animFrom) * expoOut(t);
			draw();
			if (t < 1) {
				raf = window.requestAnimationFrame(tick);
			} else {
				raf = 0;
				dispFactor = animTo;
			}
		}

		function go(to, duration) {
			if (raf) {
				window.cancelAnimationFrame(raf);
			}
			animFrom = dispFactor;
			animTo = to;
			animDur = duration;
			animStart = performance.now();
			raf = window.requestAnimationFrame(tick);
		}

		function onReady() {
			ready += 1;
			if (ready < 3) {
				return;
			}
			media.appendChild(canvas);
			media.classList.add('hasGlitch');
			resize();
			draw();
		}

		function bindTex(unitSetter) {
			return function (tex, img) {
				unitSetter(tex, img);
				onReady();
			};
		}

		loadGlTexture(gl, img1.src, gl.CLAMP_TO_EDGE, bindTex(function (tex, img) {
			tex1 = tex;
			if (img.naturalWidth) {
				ratio = img.naturalHeight / img.naturalWidth;
			}
		}));
		loadGlTexture(gl, img2.src, gl.CLAMP_TO_EDGE, bindTex(function (tex) {
			tex2 = tex;
		}));
		loadGlTexture(gl, dispUrl, gl.CLAMP_TO_EDGE, bindTex(function (tex) {
			texDisp = tex;
		}));

		media._glitchGo = go;
		var item = media.closest('.blogItem') || media;
		item.addEventListener('mouseenter', function () {
			go(1, 1.6);
		});
		item.addEventListener('mouseleave', function () {
			go(0, 1.2);
		});
		window.addEventListener('resize', resize);
	}

	Array.prototype.forEach.call(document.querySelectorAll('.blogItem__media'), createBlogGlitch);
	/* end blog glitch */

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
