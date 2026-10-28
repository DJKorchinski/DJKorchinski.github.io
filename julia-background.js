(() => {
  "use strict";

  const canvas = document.getElementById("julia-background");
  const gl = canvas && canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false
  });
  if (!gl) return;

  // WebGL 1 port of fractals02/shaders/coord_vert.glsl.
  const vertexSource = `
    attribute vec2 position;
    varying vec2 s0;

    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
      s0 = position;
    }
  `;

  // Port of fractals02/shaders/julia_frag.glsl. WebGL 1 has no sampler1D,
  // so the original 256 x 1 palette is sampled as a 2D texture instead.
  const fragmentSource = `
    precision highp float;

    varying vec2 s0;
    uniform mat4 view;
    uniform sampler2D palette;

    // The desktop renderer uses 300. A lower fixed ceiling avoids expensive
    // WebGL 1 loop unrolling while retaining the same escape/color formula.
    const int MAX_ITERATIONS = 96;
    const float LOG_MAX_ITERATIONS = 4.564348191;

    void main() {
      vec4 zc = view * vec4(s0, 1.0, 0.0);
      vec2 z = zc.xy;
      vec2 c = zc.zw;
      vec2 squares = vec2(0.0);
      float xy = 0.0;
      int iteration = MAX_ITERATIONS;

      for (int i = 0; i < MAX_ITERATIONS; i++) {
        squares = z * z;
        if (squares.x + squares.y > 4.0) {
          iteration = i;
          break;
        }
        xy = z.x * z.y;
        z.x = squares.x - squares.y + c.x;
        z.y = 2.0 * xy + c.y;
      }

      if (iteration == MAX_ITERATIONS) {
        gl_FragColor = texture2D(palette, vec2(0.0, 0.5));
        return;
      }
      float logarithmicIteration = iteration == 0
        ? 0.0
        : log(float(iteration + 1));
      float paletteCoordinate = logarithmicIteration / LOG_MAX_ITERATIONS
        - log(log((squares.x + squares.y) / 2.0)) / 10.0;
      gl_FragColor = texture2D(palette, vec2(paletteCoordinate, 0.5));
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Fractal shader failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Fractal shader program failed:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // One oversized triangle covers the viewport without a diagonal seam.
  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  // Exact RGB values from fractals02/resources/pal2.png. Embedding its one row
  // avoids another request and keeps the background implementation portable.
  const paletteHex =
    "000000000000000402000c0800100c00181000201600241a002c1e00302200382800402d004430004c3500503800583e" +
    "006043006447016d4e017555027a580383610689690993750d9c8211a28e15aa9b1aaea71fb4b222b8bc25bac227bec7" +
    "27c1ca26c1c924c1c920c4c81cc5c718c8c613cac60ecbc50ad0cb07d1d004d6d503d4d901d0d901cddc00c9dc00c6e0" +
    "00bfe000bae000b8e400b3e400b1e800ade800a5e800a7ec009fec009bf00097f0008ff00091f40089f4008bf80083f8" +
    "0080fc0482fc0c87fc1489fc1c8ffc2491fc2c96fc349bfc3c9dfc44a3fc4ca5fc54abfc5cb0fc64b1fc6cb7fc74b8fc" +
    "7cbffc84c4fc8cc5fc94cbfc9ccdfca4d2fcacd8fcb4dafcbcdffcc4e1fccce6fcd4ecfcdceefce4f3fcecf4fcf4fafc" +
    "fcfcfcf8fafcf4f6fcf0f4fce8eefce4ebfce0e8fcd8e2fcd4e0fcd0defcc8d8fcc4d5fcc0d2fcb8ccfcb4cafcb0c7fc" +
    "a8c1fca4befca0bcfc9cb9fc94b3fc90b0fc8caefc84a8fc80a5fc7ca3fc749dfc709afc6c97fc6492fc608ffc5c8bfc" +
    "5487fc5084fc4c81fc487dfc4079fc3c76fc3873fc306dfc2c6bfc2867fc2062fc1c5ffc185dfc1057fc0c54fc0851fc" +
    "004bfc004ffc0054fc0058fc005ffc0063fc0067fc006ffc0073fc0078fc0080fc0084fc0087fc008ffc0093fc0097fc" +
    "009efc00a2fc00a7fc00abfc00b3fc00b7fc00bbfc00c3fc00c6fc00cbfc00d3fc00d7fc00dbfc00e2fc00e6fc00eafc" +
    "00f2fc00f6fc00fbfc00fcf700fcf000fcec00fce800fce000fcdc00fcd800fcd000fccc00fcc800fcc000fcbc00fcb8" +
    "00fcb100f8ad00f4ab00f0a800eca500e8a300e49f00e09d00dc9a00d89700d49500d09100cc8f00c88c00c48900c087" +
    "00bc8300b88100b47e00b07b00ac7800a87500a47300a070009c6d00986a009467009065008c6200885f00845c008059" +
    "007c5700785400745200704e006c4c006849006446006043005c4000583e00543b005038004c3500483200443000402d" +
    "003c2a003828003424003022002c1e00281c00241a002016001c1400181000140e00100c000c08000806000000000000";
  const palettePixels = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    palettePixels[i * 4] = parseInt(paletteHex.slice(i * 6, i * 6 + 2), 16);
    palettePixels[i * 4 + 1] = parseInt(paletteHex.slice(i * 6 + 2, i * 6 + 4), 16);
    palettePixels[i * 4 + 2] = parseInt(paletteHex.slice(i * 6 + 4, i * 6 + 6), 16);
    palettePixels[i * 4 + 3] = 255;
  }
  const paletteTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, palettePixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, "palette"), 0);

  const viewLocation = gl.getUniformLocation(program, "view");

  // Direct transcription of fractals02/coollocs.dat:
  // [z center x/y, c center x/y, theta1, theta2, magnification].
  const locations = [
    [-5.522944193495008e-7,-2.443191557976204e-8,-.4162620920023379,-.01841423692608506,1.570795,0,1.071785584691794],
    [0,0,.3511111111111107,-.07888888888888891,0,0,1.215084774034758],
    [0,0,.4246912446498822,-.1578693992011482,0,0,1.215084774034758],
    [0,0,-.6563947546362363,-.4019437276593542,0,0,1.215084774034758],
    [0,0,-.7488762068822151,-.4120694341096438,0,0,1.215084774034758],
    [-.6853581874227648,-.08769866556640521,.1384304056347188,.07695817356369865,-2.788939270087498,0,1.219547628855445],
    [0,0,.388888888888889,-.2155555555555556,0,0,2],
    [0,0,.4088888888888886,.16,0,0,1.277383502589409],
    [0,0,-.7271357875608362,.263587709368314,0,0,1.277383502589331],
    [0,0,-.8248933392182183,.0006737287679105329,0,0,1.277383502589331],
    [.009075693398146841,.03097104049324608,-1.400604782047581,.00007159664363674489,.0005592347969099326,0,1.14103924973381],
    [0,0,.3650139248346699,-.1238817759843398,.04205943487214455,0,.6746781705979461],
    [.4131072249072059,-.1072770413073952,.3744563896527228,-.1408565339422337,.8392590312924147,0,.005198068361442148],
    [0,0,0,0,1.570795,0,1.999999997905261],
    [0,0,0,0,1.46517256040731,0,2]
  ];

  // A deterministic tour of the saved views. Repeated entries create the same
  // pause/orbit effect as the extra repeated tween points in camera_timestep().
  const route = [13,14,0,0,1,2,7,7,8,9,3,4,4,5,10,11,11,12,13];
  const secondsPerLocation = 7;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let frameRequest = 0;
  let resizeTimer = 0;
  let lastFrame = -Infinity;
  const panel = document.querySelector(".center_content");
  const controls = document.querySelector(".fractal_controls");
  const resumeButton = document.getElementById("fractal-resume");
  const instructions = document.getElementById("fractal-instructions");
  const panelToggle = document.getElementById("main-panel-toggle");
  const instructionsToggle = document.getElementById("fractal-instructions-toggle");
  const coarsePointer = matchMedia("(pointer: coarse)");
  const isMac = /Mac/.test(navigator.platform || navigator.userAgent);
  let touchInput = coarsePointer.matches;
  let nativeGestures = false;
  let nativeGesture = null;

  function updateInstructions() {
    const navigation = touchInput
      ? "Drag to pan · Two-finger drag to shift in 4D · Pinch to zoom · Twist to rotate"
      : isMac
        ? "Drag to pan · Secondary-click drag to shift in 4D · Scroll / pinch to zoom · Q/E to rotate"
        : "Drag to pan · Right-drag to shift in 4D · Scroll to zoom · Q/E to rotate";
    instructions.textContent = navigation
      + (!touchInput && nativeGestures ? " · Twist to rotate" : "")
      + (touchInput ? " · Resume tour below" : " · Space to pause/resume · Enter to show/hide instructions · Esc to show/hide main content");
    for (const [toggle, label, shortcut] of [
      [panelToggle, "Show or hide profile and research information", "Escape"],
      [instructionsToggle, "Show or hide fractal instructions", "Enter"]
    ]) {
      const description = label + (touchInput ? "" : ` (${shortcut === "Escape" ? "Esc" : shortcut})`);
      toggle.setAttribute("aria-label", description);
      toggle.title = description;
      if (touchInput) toggle.removeAttribute("aria-keyshortcuts");
      else toggle.setAttribute("aria-keyshortcuts", shortcut);
    }
  }
  updateInstructions();
  coarsePointer.addEventListener?.("change", () => {
    touchInput = coarsePointer.matches;
    updateInstructions();
  });
  let camera = cameraAt(0);
  let tourTime = 0;
  let automatic = !reducedMotion.matches;
  let returning = null;
  let previousTime = null;
  const pointers = new Map();
  const keys = new Set();
  const interactive = () => !panel.open;

  function resize() {
    // The desktop version supersamples; for a decorative background, render a
    // smaller buffer and let the browser upscale it.
    const scale = innerWidth < 700 ? 0.24 : 0.52;
    const width = Math.max(1, Math.round(innerWidth * scale));
    const height = Math.max(1, Math.round(innerHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function catmullRom(a, b, c, d, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * ((2 * b) + (-a + c) * t
      + (2*a - 5*b + 4*c - d) * t2
      + (-a + 3*b - 3*c + d) * t3);
  }

  function cameraAt(time) {
    const progress = time / secondsPerLocation;
    const index = Math.floor(progress) % route.length;
    const t = progress - Math.floor(progress);
    const state = new Float64Array(7);
    const a = locations[route[(index - 1 + route.length) % route.length]];
    const b = locations[route[index]];
    const c = locations[route[(index + 1) % route.length]];
    const d = locations[route[(index + 2) % route.length]];
    for (let component = 0; component < 7; component++) {
      state[component] = catmullRom(a[component], b[component], c[component], d[component], t);
    }
    return state;
  }

  // Equivalent to camera_build_view_matrix(). The final column is the 4D
  // centroid; theta1 rotates the displayed plane between z and c dimensions.
  function buildView(camera) {
    const [zx, zy, cx, cy, theta1, theta2, magnification] = camera;
    const aspect = canvas.width / canvas.height;
    const cos1 = Math.cos(theta1);
    const sin1 = Math.sin(theta1);
    const cos2 = Math.cos(theta2);
    const sin2 = Math.sin(theta2);
    const mx = magnification * aspect;
    const my = magnification;

    return new Float32Array([
      cos1*mx*cos2, cos1*mx*sin2, sin1*mx*cos2, sin1*mx*sin2,
      -cos1*my*sin2, cos1*my*cos2, -sin1*my*sin2, sin1*my*cos2,
      zx, zy, cx, cy,
      0, 0, 0, 1
    ]);
  }

  function render() {
    resize();
    gl.uniformMatrix4fv(viewLocation, false, buildView(camera));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function animate(milliseconds) {
    frameRequest = 0;
    const dt = previousTime === null ? 0 : Math.min((milliseconds - previousTime) / 1000, .1);
    previousTime = milliseconds;
    if (automatic) {
      tourTime += dt;
      const target = cameraAt(tourTime);
      if (returning) {
        returning.elapsed += dt;
        const t = Math.min(1, returning.elapsed / 3);
        // Quintic spline has zero first and second derivatives at either end.
        const blend = t*t*t*(10 + t*(-15 + 6*t));
        camera = Float64Array.from(target, (value, i) => returning.from[i]*(1-blend) + value*blend);
        if (t === 1) returning = null;
      } else camera = target;
    }
    if (interactive()) camera[4] += ((keys.has("e") ? 1 : 0) - (keys.has("q") ? 1 : 0)) * dt / Math.PI;
    if (milliseconds - lastFrame >= 83) { // About 12 fps is ample behind text.
      render();
      lastFrame = milliseconds;
    }
    if (automatic || keys.size) frameRequest = requestAnimationFrame(animate);
    else previousTime = null;
  }

  function start() {
    if (document.hidden || (!automatic && !keys.size)) {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      previousTime = null;
    }
    if (document.hidden) return;
    render();
    // Input can redraw immediately without resetting a held key's clock.
    if ((automatic || keys.size) && !frameRequest) frameRequest = requestAnimationFrame(animate);
  }

  function pause() {
    automatic = false;
    returning = null;
    resumeButton.disabled = false;
  }

  function resume() {
    if (automatic) return;
    pointers.clear();
    keys.clear();
    returning = { from: camera.slice(), elapsed: 0 };
    // Choose the nearest equivalent orientation, avoiding needless full turns.
    const target = cameraAt(tourTime);
    for (const i of [4, 5]) returning.from[i] = target[i] + Math.atan2(Math.sin(camera[i]-target[i]), Math.cos(camera[i]-target[i]));
    automatic = true;
    resumeButton.disabled = true;
    start();
  }

  function translate(dx, dy, perpendicular = false) {
    const view = buildView(camera);
    const x = -2 * dx / innerWidth;
    const y = 2 * dy / innerHeight;
    const shift = Array.from({ length: 4 }, (_, i) => view[i]*x + view[i+4]*y);
    for (let i = 0; i < 4; i++) camera[i] += perpendicular ? .3 * shift[(i+2)%4] : shift[i];
  }

  function zoom(factor) {
    camera[6] = Math.max(.00001, Math.min(8, Math.abs(camera[6]) * factor));
  }

  function gesture() {
    const [a, b] = [...pointers.values()];
    if (!b) return { x: a.x, y: a.y };
    return { x: (a.x+b.x)/2, y: (a.y+b.y)/2,
      distance: Math.hypot(b.x-a.x, b.y-a.y), angle: Math.atan2(b.y-a.y, b.x-a.x) };
  }

  canvas.addEventListener("pointerdown", event => {
    if (!interactive() || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault();
    touchInput = event.pointerType === "touch";
    updateInstructions();
    pause();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, right: event.button === 2 });
    canvas.setPointerCapture(event.pointerId);
    start();
  });
  canvas.addEventListener("pointermove", event => {
    if (!interactive() || !pointers.has(event.pointerId)) return;
    if (nativeGesture) return; // Avoid applying a touch gesture twice.
    const before = gesture();
    const point = pointers.get(event.pointerId);
    const right = point.right;
    point.x = event.clientX;
    point.y = event.clientY;
    const after = gesture();
    translate(after.x-before.x, after.y-before.y, pointers.size > 1 || right);
    if (before.distance && after.distance) {
      zoom(before.distance / after.distance);
      camera[4] += Math.atan2(Math.sin(after.angle-before.angle), Math.cos(after.angle-before.angle));
    }
    render();
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(name, event => pointers.delete(event.pointerId));
  }
  canvas.addEventListener("contextmenu", event => { if (interactive()) event.preventDefault(); });
  // Safari exposes trackpad rotation through gesture events. Other browsers
  // retain Q/E; wheel events alone cannot reliably identify a trackpad twist.
  canvas.addEventListener("gesturestart", event => {
    if (!interactive()) return;
    event.preventDefault();
    pause();
    nativeGestures = true;
    nativeGesture = { scale: event.scale, rotation: event.rotation };
    updateInstructions();
    start();
  }, { passive: false });
  canvas.addEventListener("gesturechange", event => {
    if (!interactive() || !nativeGesture) return;
    event.preventDefault();
    if (event.scale > 0 && nativeGesture.scale > 0) zoom(nativeGesture.scale / event.scale);
    camera[4] += (event.rotation - nativeGesture.rotation) * Math.PI / 180;
    nativeGesture = { scale: event.scale, rotation: event.rotation };
    render();
  }, { passive: false });
  canvas.addEventListener("gestureend", event => {
    if (nativeGesture) event.preventDefault();
    nativeGesture = null;
    pointers.clear();
  }, { passive: false });
  canvas.addEventListener("wheel", event => {
    if (!interactive()) return;
    event.preventDefault();
    if (nativeGesture) return;
    pause();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    zoom(Math.exp(Math.max(-1, Math.min(1, delta * .001))));
    start();
  }, { passive: false });
  document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest("input, textarea, select, [contenteditable]")) return;
    // Handle these before the browser activates a focused <summary>.
    if (event.key === "Escape") {
      event.preventDefault();
      if (!event.repeat) {
        panel.open = !panel.open;
        syncPanel();
        panelToggle.focus({ preventScroll: true });
      }
      return;
    }
    if (event.key === "Enter" && (interactive() || event.target === panelToggle)) {
      event.preventDefault();
      if (!event.repeat && interactive()) {
        controls.open = !controls.open;
        instructionsToggle.focus({ preventScroll: true });
      }
      return;
    }
    if (!interactive()) return;
    const key = event.key.toLowerCase();
    if (event.code === "Space") {
      if (event.target.closest("button, a")) return;
      event.preventDefault();
      if (!event.repeat) {
        if (automatic) {
          pause();
          start();
        } else resume();
      }
    } else if (key === "q" || key === "e") {
      event.preventDefault();
      if (keys.has(key)) return; // OS key repeats must not reset the frame clock.
      pause();
      keys.add(key);
      start();
    }
  }, { capture: true });
  document.addEventListener("keyup", event => {
    if (keys.delete(event.key.toLowerCase())) start(); // Flush the final camera state, even between throttled frames.
  });
  function clearInput() { pointers.clear(); keys.clear(); nativeGesture = null; }
  addEventListener("blur", clearInput);
  function syncPanel() {
    clearInput();
    canvas.classList.toggle("interactive", interactive());
    controls.hidden = !interactive();
    resumeButton.disabled = automatic;
  }
  panel.addEventListener("toggle", syncPanel);
  resumeButton.addEventListener("click", resume);

  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      render();
    }, 120);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => { clearInput(); start(); });
  reducedMotion.addEventListener?.("change", () => {
    automatic = !reducedMotion.matches;
    returning = null;
    resumeButton.disabled = automatic;
    start();
  });
  start();
})();
