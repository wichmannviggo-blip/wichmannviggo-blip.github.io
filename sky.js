/* =========================================================
   SKY ENGINE
   Computes a continuously-shifting sky gradient, star visibility,
   accent color, and a sun/moon that arcs across the screen —
   all driven purely by the current time of day.
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

    const celestial = document.getElementById("celestial");
    if(celestial){
      const leftPct = 8 + progress * 84;
      const topPct = 60 - Math.sin(progress * Math.PI) * 38;
      celestial.style.left = leftPct + "%";
      celestial.style.top = topPct + "%";
      celestial.className = "celestial " + (isDay ? "sun" : "moon");
      celestial.style.opacity = isDay ? theme.sun : theme.moon;
    }
  }

  updateSky();
  setInterval(updateSky, 60000);
})();
