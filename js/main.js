/* ==========================================================================
   Arunav Kundu — Portfolio
   Vanilla JS: theme, typewriter, nav, reveal animations, contact form.
   No dependencies, no build step.
   ========================================================================== */
(function () {
  "use strict";

  /* ========================================================================
     SITE CONFIG  ·  EDIT ME
     ------------------------------------------------------------------------
     Change these values once and they update everywhere they appear:
     the contact cards, the footer social icons and the structured data.
     ======================================================================== */
  var SITE = {
    email: "ryuwork122@gmail.com",
    github: "https://github.com/ryuwork122-del",
    linkedin: "https://www.linkedin.com/in/arunav-kundu-1735a2439/",
    instagram: "https://www.instagram.com/ryu_nexus_official/?hl=en",
    twitter: "https://x.com/Iamrishi2354"
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ========================================================================
     1. Apply config to every [data-config] element
     ======================================================================== */
  function applyConfig() {
    document.querySelectorAll("[data-config]").forEach(function (el) {
      var key = el.getAttribute("data-config");
      var value = SITE[key];
      if (!value) return;

      if (el.tagName === "A") {
        el.setAttribute("href", key === "email" ? "mailto:" + value : value);
      }
    });

    document.querySelectorAll("[data-config-text]").forEach(function (el) {
      var key = el.getAttribute("data-config-text");
      var value = SITE[key];
      if (!value) return;
      el.textContent = value.replace(/^https?:\/\//, "").replace(/\/$/, "");
    });
  }

  /* ========================================================================
     2. Theme toggle (persisted)
     ------------------------------------------------------------------------
     Why two stores: localStorage is the primary, but Chrome treats many file://
     pages as an opaque origin where localStorage reads return null and writes
     throw. A cookie still works there, so we write both and read whichever is
     available. The inline head script in each page does the same check before
     first paint.
     ======================================================================== */
  var THEME_KEY = "ak-theme";

  function saveThemeCookie(theme) {
    try {
      document.cookie =
        THEME_KEY + "=" + theme + "; path=/; max-age=31536000; SameSite=Lax";
    } catch (err) {
      /* cookies blocked — localStorage may still have worked */
    }
  }

  function readThemeCookie() {
    var m = document.cookie.match(/(?:^|;\s*)ak-theme=(dark|light)/);
    return m ? m[1] : null;
  }

  function readStoredTheme() {
    var v = null;
    try {
      v = window.localStorage.getItem(THEME_KEY);
    } catch (err) {
      v = null;
    }
    if (v !== "light" && v !== "dark") v = readThemeCookie();
    return v;
  }

  function initTheme() {
    var root = document.documentElement;
    var toggle = document.getElementById("themeToggle");
    var meta = document.querySelector('meta[name="theme-color"]');

    function paint(theme) {
      root.setAttribute("data-theme", theme);
      // Keep the mobile browser chrome in step with --bg in css/style.css.
      if (meta) meta.setAttribute("content", theme === "light" ? "#e9ecf5" : "#07070c");
    }

    var stored = readStoredTheme();
    var systemLight = window.matchMedia("(prefers-color-scheme: light)").matches;

    if (stored === "light" || stored === "dark") {
      paint(stored);
    } else {
      paint(systemLight ? "light" : "dark");
      saveThemeCookie(systemLight ? "light" : "dark");
    }

    if (!toggle) return;

    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      paint(next);

      // Write both stores, so a later load can use whichever is available.
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch (err) {
        /* file:// opaque origin — the cookie below is the fallback */
      }
      saveThemeCookie(next);
    });
  }

  /* ========================================================================
     3. Typewriter headline (cycles through every discipline)
     ======================================================================== */
  function initTypewriter() {
    var target = document.getElementById("roleType");
    if (!target) return;

    var ROLES = [
      "AI/ML Engineer",
      "Full-Stack Developer",
      "Data Analyst",
      "Graphic Designer",
      "Video Editor",
      "Game Developer",
      "AI Automation Specialist"
    ];

    if (reduceMotion) {
      target.textContent = ROLES.join(" · ");
      return;
    }

    var roleIndex = 0;
    var charIndex = 0;
    var deleting = false;

    function tick() {
      var role = ROLES[roleIndex];
      var delay;

      if (!deleting) {
        charIndex += 1;
        target.textContent = role.slice(0, charIndex);

        if (charIndex === role.length) {
          deleting = true;
          delay = 1500; // hold the finished word
        } else {
          delay = 62 + Math.random() * 46;
        }
      } else {
        charIndex -= 1;
        target.textContent = role.slice(0, charIndex);

        if (charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % ROLES.length;
          delay = 380;
        } else {
          delay = 34;
        }
      }

      window.setTimeout(tick, delay);
    }

    tick();
  }

  /* ========================================================================
     4. Navbar: stuck state, mobile menu, active section
     ======================================================================== */
  function initNav() {
    var nav = document.getElementById("nav");
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    var anchors = links ? Array.prototype.slice.call(links.querySelectorAll(".nav__link")) : [];

    /* Sticky background */
    if (nav) {
      var onScroll = function () {
        nav.classList.toggle("is-stuck", window.scrollY > 12);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    /* Mobile menu */
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });

      links.addEventListener("click", function (event) {
        if (event.target.closest(".nav__link")) {
          links.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    /* Highlight the section currently in view */
    var sections = anchors
      .map(function (a) {
        var id = a.getAttribute("href");
        return id && id.charAt(0) === "#" ? document.querySelector(id) : null;
      })
      .filter(Boolean);

    if (!sections.length || !("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          anchors.forEach(function (a) {
            a.classList.toggle(
              "is-active",
              a.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ========================================================================
     5. Scroll reveal + skill bar animation
     ======================================================================== */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      fillBars(document);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var el = entry.target;
          var siblings = el.parentElement
            ? Array.prototype.slice.call(el.parentElement.children)
            : [];
          var order = Math.max(0, siblings.indexOf(el));

          el.style.transitionDelay = Math.min(order, 5) * 85 + "ms";
          el.classList.add("is-visible");
          fillBars(el);

          observer.unobserve(el);
          window.setTimeout(function () {
            el.style.transitionDelay = "";
          }, 900);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  function fillBars(scope) {
    var bars = scope.querySelectorAll ? scope.querySelectorAll(".bar__fill") : [];
    bars.forEach(function (bar, i) {
      var level = bar.getAttribute("data-level") || "0";
      window.setTimeout(function () {
        bar.style.width = level + "%";
      }, reduceMotion ? 0 : 120 + i * 70);
    });
  }

  /* ========================================================================
     6. Contact form → mailto handoff with validation
     ======================================================================== */
  function initForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;

    var status = document.getElementById("formStatus");

    function show(message) {
      if (!status) return;
      status.textContent = message;
      status.classList.add("is-visible");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var subject = form.elements.subject.value.trim();
      var message = form.elements.message.value.trim();

      if (!name || !email || !message) {
        show("Please fill in your name, email and message.");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        show("That email address doesn't look right — please check it.");
        return;
      }

      var finalSubject = subject || "Portfolio enquiry from " + name;
      var body = message + "\n\n—\n" + name + "\n" + email;

      var url =
        "mailto:" +
        SITE.email +
        "?subject=" +
        encodeURIComponent(finalSubject) +
        "&body=" +
        encodeURIComponent(body);

      window.location.href = url;
      show("Opening your email client… if nothing happens, write to " + SITE.email + ".");
      form.reset();
    });
  }

  /* ========================================================================
     7. Capability chips
     ------------------------------------------------------------------------
     The chip row animates itself on scroll-in rather than relying on .reveal,
     because it needs its own per-chip stagger. While it is animating we honour
     the --i delay on hover too; afterwards the delay is dropped so hovering
     responds instantly instead of queueing behind the chip's slot.

     IMPORTANT: the pre-reveal hidden state is a CLASS, never an inline
     `style.opacity`. An inline opacity would outrank the stylesheet, so any
     rule that stops the animation (e.g. a hover state) would snap the chip
     back to opacity 0 and it would never come back. Class-based hiding is
     overridden cleanly by the animation and restores correctly.
     ======================================================================== */
  function hideChips(row) {
    row.classList.add("is-ready");
  }

  function showChips(row) {
    row.classList.remove("is-ready");
  }

  function animateChips(row) {
    row.classList.remove("is-ready");
    row.classList.add("is-animated");

    var pills = Array.prototype.slice.call(row.querySelectorAll(".pill"));
    var longest = 0;

    pills.forEach(function (pill) {
      var raw = pill.style.getPropertyValue("--i") || "0";
      longest = Math.max(longest, parseInt(raw, 10) || 0);
    });

    window.setTimeout(function () {
      pills.forEach(function (pill) {
        pill.style.removeProperty("--i");
        pill.style.transitionDelay = "0ms";
      });
    }, longest + 750);
  }

  function initChips() {
    var row = document.querySelector(".pill-row");
    if (!row) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      row.classList.add("is-animated");
      return;
    }

    // Only hide the row once we know an observer will bring it back.
    hideChips(row);

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateChips(row);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(row);
  }

  /* ========================================================================
     8. Footer year
     ------------------------------------------------------------------------
     Uses the visitor's clock, but never renders earlier than the launch year
     so a mis-set system clock can't show a stale copyright.
     ======================================================================== */
  var LAUNCH_YEAR = 2026;

  function initYear() {
    var el = document.getElementById("year");
    if (!el) return;
    el.textContent = String(Math.max(new Date().getFullYear(), LAUNCH_YEAR));
  }

  /* ========================================================================
     9. 3D scene
     ------------------------------------------------------------------------
     Tries the WebGL scene from scene.js. If Three.js never arrived from the
     CDN, WebGL is unavailable, or reduced-motion is on, we mark the document
     'no-3d' so the pure-CSS starfield fallback takes over instead.
     ======================================================================== */
  function initScene() {
    var canvas = document.getElementById("scene3d");
    var root = document.documentElement;

    if (reduceMotion || !canvas) {
      root.classList.add("no-3d");
      return;
    }

    var active = !!(window.AKScene && window.AKScene.init(canvas));

    if (active) {
      root.classList.add("is-3d");
    } else {
      root.classList.add("no-3d");
    }

    /* Safety net: a slow or blocked CDN gets one more chance. */
    if (!active) {
      window.setTimeout(function () {
        if (root.classList.contains("is-3d")) return;
        if (window.AKScene && window.AKScene.init(canvas)) {
          root.classList.remove("no-3d");
          root.classList.add("is-3d");
        }
      }, 3000);
    }
  }

  /* ========================================================================
     10. Pointer-reactive 3D card tilt
     ======================================================================== */
  function initTilt() {
    if (reduceMotion) return;

    var cards = Array.prototype.slice.call(
      document.querySelectorAll(".project-card, .skill-group, .fact, .contact-link, .side-card")
    );
    if (!cards.length) return;

    cards.forEach(function (card) {
      var glare = document.createElement("span");
      glare.className = "tilt__glare";
      glare.setAttribute("aria-hidden", "true");
      card.appendChild(glare);
      card.classList.add("tilt");
    });

    var MAX = 7.5;

    cards.forEach(function (card) {
      card.addEventListener(
        "pointermove",
        function (event) {
          if (event.pointerType && event.pointerType !== "mouse") return;

          var r = card.getBoundingClientRect();
          if (!r.width || !r.height) return;

          var nx = (event.clientX - r.left) / r.width - 0.5;
          var ny = (event.clientY - r.top) / r.height - 0.5;

          card.style.setProperty("--ry", (nx * MAX * 2).toFixed(2) + "deg");
          card.style.setProperty("--rx", (-ny * MAX * 2).toFixed(2) + "deg");
          card.style.setProperty("--lift", "16px");
          card.style.setProperty("--scale", "1.014");
          card.style.setProperty("--gx", ((nx + 0.5) * 100).toFixed(1) + "%");
          card.style.setProperty("--gy", ((ny + 0.5) * 100).toFixed(1) + "%");

          if (!card.classList.contains("live")) card.classList.add("live");
        },
        { passive: true }
      );

      card.addEventListener("pointerleave", function () {
        card.classList.remove("live");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
        card.style.removeProperty("--lift");
        card.style.removeProperty("--scale");
      });
    });
  }

  /* ========================================================================
     11. Hero depth parallax (pointer drives the .depth-* layers)
     ======================================================================== */
  function initParallax() {
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;

    var hero = document.querySelector(".hero");
    if (!hero) return;

    var frame = 0;

    window.addEventListener(
      "pointermove",
      function (event) {
        if (event.pointerType && event.pointerType !== "mouse") return;
        if (frame) return;

        frame = window.requestAnimationFrame(function () {
          frame = 0;
          hero.style.setProperty("--px", ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
          hero.style.setProperty("--py", ((event.clientY / window.innerHeight) * 2 - 1).toFixed(3));
        });
      },
      { passive: true }
    );
  }

  /* ========================================================================
     12. Scroll state — lets the 3D canvas ease back while reading
     ======================================================================== */
  function initScrollState() {
    var root = document.documentElement;
    var ticking = false;

    function update() {
      ticking = false;
      root.classList.toggle("is-scrolled", window.scrollY > window.innerHeight * 0.7);
    }

    update();
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
  }

  /* ========================================================================
     Boot
     ======================================================================== */
  function boot() {
    applyConfig();
    initTheme();
    initTypewriter();
    initNav();
    initReveal();
    initForm();
    initChips();
    initYear();
    initScene();
    initTilt();
    initParallax();
    initScrollState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
