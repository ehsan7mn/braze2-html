/* scripts Design By Ehsan Mehdizadeh - Persiantik.net */
(function () {
	'use strict';

	var clamp = function (v, min, max) {
		return v < min ? min : (v > max ? max : v);
	};

	var smoother = null;
	if (window.gsap && window.ScrollTrigger && window.ScrollSmoother && document.querySelector('#smooth-content')) {
		window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollSmoother);
		window.ScrollTrigger.normalizeScroll(false);
		smoother = window.ScrollSmoother.create({
			smooth: 2,
			effects: false,
			smoothTouch: 0.1
		});
		window.gsap.ticker.lagSmoothing(0);
	}

	function getScroll() {
		if (smoother) {
			return smoother.scrollTop();
		}
		return window.pageYOffset || window.scrollY || document.documentElement.scrollTop || 0;
	}

	/* start hero slider — glitch from braze1-html */
	function initHeroGlitch(swiper) {
		var canvas = document.getElementById('heroGlitch');
		var hero = document.querySelector('.heroSec');
		var box = document.querySelector('.heroSwiper');
		if (!canvas || !hero || !box || !window.WebGLRenderingContext) {
			return function () {};
		}
		var gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
		if (!gl) {
			return function () {};
		}
		var sources = Array.prototype.map.call(document.querySelectorAll('.heroSlide'), function (slide) {
			var bg = slide.style.backgroundImage || '';
			var match = bg.match(/url\(["']?([^"')]+)["']?\)/);
			return match ? match[1] : '';
		}).filter(Boolean);
		if (!sources.length) {
			return function () {};
		}
		var images = [];
		var loaded = 0;
		var frames = [];
		var current = 0;
		var anim = null;
		var tex = [createTex(), createTex(), createTex()];
		var program = createProgram();
		if (!program) {
			return function () {};
		}
		var buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		var loc = {
			pos: gl.getAttribLocation(program, 'aPos'),
			tex: gl.getUniformLocation(program, 'uTex'),
			tex2: gl.getUniformLocation(program, 'uTex2'),
			disp: gl.getUniformLocation(program, 'uDisp'),
			factor: gl.getUniformLocation(program, 'uDispFactor'),
			effect: gl.getUniformLocation(program, 'uEffect')
		};
		uploadDisp();

		function createTex() {
			var texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			return texture;
		}

		function createProgram() {
			function shader(type, source) {
				var sh = gl.createShader(type);
				gl.shaderSource(sh, source);
				gl.compileShader(sh);
				if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
					return null;
				}
				return sh;
			}
			var vs = shader(gl.VERTEX_SHADER, 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}');
			var fs = shader(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 vUv;uniform sampler2D uTex;uniform sampler2D uTex2;uniform sampler2D uDisp;uniform float uDispFactor;uniform float uEffect;void main(){vec4 disp=texture2D(uDisp,vUv);vec2 p1=vec2(vUv.x+uDispFactor*(disp.r*uEffect),vUv.y);vec2 p2=vec2(vUv.x-(1.0-uDispFactor)*(disp.r*uEffect),vUv.y);gl_FragColor=mix(texture2D(uTex,p1),texture2D(uTex2,p2),uDispFactor);}');
			if (!vs || !fs) {
				return null;
			}
			var prog = gl.createProgram();
			gl.attachShader(prog, vs);
			gl.attachShader(prog, fs);
			gl.linkProgram(prog);
			if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
				return null;
			}
			return prog;
		}

		function uploadDisp() {
			var size = 256;
			var data = new Uint8Array(size * size * 4);
			var raw = [];
			var x;
			var y;
			for (y = 0; y < size; y++) {
				raw[y] = [];
				for (x = 0; x < size; x++) {
					raw[y][x] = (Math.sin(x * 0.37) * Math.cos(y * 0.23) + Math.sin((x + y) * 0.11) + 2) / 4;
				}
			}
			for (y = 0; y < size; y++) {
				for (x = 0; x < size; x++) {
					var sum = 0;
					var count = 0;
					var oy;
					var ox;
					for (oy = -2; oy <= 2; oy++) {
						for (ox = -2; ox <= 2; ox++) {
							sum += raw[Math.min(size - 1, Math.max(0, y + oy))][Math.min(size - 1, Math.max(0, x + ox))];
							count++;
						}
					}
					var value = Math.round((sum / count) * 255);
					var i = (y * size + x) * 4;
					data[i] = value;
					data[i + 1] = value;
					data[i + 2] = value;
					data[i + 3] = 255;
				}
			}
			gl.bindTexture(gl.TEXTURE_2D, tex[2]);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		}

		function cover(img) {
			var w = canvas.width;
			var h = canvas.height;
			var c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			var ctx = c.getContext('2d');
			var ir = img.naturalWidth / img.naturalHeight;
			var cr = w / h;
			var dw;
			var dh;
			var dx;
			var dy;
			if (ir > cr) {
				dh = h;
				dw = h * ir;
				dx = (w - dw) / 2;
				dy = 0;
			} else {
				dw = w;
				dh = w / ir;
				dx = 0;
				dy = (h - dh) / 2;
			}
			ctx.drawImage(img, dx, dy, dw, dh);
			return c;
		}

		function uploadImage(texture, source) {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		}

		function resize() {
			var rect = box.getBoundingClientRect();
			var w = Math.max(2, Math.round(rect.width));
			var h = Math.max(2, Math.round(rect.height));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			frames = images.map(cover);
			if (frames.length) {
				uploadImage(tex[0], frames[current] || frames[0]);
				uploadImage(tex[1], frames[current] || frames[0]);
				draw(0);
			}
		}

		function draw(factor, effect) {
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.useProgram(program);
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.enableVertexAttribArray(loc.pos);
			gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, tex[0]);
			gl.uniform1i(loc.tex, 0);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, tex[1]);
			gl.uniform1i(loc.tex2, 1);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, tex[2]);
			gl.uniform1i(loc.disp, 2);
			gl.uniform1f(loc.factor, factor);
			gl.uniform1f(loc.effect, effect === undefined ? 0.55 : effect);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}

		function go(index) {
			if (!frames.length || index === current) {
				return;
			}
			uploadImage(tex[0], frames[current]);
			uploadImage(tex[1], frames[index]);
			var from = current;
			current = index;
			if (anim) {
				cancelAnimationFrame(anim);
			}
			var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			var forward = index > from || (from === frames.length - 1 && index === 0);
			var effect = forward ? 0.55 : -0.55;
			if (reduce) {
				uploadImage(tex[0], frames[index]);
				draw(0, effect);
				return;
			}
			var start = performance.now();
			var duration = 1100;
			function step(now) {
				var t = Math.min(1, (now - start) / duration);
				var eased = 1 - Math.pow(1 - t, 3);
				draw(eased, effect);
				if (t < 1) {
					anim = requestAnimationFrame(step);
				} else {
					uploadImage(tex[0], frames[index]);
					draw(0, effect);
				}
			}
			anim = requestAnimationFrame(step);
		}

		sources.forEach(function (src, index) {
			var img = new Image();
			img.onload = function () {
				images[index] = img;
				loaded += 1;
				if (loaded === sources.length) {
					hero.classList.add('is-glitch');
					box.classList.add('is-glitch');
					resize();
					window.addEventListener('resize', resize);
				}
			};
			img.src = src;
		});

		swiper.on('slideChangeTransitionStart', function () {
			if (loaded === sources.length) {
				go(swiper.realIndex);
			}
		});
		return go;
	}

	if (window.Swiper && document.querySelector('.heroSwiper')) {
		var heroCount = document.querySelectorAll('.heroSwiper .swiper-slide').length || 3;
		var heroIndex = 0;
		var heroTimer = null;
		var heroSwiper = new Swiper('.heroSwiper', {
			loop: false,
			effect: 'fade',
			fadeEffect: { crossFade: true },
			speed: 0,
			autoplay: false
		});
		var heroGlitchGo = initHeroGlitch(heroSwiper);
		function heroGo(index) {
			var next = ((index % heroCount) + heroCount) % heroCount;
			heroIndex = next;
			heroSwiper.slideTo(heroIndex, 0, true);
			if (typeof heroGlitchGo === 'function') {
				heroGlitchGo(heroIndex);
			}
		}
		function heroArm() {
			if (heroTimer) {
				window.clearInterval(heroTimer);
			}
			heroTimer = window.setInterval(function () {
				heroGo(heroIndex + 1);
			}, 4500);
		}
		var heroPrev = document.querySelector('.heroArrow--prev');
		var heroNext = document.querySelector('.heroArrow--next');
		if (heroPrev) {
			heroPrev.addEventListener('click', function (e) {
				e.preventDefault();
				e.stopPropagation();
				heroGo(heroIndex - 1);
				heroArm();
			});
		}
		if (heroNext) {
			heroNext.addEventListener('click', function (e) {
				e.preventDefault();
				e.stopPropagation();
				heroGo(heroIndex + 1);
				heroArm();
			});
		}
		heroArm();
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
			if (e.clientY < 120) {
				light.style.opacity = '0';
			} else if (light.classList.contains('lightBlock_active')) {
				light.style.opacity = '';
			}
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
	var parallaxScrollTriggers = [];
	var visionCards = document.querySelectorAll('[data-vision-card]');
	var revealTitles = document.querySelectorAll('.revealWords');

	function clearParallaxTriggers() {
		while (parallaxScrollTriggers.length) {
			parallaxScrollTriggers.pop().kill();
		}
		Array.prototype.forEach.call(parallaxItems, function (item) {
			if (window.gsap) {
				window.gsap.set(item, { clearProps: 'transform' });
			}
		});
	}

	function parallaxTriggerEl(item, holder) {
		if (holder.closest('.consultSec')) {
			return holder.closest('.consultSec');
		}
		return holder;
	}

	function initParallaxTriggers() {
		clearParallaxTriggers();
		if (!window.gsap || !window.ScrollTrigger) {
			return;
		}
		Array.prototype.forEach.call(parallaxItems, function (item) {
			var holder = item.parentElement;
			if (!holder) {
				return;
			}
			var extra = item.offsetHeight - holder.offsetHeight;
			if (extra <= 0) {
				return;
			}
			var triggerEl = parallaxTriggerEl(item, holder);
			var fromPos = 'center 0%';
			var toPos = 'center 100%';
			if (holder.closest('.footerBox--lg')) {
				fromPos = 'center 100%';
				toPos = 'center 0%';
			}
			var tween = window.gsap.fromTo(
				item,
				{ backgroundPosition: fromPos },
				{
					backgroundPosition: toPos,
					ease: 'none',
					scrollTrigger: {
						trigger: triggerEl,
						start: 'top bottom',
						end: 'bottom top',
						scrub: true,
						invalidateOnRefresh: true
					}
				}
			);
			if (tween.scrollTrigger) {
				parallaxScrollTriggers.push(tween.scrollTrigger);
			}
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

	var navOuter = document.querySelector('.navOuter');
	function updateNavOnLight() {
		if (!navOuter || !heroSec) {
			return;
		}
		var navBox = navOuter.getBoundingClientRect();
		var heroBox = heroSec.getBoundingClientRect();
		var grayBandTop = heroBox.bottom - 140;
		var onTail = navBox.bottom > grayBandTop && navBox.top < heroBox.bottom + 8;
		var grayFromDissolve = heroBox.bottom - clamp(dissolveProgress * 1.2, 0, 1) * heroBox.height;
		var onDissolve = navBox.bottom > grayFromDissolve && navBox.top < heroBox.bottom;
		navOuter.classList.toggle('isOnLight', onTail || onDissolve);
	}

	var ticking = false;
	var productsPin = document.querySelector('.productsPin');
	var productsHead = document.querySelector('.productsHead');
	var productsList = document.querySelector('.productsSec .col-lg-7');
	var productsPinTrigger = null;

	function productsHeadInnerWidth() {
		if (!productsPin || !productsHead) {
			return 0;
		}
		var cs = window.getComputedStyle(productsPin);
		var padL = parseFloat(cs.paddingLeft) || 0;
		var padR = parseFloat(cs.paddingRight) || 0;
		return Math.max(productsPin.clientWidth - padL - padR, 0);
	}

	function lockProductsHeadWidth() {
		if (!productsHead) {
			return;
		}
		var w = productsHeadInnerWidth();
		if (w) {
			productsHead.style.width = w + 'px';
			productsHead.style.maxWidth = w + 'px';
		}
	}

	function unlockProductsHeadWidth() {
		if (!productsHead) {
			return;
		}
		productsHead.style.width = '';
		productsHead.style.maxWidth = '';
	}

	function clearProductsPinTrigger() {
		if (productsPinTrigger) {
			productsPinTrigger.kill();
			productsPinTrigger = null;
		}
		unlockProductsHeadWidth();
		if (productsPin) {
			productsPin.style.width = '';
			productsPin.style.maxWidth = '';
		}
	}

	function syncProductsPinHeight() {
		if (!productsPin || !productsList || window.innerWidth < 992) {
			if (productsPin) {
				productsPin.style.minHeight = '';
			}
			return;
		}
		var listH = productsList.offsetHeight;
		if (listH) {
			productsPin.style.minHeight = listH + 'px';
		}
	}

	function initProductsPin() {
		clearProductsPinTrigger();
		syncProductsPinHeight();
		if (!productsPin || !productsHead || !productsList || !window.ScrollTrigger) {
			return;
		}
		if (window.innerWidth < 992) {
			return;
		}
		var pinScroll = Math.max(
			productsList.offsetHeight - productsHead.offsetHeight - 20,
			0
		);
		productsPinTrigger = window.ScrollTrigger.create({
			trigger: productsPin,
			start: 'top 140px',
			end: '+=' + pinScroll,
			pin: productsHead,
			pinSpacing: false,
			anticipatePin: 1,
			invalidateOnRefresh: true,
			onEnter: lockProductsHeadWidth,
			onEnterBack: lockProductsHeadWidth,
			onRefresh: function (self) {
				if (self.isActive) {
					lockProductsHeadWidth();
				}
			},
			onLeave: unlockProductsHeadWidth,
			onLeaveBack: unlockProductsHeadWidth
		});
	}

	function refreshScrollLayout() {
		syncProductsPinHeight();
		initProductsPin();
		initParallaxTriggers();
		if (window.ScrollTrigger) {
			window.ScrollTrigger.refresh();
		}
	}

	function update() {
		var viewport = window.innerHeight;
		updateVisionCards(viewport);
		updateRevealTitles(viewport);
		updateDissolve();
		updateNavOnLight();
		ticking = false;
	}

	function requestUpdate() {
		if (!ticking) {
			ticking = true;
			window.requestAnimationFrame(update);
		}
	}

	if (!smoother) {
		window.addEventListener('scroll', requestUpdate, { passive: true });
	}
	window.addEventListener('resize', function () {
		refreshScrollLayout();
		requestUpdate();
	});
	window.addEventListener('load', function () {
		refreshScrollLayout();
		window.setTimeout(refreshScrollLayout, 150);
		window.setTimeout(refreshScrollLayout, 600);
		requestUpdate();
	});
	if (window.gsap) {
		window.gsap.ticker.add(requestUpdate);
	}
	refreshScrollLayout();
	update();
	/* end scroll driven effects */

	/* start reviews swiper */
	if (window.Swiper && document.querySelector('.review-swiper')) {
		new Swiper('.review-swiper', {
			slidesPerView: 2,
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
				768: { slidesPerView: 2 }
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
		card.style.height = 'auto';
		card.style.setProperty('--full', card.scrollHeight + 'px');
		card.style.height = '';
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

	/* start Lumna cursor + hover-this */
	var cursor = document.querySelector('.cursor');
	if (cursor) {
		window.addEventListener('mousemove', function (e) {
			cursor.style.left = e.clientX + 'px';
			cursor.style.top = e.clientY + 'px';
		});
		document.addEventListener('mouseover', function (e) {
			if (e.target.closest('a, button, .cursor-pointer')) {
				cursor.classList.add('cursor-active');
			}
		});
		document.addEventListener('mouseout', function (e) {
			var link = e.target.closest('a, button, .cursor-pointer');
			if (link && !link.contains(e.relatedTarget)) {
				cursor.classList.remove('cursor-active');
			}
		});
	}
	Array.prototype.forEach.call(document.querySelectorAll('.hover-this'), function (item) {
		var hoverAnim = item.querySelector('.hover-anim');
		if (!hoverAnim) {
			return;
		}
		item.addEventListener('mousemove', function (e) {
			var x = e.offsetX;
			var y = e.offsetY;
			var move = 100;
			var xMove = x / item.offsetWidth * (move * 2) - move;
			var yMove = y / item.offsetHeight * (move * 2) - move;
			hoverAnim.style.transform = 'translate(' + xMove + 'px, ' + yMove + 'px)';
		});
		item.addEventListener('mouseleave', function () {
			hoverAnim.style.transform = '';
		});
	});
	/* end Lumna cursor + hover-this */

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
