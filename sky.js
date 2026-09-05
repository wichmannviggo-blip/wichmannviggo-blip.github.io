/* =========================================================
   SKY ENGINE
   Computes a continuously-shifting sky gradient, star visibility,
   accent color, and a sun/moon that arcs across the screen —
   all driven purely by the current time of day. Also drags the
   clock along so it always sits right under the sun/moon.
   ========================================================= */
(function(){

  /* key moments through the day — everything in between is
     smoothly blended from these */
  const KEYFRAMES = [
    { h: 0,  top: "#0b0d18", bottom: "#171b2e", stars: 1.00, sun: 0.00, moon: 1.00, accent: "#E8A33D" },
    { h: 3,  top: "#0b0d18", bottom: "#171b2e", stars: 1.00, sun: 0.00, moon: 1.00, accent: "#E8A33D" },
    { h: 4,  top: "#171432", bottom: "#8a5240", stars: 0.35, sun: 0.15, moon: 0.60, accent: "#E5824C" }, /* orange morning, as requested */
    { h: 6,  top: "#3c5a86", bottom: "#e8a25f", stars: 0.05, sun: 0.85, moon: 0.00, accent: "#E8A33D" },
    { h: 9,  top: "#5f92c9", bottom: "#eccc93", stars: 0.00, sun: 1.00, moon: 0.00, accent: "#E0A94A" },
    { h: 13, top: "#5c9bdb", bottom: "#d3e7f6", stars: 0.00, sun: 1.00, moon: 0.00, accent: "#D9A441" }, /* plain daytime sky, no stars */
    { h: 16, top: "#5588c2", bottom: "#e7c07d", stars: 0.00, sun: 1.00, moon: 0.00, accent: "#E0A44A" },
    { h: 18, top: "#33517e", bottom: "#e8794f", stars: 0.10, sun: 0.55, moon: 0.10, accent: "#E4703F" },
    { h: 20, top: "#1b1f3a", bottom: "#6b3f56", stars: 0.55, sun: 0.00, moon: 0.45, accent: "#C97A9C" },
    { h: 22, top: "#101226", bottom: "#232849", stars: 0.85, sun: 0.00, moon: 0.85, accent: "#E8A33D" },
    { h: 23, top: "#0b0d18", bottom: "#171b2e", stars: 1.00, sun: 0.00, moon: 1.00, accent: "#E8A33D" },
    { h: 24, top: "#0b0d18", bottom: "#171b2e", stars: 1.00, sun: 0.00, moon: 1.00, accent: "#E8A33D" }
  ];

  /* how far below the sun/moon's center the clock sits, in px —
     keeps a constant visual gap regardless of screen size */
  const CLOCK_GAP_PX = 34;

  /* card tint is mixed from these bases toward the current sky color,
     rather than sitting at one fixed color all day — this is what
     makes the panels actually track the gradient instead of just
     reading as a flat grey box on top of it */
  const VOID_RGB     = [20, 22, 27];   // matches --void
  const LINE_RGB      = [58, 61, 72];  // mixing base for the hairline border
  const CARD_MIX     = 0.34;           // how much sky color reaches the panel fill
  const BORDER_MIX   = 0.50;           // how much sky color reaches the panel border

  function hexToRgb(hex){
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(rgb){
    return "#" + rgb.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function lerpColor(hexA, hexB, t){
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    return rgbToHex([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
  }
  function mixRgb(a, b, t){
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  }
  function rgbCss(rgb){
    return rgb.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(",");
  }

  function getTheme(hourFloat){
    let k1 = KEYFRAMES[0], k2 = KEYFRAMES[KEYFRAMES.length - 1];
    for(let i = 0; i < KEYFRAMES.length - 1; i++){
      if(hourFloat >= KEYFRAMES[i].h && hourFloat <= KEYFRAMES[i+1].h){
        k1 = KEYFRAMES[i]; k2 = KEYFRAMES[i+1];
        break;
      }
    }
    const span = k2.h - k1.h;
    const t = span === 0 ? 0 : (hourFloat - k1.h) / span;
    return {
      top: lerpColor(k1.top, k2.top, t),
      bottom: lerpColor(k1.bottom, k2.bottom, t),
      stars: lerp(k1.stars, k2.stars, t),
      sun: lerp(k1.sun, k2.sun, t),
      moon: lerp(k1.moon, k2.moon, t),
      accent: lerpColor(k1.accent, k2.accent, t)
    };
  }

  function updateSky(){
    const now = new Date();
    const hourFloat = now.getHours() + now.getMinutes() / 60;
    const theme = getTheme(hourFloat);

    const sky = document.getElementById("sky");
    if(sky) sky.style.background = `linear-gradient(180deg, ${theme.top}, ${theme.bottom})`;

    document.documentElement.style.setProperty("--lantern", theme.accent);
    document.documentElement.style.setProperty("--star-opacity", theme.stars);

    /* card fill/border: mixed from the *current* sky colors so panels
       actually shift hue and brightness with the gradient (a fixed
       navy tint just reads as grey against a bright daytime sky) */
    const skyMidRgb = mixRgb(hexToRgb(theme.top), hexToRgb(theme.bottom), 0.5);
    const cardRgb   = mixRgb(VOID_RGB, skyMidRgb, CARD_MIX);
    const borderRgb = mixRgb(LINE_RGB, skyMidRgb, BORDER_MIX);
    document.documentElement.style.setProperty("--card-bg-rgb", rgbCss(cardRgb));
    document.documentElement.style.setProperty("--card-border-rgb", rgbCss(borderRgb));

    /* clouds sit a touch dimmer at night than during the day */
    document.documentElement.style.setProperty("--cloud-opacity", (0.62 - theme.stars * 0.26).toFixed(2));

    /* sun arcs up from 06:00, peaks at noon, sets by 18:00.
       moon covers the other 12 hours, peaking at midnight. */
    let progress, isDay;
    if(hourFloat >= 6 && hourFloat <= 18){
      progress = (hourFloat - 6) / 12;
      isDay = true;
    } else {
      const shifted = hourFloat < 6 ? hourFloat + 24 : hourFloat;
      progress = (shifted - 18) / 12;
      isDay = false;
    }
    progress = Math.max(0, Math.min(1, progress));

    const leftPct = 8 + progress * 84;
    const topPct = 60 - Math.sin(progress * Math.PI) * 38;

    const celestial = document.getElementById("celestial");
    if(celestial){
      celestial.style.left = leftPct + "%";
      celestial.style.top = topPct + "%";
      celestial.className = "celestial " + (isDay ? "sun" : "moon");
      celestial.style.opacity = isDay ? theme.sun : theme.moon;
    }

    /* clock rides along with the sun/moon, always the same
       fixed gap below its center */
    const clock = document.getElementById("clock");
    if(clock){
      clock.style.left = leftPct + "%";
      clock.style.top = `calc(${topPct}% + ${CLOCK_GAP_PX}px)`;
    }
  }

  /* drifting clouds — created once, then animated purely by CSS so
     they cost nothing on the main loop. Randomized size/speed/position
     so the four don't read as a repeating pattern. */
  function makeClouds(){
    const wrap = document.getElementById("clouds");
    if(!wrap) return;
    const CLOUD_COUNT = 4;
    for(let i = 0; i < CLOUD_COUNT; i++){
      const c = document.createElement("div");
      c.className = "cloud";
      const width = 220 + Math.random() * 220;      // 220-440px
      const height = width * (0.32 + Math.random() * 0.1);
      const top = 4 + Math.random() * 40;            // upper 4-44% of the sky
      const duration = 130 + Math.random() * 110;    // 130-240s per crossing
      const delay = -Math.random() * duration;       // negative = already mid-flight
      const opacity = 0.35 + Math.random() * 0.35;
      c.style.width = width.toFixed(0) + "px";
      c.style.height = height.toFixed(0) + "px";
      c.style.top = top.toFixed(1) + "%";
      c.style.setProperty("--cloud-base-opacity", opacity.toFixed(2));
      c.style.animationDuration = duration.toFixed(0) + "s";
      c.style.animationDelay = delay.toFixed(0) + "s";
      wrap.appendChild(c);
    }
  }

  makeClouds();
  updateSky();
  setInterval(updateSky, 60000);
})();
