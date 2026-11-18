/* ==========================================================================
   Arunav Kundu — Portfolio
   3D scene layer (Three.js, loaded from CDN)

   What this builds:
     · a starfield that keeps flying toward the camera and recycling
     · a large wireframe solid that drifts and responds to the pointer
     · an inner core solid rotating the other way
     · a halo of orbiting points

   Design rules (deliberate, not accidental):
     · If WebGL, Three.js, or 'prefers-reduced-motion' is unavailable, NOTHING
       here runs. main.js sets up a pure-CSS 3D fallback instead.
     · Rendering pauses when the tab is hidden.
     · Particle counts and pixel ratio scale down on small / low-power screens.
     · Colours re-read from CSS variables, so the light/dark toggle re-tints
       the whole scene.

   Exposed as window.AKScene = { init, recolor, dispose, isActive }
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     Theme palettes. Keep these in step with --accent-* in css/style.css.
     ------------------------------------------------------------------------ */
  var PALETTE = {
    dark: {
      field: 0x7c5cff,
      core: 0x22d3ee,
      shell: 0x7c5cff,
      dust: 0xf472b6,
      fog: 0x07070c,
      fogDensity: 0.055,
      coreOpacity: 0.95,
      shellOpacity: 0.32,
      fieldOpacity: 0.92
    },
    light: {
      field: 0x7c5cff,
      core: 0x0891b2,
      shell: 0x7c5cff,
      dust: 0xdb2777,
      fog: 0xfbfbfe,
      fogDensity: 0.045,
      coreOpacity: 0.9,
      shellOpacity: 0.42,
      fieldOpacity: 0.8
    }
  };

  var state = {
    renderer: null,
    scene: null,
    camera: null,
    field: null,
    shell: null,
    core: null,
    dust: null,
    orbGroup: null,
    clock: null,
    running: false,
    raf: 0,
    depth: 70,
    mouseX: 0,
    mouseY: 0,
    eyeX: 0,
    eyeY: 0,
    theme: "dark",
    isActive: false
  };

  /* ------------------------------------------------------------------------
     Capability + performance tier
     ------------------------------------------------------------------------ */
  function tier() {
    var smallScreen = Math.min(window.innerWidth, window.innerHeight) < 700;
    var cores = navigator.hardwareConcurrency || 4;
    var lowPower = cores <= 4 || smallScreen;

    if (smallScreen) return { field: 700, dust: 110, dpr: 1.5, detail: 0 };
    if (lowPower) return { field: 1300, dust: 180, dpr: 1.6, detail: 1 };
    return { field: 2200, dust: 270, dpr: Math.min(window.devicePixelRatio || 1, 2), detail: 1 };
  }

  function webglAvailable() {
    try {
      var c = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl"))
      );
    } catch (err) {
      return false;
    }
  }

  /* ------------------------------------------------------------------------
     Soft round sprite for the dust points (avoids square particles)
     ------------------------------------------------------------------------ */
  function discTexture() {
    var size = 64;
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.72)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /* ------------------------------------------------------------------------
     Build
     ------------------------------------------------------------------------ */
  function build(canvas) {
    var T = tier();
    var P = PALETTE[state.theme];
    state.depth = T.field > 1500 ? 88 : 64;

    state.scene = new THREE.Scene();
    state.scene.fog = new THREE.FogExp2(P.fog, P.fogDensity);

    state.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    state.camera.position.set(0, 0, 24);

    state.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    state.renderer.setPixelRatio(T.dpr);
    state.renderer.setSize(window.innerWidth, window.innerHeight, false);
    state.renderer.setClearColor(0x000000, 0);

    /* ---- starfield flying toward the camera ---- */
    var fGeo = new THREE.BufferGeometry();
    var fPos = new Float32Array(T.field * 3);
    for (var i = 0; i < T.field; i++) {
      fPos[i * 3] = (Math.random() - 0.5) * 190;
      fPos[i * 3 + 1] = (Math.random() - 0.5) * 120;
      fPos[i * 3 + 2] = -Math.random() * state.depth * 2 + 12;
    }
    fGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3));

    state.field = new THREE.Points(
      fGeo,
      new THREE.PointsMaterial({
        color: P.field,
        size: 0.34,
        sizeAttenuation: true,
        transparent: true,
        opacity: P.fieldOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    state.scene.add(state.field);

    /* ---- floating wireframe shell + cores ---- */
    var detail = 1;
    state.shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(8.6, detail),
      new THREE.MeshBasicMaterial({
        color: P.shell,
        wireframe: true,
        transparent: true,
        opacity: P.shellOpacity
      })
    );
    state.shell.position.set(0, 0.6, -8);
    state.scene.add(state.shell);

    var coreDetail = T.detail ? 1 : 0;
    state.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.5, coreDetail),
      new THREE.MeshBasicMaterial({
        color: P.core,
        wireframe: true,
        transparent: true,
        opacity: P.coreOpacity
      })
    );
    state.core.position.copy(state.shell.position);
    state.scene.add(state.core);

    /* ---- orbiting dust halo ---- */
    var dGeo = new THREE.BufferGeometry();
    var dPos = new Float32Array(T.dust * 3);
    for (var j = 0; j < T.dust; j++) {
      var r = 9 + Math.random() * 11;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      dPos[j * 3] = r * Math.sin(phi) * Math.cos(theta);
      dPos[j * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      dPos[j * 3 + 2] = r * Math.cos(phi);
    }
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    state.dust = new THREE.Points(
      dGeo,
      new THREE.PointsMaterial({
        color: P.dust,
        size: 1.15,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
        map: discTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    state.orbGroup = new THREE.Group();
    state.orbGroup.position.copy(state.shell.position);
    state.orbGroup.add(state.dust);
    state.scene.add(state.orbGroup);
  }

  /* ------------------------------------------------------------------------
     Loop
     ------------------------------------------------------------------------ */
  function loop() {
    state.raf = window.requestAnimationFrame(loop);
    if (!state.running) return;

    var dt = Math.min(state.clock.getDelta(), 0.05);
    var t = state.clock.elapsedTime;

    /* pointer follows softly — never snaps */
    state.eyeX += (state.mouseX * 3.2 - state.eyeX) * 0.045;
    state.eyeY += (state.mouseY * 2.1 - state.eyeY) * 0.045;

    /* flying starfield */
    var arr = state.field.geometry.attributes.position.array;
    var speed = 7.5 * dt;
    var limit = state.depth;
    for (var i = 0; i < arr.length; i += 3) {
      arr[i + 2] += speed;
      if (arr[i + 2] > 14) {
        arr[i + 2] -= limit * 2;
        arr[i] = (Math.random() - 0.5) * 190;
        arr[i + 1] = (Math.random() - 0.5) * 120;
      }
    }
    state.field.geometry.attributes.position.needsUpdate = true;
    state.field.rotation.z = t * 0.012;

    /* solids drift on different axes so they never look locked together */
    state.shell.rotation.x = t * 0.06 + state.eyeY * 0.06;
    state.shell.rotation.y = t * 0.09 + state.eyeX * 0.08;
    state.shell.position.y = 0.6 + Math.sin(t * 0.5) * 0.5;

    state.core.rotation.x = -t * 0.22;
    state.core.rotation.y = -t * 0.3;
    state.core.position.y = state.shell.position.y;
    state.core.scale.setScalar(1 + Math.sin(t * 1.4) * 0.045);

    state.orbGroup.rotation.y = t * 0.08;
    state.orbGroup.rotation.x = Math.sin(t * 0.3) * 0.12;
    state.orbGroup.position.y = state.shell.position.y;

    /* camera depth from the pointer + a slow breathing offset */
    state.camera.position.x = state.eyeX;
    state.camera.position.y = state.eyeY + Math.sin(t * 0.35) * 0.4;
    state.camera.lookAt(0, 0, -8);

    state.renderer.render(state.scene, state.camera);
  }

  /* ------------------------------------------------------------------------
     Resize / pointer / visibility
     ------------------------------------------------------------------------ */
  var lastW = 0;
  var lastH = 0;

  function onResize() {
    if (!state.renderer) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;

    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h, false);
  }

  function onPointer(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  function onVisibility() {
    state.running = !document.hidden;
    if (state.running) state.clock.getDelta(); // drop the gap so nothing jumps
  }

  function onThemeChange() {
    state.theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    recolor();
  }

  function recolor() {
    var P = PALETTE[state.theme];
    if (!state.scene) return;

    state.scene.fog.color.setHex(P.fog);
    state.scene.fog.density = P.fogDensity;

    if (state.field) {
      state.field.material.color.setHex(P.field);
      state.field.material.opacity = P.fieldOpacity;
    }
    if (state.shell) {
      state.shell.material.color.setHex(P.shell);
      state.shell.material.opacity = P.shellOpacity;
    }
    if (state.core) {
      state.core.material.color.setHex(P.core);
      state.core.material.opacity = P.coreOpacity;
    }
    if (state.dust) {
      state.dust.material.color.setHex(P.dust);
    }
  }

  /* ------------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------------ */
  function init(canvas) {
    if (state.isActive) return true;
    if (reduced || !webglAvailable() || typeof THREE === "undefined") return false;

    try {
      build(canvas);
    } catch (err) {
      dispose();
      return false;
    }

    state.theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    state.clock = new THREE.Clock();
    state.running = true;
    state.isActive = true;

    lastW = window.innerWidth;
    lastH = window.innerHeight;

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    // Re-tint whenever main.js flips the theme attribute.
    new MutationObserver(onThemeChange).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    loop();
    return true;
  }

  function dispose() {
    state.running = false;
    state.isActive = false;
    if (state.raf) window.cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (state.renderer) {
      try {
        state.renderer.dispose();
      } catch (err) {
        /* nothing useful to do */
      }
    }
    state.renderer = null;
    state.scene = null;
    state.camera = null;
    state.field = state.shell = state.core = state.dust = state.orbGroup = null;
  }

  window.AKScene = {
    init: init,
    dispose: dispose,
    recolor: recolor,
    get isActive() {
      return state.isActive;
    }
  };
})();
