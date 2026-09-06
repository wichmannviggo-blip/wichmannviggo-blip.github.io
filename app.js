(function(){

  /* =========================================================
     SUPABASE CONFIG — paste your own project values here
     Get these from: Supabase dashboard -> Project Settings -> API

     SCHEMA NOTE: this version needs one new column on quest_stats:
       daily_progress   type: text   nullable: yes
     Everything else (total_xp, username, is_owner, is_tester,
     is_helper, is_admin, is_invisible, bypass_sleep, unlimited_quests,
     streak, last_completed_quest_day) stays as it already is — the
     old streak/last_completed_quest_day columns are just left unused.
     ========================================================= */
  const SUPABASE_URL = "https://ulnimalkakdkutcsiiqx.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_vinWN7-Ec9WP9rZX_c4szg_wyybhxPk";

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const ADMIN_CODE = "Ksl14cpe!@";

  /* ---------- icons ---------- */
  const ICON_MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>`;
  const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.3 2.3L16 10"/></svg>`;
  const ICON_SCROLL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h11a2 2 0 0 1 2 2v13a1 1 0 0 1-1.6.8L15 18l-2.4 1.8a1 1 0 0 1-1.2 0L9 18l-2.4 1.8A1 1 0 0 1 5 19V6a2 2 0 0 1 1-1Z"/><path d="M9 9h6M9 12.5h6"/></svg>`;
  const ICON_BTN_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 6"/></svg>`;
  const ICON_HAMMER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="13" y="2" width="9" height="6" rx="1.4" transform="rotate(45 17.5 5)"/><path d="M15.3 7.3 4.2 18.4"/><path d="M3 19.5 4.6 21"/></svg>`;

  /* =========================================================
     QUEST CONTENT — 17 per difficulty, ranked by time / effort /
     social nerve required. Each carries a fixed xp reward.
     ========================================================= */
  const EASY_XP = 15, MEDIUM_XP = 30, HARD_XP = 55;

  const EASY_QUESTS = [
    "Drink a full glass of water right now.",
    "Do 10 jumping jacks.",
    "Write down one thing you're grateful for.",
    "Send a friendly text to someone you care about.",
    "Tidy your desk or workspace for 2 minutes.",
    "Take 5 slow, deep breaths.",
    "Say one genuine compliment to yourself, out loud.",
    "Stretch your arms and legs for 3 minutes.",
    "Name 3 things you can see, hear, and feel right now.",
    "Doodle something small in under 5 minutes.",
    "Text someone \"thinking of you\" for no reason.",
    "Refill your water bottle.",
    "Stand up and walk around for 2 minutes.",
    "Write one sentence in a journal or notes app.",
    "Water a plant, real or on your windowsill.",
    "Pick up 5 pieces of litter near you.",
    "Put your phone down and look out a window for 1 minute."
  ];

  const MEDIUM_QUESTS = [
    "Call a family member for a 5-minute chat.",
    "Ask a coworker or classmate how their day is really going.",
    "Write a short thank-you note to someone.",
    "Do 20 minutes of exercise.",
    "Cook a homemade meal instead of ordering out.",
    "Learn a new word and use it in conversation today.",
    "Give a genuine compliment to a stranger.",
    "Spend 15 minutes decluttering a drawer or shelf.",
    "Read 10 pages of a book.",
    "Introduce yourself to someone you don't know yet.",
    "Ask someone for their honest opinion on something you made.",
    "Share something you're working on with a friend.",
    "Take a 20-minute walk somewhere you've never been.",
    "Write down 3 goals for this week.",
    "Message an old friend you haven't spoken to in a while.",
    "Practice a hobby or skill for 15 minutes.",
    "Ask a stranger for a small recommendation, like their favorite coffee spot."
  ];

  const HARD_QUESTS = [
    "Start a conversation with 3 strangers today.",
    "Give a compliment to someone in front of a group.",
    "Call someone you haven't spoken to in over a year.",
    "Ask for something you want but feel nervous asking for.",
    "Share a personal story with a group of people.",
    "Sing or perform something in front of at least one other person.",
    "Introduce yourself to 5 new people today.",
    "Have a deep, honest conversation with someone close to you.",
    "Ask a stranger for directions and keep the conversation going.",
    "Pitch an idea of yours to someone whose opinion matters to you.",
    "Do something today that safely pushes you outside your comfort zone.",
    "Ask someone out — a friend hangout, date, or activity.",
    "Give someone honest, constructive feedback in person.",
    "Speak up with your opinion in a meeting or group discussion.",
    "Reach out to someone you admire professionally, out of the blue.",
    "Try a new activity alone in public, like a class or event.",
    "Apologize in person for something, even something small."
  ];

  const HOUR_START = 6;   // quests begin unlocking at 06:00
  const HOUR_END = 22;    // last hour window is 21:00-22:00
  const HOURS_PER_DAY = HOUR_END - HOUR_START; // 16 one-hour windows

  /* ---------- date / time helpers ---------- */
  function fmtDate(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }
  function getQuestDay(now){
    const d = new Date(now);
    if(d.getHours() < HOUR_START){ d.setDate(d.getDate()-1); }
    return fmtDate(d);
  }
  function addDaysStr(dateStr, n){
    const [y,m,d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m-1, d);
    dt.setDate(dt.getDate()+n);
    return fmtDate(dt);
  }
  function hashStr(s){
    let h=0;
    for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }
  function pad2(n){ return String(n).padStart(2,"0"); }
  function minutesUntilNextHour(now){
    const next = new Date(now);
    next.setMinutes(0,0,0);
    next.setHours(next.getHours()+1);
    return Math.max(0, Math.ceil((next - now)/60000));
  }

  /* ---------- streak xp multiplier ----------
     Applied ONCE per day, at settlement (22:00) — never per-quest.
     Day 1 of a streak = x1, day 2 = x1.5, day 3 = x2, etc. Resets to
     x1 the moment a day passes with zero quests completed. ---------- */
  function streakMultiplier(streakCount){
    return 1 + 0.5 * Math.max(0, streakCount - 1);
  }
  function formatMultiplier(m){
    return (Math.round(m * 10) / 10).toString().replace(/\.0$/, "");
  }

  /* ---------- seeded randomness ----------
     A day's quest schedule is generated once per calendar day from a
     seed derived from the date string, so it's different every day
     but identical (and stable across refreshes) for that whole day. */
  function mulberry32(seed){
    return function(){
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(arr, rng){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rng() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const scheduleCache = {}; // questDay -> slots[], avoids recomputing every tick
  function getDailySchedule(questDay){
    if(scheduleCache[questDay]) return scheduleCache[questDay];
    const rng = mulberry32(hashStr("questie-schedule-" + questDay));
    const easyOrder = seededShuffle(EASY_QUESTS, rng);
    const mediumOrder = seededShuffle(MEDIUM_QUESTS, rng);
    const hardOrder = seededShuffle(HARD_QUESTS, rng);
    const slots = [];
    for(let i=0;i<HOURS_PER_DAY;i++){
      slots.push({
        hour: HOUR_START + i,
        easy:   { text: easyOrder[i],   xp: EASY_XP },
        medium: { text: mediumOrder[i], xp: MEDIUM_XP },
        hard:   { text: hardOrder[i],   xp: HARD_XP }
      });
    }
    scheduleCache[questDay] = slots;
    return slots;
  }

  /* ---------- per-user daily progress ----------
     One JSON blob (daily_progress column) tracks: which questDay it's
     for, which hour slot was last shown, which difficulty (if any) was
     picked for that hour, whether it's been resolved/completed, how
     much xp has stacked up today (not yet folded into the real total),
     and whether that stacked xp has already been settled into total_xp
     for this questDay. ---------- */
  function defaultProgress(questDay){
    return {
      day: questDay,
      hour: null,
      pick: null,
      resolved: false,
      completed: false,
      pendingXp: 0,
      settled: false
    };
  }

  /* ---------- sound effects ----------
     Tiny synthesized blips via the Web Audio API — no audio files
     needed. A click tick on every button, a two-note chime on quest
     completion, and a different two-note chime on a successful login. */
  const SoundFX = (function(){
    let ctx = null;
    function getCtx(){
      if(!ctx){
        const AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return null;
        ctx = new AC();
      }
      if(ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(freq, duration, opts){
      opts = opts || {};
      const audioCtx = getCtx();
      if(!audioCtx) return;
      const t0 = audioCtx.currentTime + (opts.delay || 0);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = opts.type || "sine";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(opts.volume || 0.15, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    }
    return {
      click(){ tone(700, 0.06, { type: "sine", volume: 0.08 }); },
      complete(){
        tone(523.25, 0.14, { type: "sine", volume: 0.16 });               // C5
        tone(783.99, 0.22, { type: "sine", volume: 0.16, delay: 0.12 });  // G5
      },
      login(){
        tone(440.00, 0.12, { type: "sine", volume: 0.14 });               // A4
        tone(659.25, 0.18, { type: "sine", volume: 0.14, delay: 0.10 });  // E5
      }
    };
  })();

  // click sound for literally any button on the site
  document.addEventListener("click", (e) => {
    if(e.target.closest("button")) SoundFX.click();
  });

  /* ---------- badges ---------- */
  function badgeHTML(stats){
    let html = "";
    if(stats.isOwner) html += `<span class="badge badge-gold" data-tooltip="Developer" aria-label="Developer">${ICON_CHECK}</span>`;
    if(stats.isTester) html += `<span class="badge badge-blue" data-tooltip="Tester" aria-label="Tester">${ICON_CHECK}</span>`;
    if(stats.isHelper) html += `<span class="badge badge-green" data-tooltip="Helper" aria-label="Helper">${ICON_HAMMER}</span>`;
    return html;
  }
  const USERNAME_RE = /^[A-Za-z0-9._]{4,20}$/;
  function isValidUsername(u){ return USERNAME_RE.test(u); }
  const USERNAME_COOLDOWN_DAYS = 7;

  /* ---------- badge legend popover ----------
     Hovering a badge (desktop mouse) shows a quick single-word label via
     CSS (data-tooltip). Actually CLICKING/TAPPING a badge — anywhere it
     appears: header, leaderboard, admin, settings — opens a small popover
     listing what every badge on Questie means, positioned next to the
     badge that was clicked.

     Helper ranks above Tester — helpers find bugs, pitch ideas, and
     contribute scripts, which is a step up from testing. ---------- */
  const BADGE_INFO = [
    { cls: "badge-gold",  icon: ICON_CHECK,  name: "Developer", desc: "Builds and maintains Questie." },
    { cls: "badge-green", icon: ICON_HAMMER, name: "Helper",    desc: "Finds bugs, pitches ideas, and contributes scripts." },
    { cls: "badge-blue",  icon: ICON_CHECK,  name: "Tester",    desc: "Helps test the app before others." }
  ];
  const badgeLegendEl = document.createElement("div");
  badgeLegendEl.className = "badge-legend-popover hidden";
  badgeLegendEl.innerHTML = `
    <div class="badge-legend-title">Badges</div>
    ${BADGE_INFO.map(b => `
      <div class="badge-legend-row">
        <span class="badge ${b.cls}">${b.icon}</span>
        <div class="badge-legend-text"><strong>${b.name}</strong><span>${b.desc}</span></div>
      </div>
    `).join("")}
  `;
  document.body.appendChild(badgeLegendEl);

  let badgeLegendAnchor = null;

  function positionBadgeLegend(anchorEl){
    const rect = anchorEl.getBoundingClientRect();
    const popRect = badgeLegendEl.getBoundingClientRect();
    const margin = 10;

    let left = rect.left;
    const maxLeft = window.innerWidth - popRect.width - margin;
    if(left > maxLeft) left = maxLeft;
    if(left < margin) left = margin;

    let top = rect.bottom + 8;
    if(top + popRect.height > window.innerHeight - margin){
      top = rect.top - popRect.height - 8;
    }
    if(top < margin) top = margin;

    badgeLegendEl.style.left = left + "px";
    badgeLegendEl.style.top = top + "px";
  }

  function openBadgeLegend(anchorEl){
    if(badgeLegendAnchor === anchorEl && !badgeLegendEl.classList.contains("hidden")){
      closeBadgeLegend();
      return;
    }
    badgeLegendAnchor = anchorEl;
    badgeLegendEl.classList.remove("hidden");
    positionBadgeLegend(anchorEl);
  }

  function closeBadgeLegend(){
    badgeLegendEl.classList.add("hidden");
    badgeLegendAnchor = null;
  }

  document.addEventListener("click", (e) => {
    const insidePopover = e.target.closest(".badge-legend-popover");
    if(insidePopover) return;

    const badge = e.target.closest(".badge");
    if(badge){
      e.stopPropagation();
      openBadgeLegend(badge);
      return;
    }
    closeBadgeLegend();
  });

  window.addEventListener("resize", () => {
    if(badgeLegendAnchor) positionBadgeLegend(badgeLegendAnchor);
  });

  /* ---------- leveling ---------- */
  function levelInfo(totalXP){
    let level = 0, remaining = totalXP, needed = 150;
    while(remaining >= needed){
      remaining -= needed;
      level += 1;
      needed += 50;
    }
    return { level, into: remaining, needed };
  }
  function xpForLevelStart(level){
    let xp = 0, needed = 150;
    for(let i=0;i<level;i++){ xp += needed; needed += 50; }
    return xp;
  }

  /* ---------- dom refs ---------- */
  const el = {
    loginView: document.getElementById("loginView"),
    appView: document.getElementById("appView"),
    settingsView: document.getElementById("settingsView"),
    leaderboardView: document.getElementById("leaderboardView"),
    level: document.getElementById("levelValue"),
    streak: document.getElementById("streakValue"),
    streakMult: document.getElementById("streakMultValue"),
    todayXp: document.getElementById("todayXpValue"),
    xpText: document.getElementById("xpText"),
    xpToGo: document.getElementById("xpToGo"),
    xpFill: document.getElementById("xpFill"),
    card: document.getElementById("questCard"),
    accountUsername: document.getElementById("accountUsername"),
    signOutBtn: document.getElementById("signOutBtn"),
    signOutModal: document.getElementById("signOutModal"),
    signOutCancelBtn: document.getElementById("signOutCancelBtn"),
    signOutConfirmBtn: document.getElementById("signOutConfirmBtn"),
    leaderboardBtn: document.getElementById("leaderboardBtn"),
    settingsBtn: document.getElementById("settingsBtn"),

    emailField: document.getElementById("emailField"),
    emailLabel: document.getElementById("emailLabel"),
    usernameField: document.getElementById("usernameField"),
    passwordField: document.getElementById("passwordField"),
    loginToggleRow: document.getElementById("loginToggleRow"),
    emailInput: document.getElementById("emailInput"),
    usernameInput: document.getElementById("usernameInput"),
    passwordInput: document.getElementById("passwordInput"),
    loginError: document.getElementById("loginError"),
    loginNote: document.getElementById("loginNote"),
    loginSubmitBtn: document.getElementById("loginSubmitBtn"),
    loginHeading: document.getElementById("loginHeading"),
    loginSub: document.getElementById("loginSub"),
    toggleText: document.getElementById("toggleText"),
    toggleModeBtn: document.getElementById("toggleModeBtn"),

    settingsBackBtn: document.getElementById("settingsBackBtn"),
    settingsEmail: document.getElementById("settingsEmail"),
    settingsUsername: document.getElementById("settingsUsername"),
    settingsEditUsernameBtn: document.getElementById("settingsEditUsernameBtn"),
    settingsUsernameCooldown: document.getElementById("settingsUsernameCooldown"),
    settingsUsernameForm: document.getElementById("settingsUsernameForm"),
    settingsUsernameInput: document.getElementById("settingsUsernameInput"),
    settingsUsernameError: document.getElementById("settingsUsernameError"),
    settingsUsernameSaveBtn: document.getElementById("settingsUsernameSaveBtn"),
    settingsNewPassword: document.getElementById("settingsNewPassword"),
    settingsConfirmPassword: document.getElementById("settingsConfirmPassword"),
    settingsPasswordError: document.getElementById("settingsPasswordError"),
    settingsPasswordNote: document.getElementById("settingsPasswordNote"),
    settingsPasswordSaveBtn: document.getElementById("settingsPasswordSaveBtn"),

    leaderboardBackBtn: document.getElementById("leaderboardBackBtn"),
    leaderboardList: document.getElementById("leaderboardList"),

    adminNavBtn: document.getElementById("adminNavBtn"),
    adminView: document.getElementById("adminView"),
    adminBackBtn: document.getElementById("adminBackBtn"),
    adminList: document.getElementById("adminList"),
  };

  /* ---------- stars background ---------- */
  (function makeStars(){
    const wrap = document.getElementById("stars");
    for(let i=0;i<40;i++){
      const s = document.createElement("div");
      s.className = "star";
      s.style.left = Math.random()*100 + "vw";
      s.style.top = Math.random()*100 + "vh";
      s.style.animationDelay = (Math.random()*4).toFixed(2) + "s";
      wrap.appendChild(s);
    }
  })();

  /* =========================================================
     AUTH
     ========================================================= */
  let mode = "signin"; // "signin" | "signup" | "chooseUsername"
  let currentUser = null;
  let cachedStats = {
    totalXP: 0, username: null, usernameChangedAt: null,
    isOwner: false, isTester: false, isHelper: false,
    isAdmin: false, isInvisible: false, bypassSleep: false, unlimitedQuests: false,
    streak: 0, lastStreakDay: null,
    dailyProgress: null
  };
  let profileRowExists = false;
  let tickTimer = null;

  function setMode(newMode){
    mode = newMode;
    el.loginError.textContent = "";
    el.loginNote.textContent = "";

    if(mode === "signin"){
      el.emailField.classList.remove("hidden");
      el.usernameField.classList.add("hidden");
      el.passwordField.classList.remove("hidden");
      el.loginToggleRow.classList.remove("hidden");
      el.loginHeading.textContent = "Log in";
      el.loginSub.textContent = "Log in with your email or username to load your quests, level and streak on this device.";
      el.loginSubmitBtn.textContent = "Log in";
      el.toggleText.textContent = "No account yet?";
      el.toggleModeBtn.textContent = "Create one";
      el.emailLabel.textContent = "Email or username";
      el.emailInput.placeholder = "you@example.com or username";
      el.passwordInput.setAttribute("autocomplete", "current-password");
    } else if(mode === "signup"){
      el.emailField.classList.remove("hidden");
      el.usernameField.classList.remove("hidden");
      el.passwordField.classList.remove("hidden");
      el.loginToggleRow.classList.remove("hidden");
      el.loginHeading.textContent = "Create your account";
      el.loginSub.textContent = "One account, any device. Your quests, level and streak follow you.";
      el.loginSubmitBtn.textContent = "Create account";
      el.toggleText.textContent = "Already have an account?";
      el.toggleModeBtn.textContent = "Log in";
      el.emailLabel.textContent = "Email";
      el.emailInput.placeholder = "you@example.com";
      el.passwordInput.setAttribute("autocomplete", "new-password");
    } else if(mode === "chooseUsername"){
      el.emailField.classList.add("hidden");
      el.usernameField.classList.remove("hidden");
      el.passwordField.classList.add("hidden");
      el.loginToggleRow.classList.add("hidden");
      el.loginHeading.textContent = "Pick a username";
      el.loginSub.textContent = "Letters, numbers, . and _ only — at least 4 characters. This is how you'll show up on the leaderboard.";
      el.loginSubmitBtn.textContent = "Save username";
    }
  }
  el.toggleModeBtn.addEventListener("click", () => setMode(mode === "signin" ? "signup" : "signin"));

  // Enter key submits the login/signup/username form, same as clicking the button
  [el.emailInput, el.usernameInput, el.passwordInput].forEach(input => {
    input.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        el.loginSubmitBtn.click();
      }
    });
  });

  el.loginSubmitBtn.addEventListener("click", async () => {
    el.loginError.textContent = "";
    el.loginNote.textContent = "";

    if(mode === "chooseUsername"){
      const username = el.usernameInput.value.trim();
      if(!isValidUsername(username)){
        el.loginError.textContent = "Username must be 4-20 characters: letters, numbers, . or _ only.";
        return;
      }
      el.loginSubmitBtn.disabled = true;
      el.loginSubmitBtn.textContent = "Saving…";
      const err = await claimUsername(username, !profileRowExists);
      el.loginSubmitBtn.disabled = false;
      el.loginSubmitBtn.textContent = "Save username";
      if(err){
        console.error("claimUsername error:", err);
        el.loginError.textContent = (err.code === "23505")
          ? "That username is already taken. Try another."
          : `Couldn't save that username: ${err.message || "unknown error"}`;
        return;
      }
      profileRowExists = true;
      SoundFX.login();
      enterApp();
      return;
    }

    const email = el.emailInput.value.trim();
    const password = el.passwordInput.value;

    if(mode === "signup"){
      const username = el.usernameInput.value.trim();
      if(!isValidUsername(username)){
        el.loginError.textContent = "Username must be 4-20 characters: letters, numbers, . or _ only.";
        return;
      }
      if(!email || !password){
        el.loginError.textContent = "Enter an email and a password.";
        return;
      }

      el.loginSubmitBtn.disabled = true;
      el.loginSubmitBtn.textContent = "Please wait…";
      try{
        const { data, error } = await supabase.auth.signUp({ email, password });
        if(error){ el.loginError.textContent = error.message; return; }
        if(data.session){
          currentUser = data.user;
          const err = await claimUsername(username, true);
          if(err){
            profileRowExists = false;
            setMode("chooseUsername");
            el.loginError.textContent = (err.code === "23505")
              ? "That username is already taken. Try another."
              : "Couldn't save that username. Try another.";
            return;
          }
          profileRowExists = true;
          SoundFX.login();
          await enterApp();
        } else {
          el.loginNote.textContent = "Account created. Check your email to confirm, then log in.";
          setMode("signin");
          alert("Almost there! Confirm your email from Supabase Auth before you can log in — and check your spam folder if you don't see it.");
        }
      } catch(err){
        el.loginError.textContent = "Something went wrong. Try again.";
      } finally {
        el.loginSubmitBtn.disabled = false;
        if(mode === "signup") setMode(mode);
      }
      return;
    }

    // signin — the "email" field also accepts a username here
    if(!email || !password){
      el.loginError.textContent = "Enter both an email/username and a password.";
      return;
    }
    el.loginSubmitBtn.disabled = true;
    el.loginSubmitBtn.textContent = "Please wait…";
    try{
      let loginEmail = email;
      if(!email.includes("@")){
        const { data: resolvedEmail, error: lookupError } = await supabase.rpc("get_email_by_username", { uname: email });
        if(lookupError || !resolvedEmail){
          el.loginError.textContent = "No account found with that username.";
          return;
        }
        loginEmail = resolvedEmail;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if(error){ el.loginError.textContent = error.message; return; }
      currentUser = data.user;
      await loadUserStats();
      if(!cachedStats.username){
        setMode("chooseUsername");
      } else {
        SoundFX.login();
        await enterApp();
      }
    } catch(err){
      el.loginError.textContent = "Something went wrong. Try again.";
    } finally {
      el.loginSubmitBtn.disabled = false;
      if(mode === "signin") setMode(mode);
    }
  });

  /* ---------- sign out (custom in-page modal, not a native confirm()) ---------- */
  el.signOutBtn.addEventListener("click", () => {
    el.signOutModal.classList.remove("hidden");
  });

  el.signOutCancelBtn.addEventListener("click", () => {
    el.signOutModal.classList.add("hidden");
  });

  el.signOutModal.addEventListener("click", (e) => {
    if(e.target === el.signOutModal){
      el.signOutModal.classList.add("hidden");
    }
  });

  el.signOutConfirmBtn.addEventListener("click", async () => {
    el.signOutModal.classList.add("hidden");
    document.body.classList.remove("admin-old-style");
    if(tickTimer) clearInterval(tickTimer);
    await supabase.auth.signOut();
    currentUser = null;
    el.appView.classList.add("hidden");
    el.settingsView.classList.add("hidden");
    el.leaderboardView.classList.add("hidden");
    el.adminView.classList.add("hidden");
    el.loginView.classList.remove("hidden");
    el.emailInput.value = "";
    el.passwordInput.value = "";
    el.usernameInput.value = "";
    el.adminNavBtn.classList.add("hidden");
    setMode("signin");
  });

  async function enterApp(){
    document.body.classList.remove("admin-old-style");
    el.accountUsername.innerHTML = "@" + cachedStats.username + badgeHTML(cachedStats);
    el.loginView.classList.add("hidden");
    el.settingsView.classList.add("hidden");
    el.leaderboardView.classList.add("hidden");
    el.adminView.classList.add("hidden");
    el.appView.classList.remove("hidden");
    refreshOwnerUI();
    tick();
    if(!tickTimer) tickTimer = setInterval(tick, 15000);
  }

  function refreshOwnerUI(){
    const canAdmin = !!cachedStats.isOwner || !!cachedStats.isAdmin;
    el.adminNavBtn.classList.toggle("hidden", !canAdmin);
  }

  async function onLoggedIn(user){
    currentUser = user;
    await loadUserStats();
    if(!cachedStats.username){
      setMode("chooseUsername");
      el.loginView.classList.remove("hidden");
      el.appView.classList.add("hidden");
      return;
    }
    await enterApp();
  }

  async function loadUserStats(){
    const { data, error } = await supabase
      .from("quest_stats")
      .select("total_xp, streak, last_completed_quest_day, username, username_changed_at, is_owner, is_tester, is_helper, is_admin, is_invisible, bypass_sleep, unlimited_quests, daily_progress")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    const blank = () => ({
      totalXP: 0, username: null, usernameChangedAt: null,
      isOwner: false, isTester: false, isHelper: false,
      isAdmin: false, isInvisible: false, bypassSleep: false, unlimitedQuests: false,
      streak: 0, lastStreakDay: null,
      dailyProgress: null
    });

    if(error){
      console.error(error);
      cachedStats = blank();
      profileRowExists = false;
      return;
    }

    if(!data){
      profileRowExists = false;
      cachedStats = blank();
    } else {
      profileRowExists = true;
      let dailyProgress = null;
      if(data.daily_progress){
        try{ dailyProgress = JSON.parse(data.daily_progress); } catch(e){ dailyProgress = null; }
      }
      cachedStats = {
        totalXP: data.total_xp,
        username: data.username,
        usernameChangedAt: data.username_changed_at,
        isOwner: data.is_owner,
        isTester: data.is_tester,
        isHelper: data.is_helper,
        isAdmin: data.is_admin,
        isInvisible: data.is_invisible,
        bypassSleep: data.bypass_sleep,
        unlimitedQuests: data.unlimited_quests,
        streak: data.streak || 0,
        lastStreakDay: data.last_completed_quest_day,
        dailyProgress: dailyProgress
      };
    }
  }

  async function saveUserStats(){
    await supabase.from("quest_stats").update({
      total_xp: cachedStats.totalXP,
      streak: cachedStats.streak,
      last_completed_quest_day: cachedStats.lastStreakDay,
      daily_progress: JSON.stringify(cachedStats.dailyProgress),
      updated_at: new Date().toISOString()
    }).eq("user_id", currentUser.id);
  }

  /* creates (isNewRow=true) or updates (isNewRow=false) the username.
     returns null on success, or the Supabase error object on failure. */
  async function claimUsername(username, isNewRow){
    const nowIso = new Date().toISOString();
    if(isNewRow){
      const initialProgress = defaultProgress(getQuestDay(new Date()));
      const { error } = await supabase.from("quest_stats").insert({
        user_id: currentUser.id,
        total_xp: 0,
        streak: 0,
        last_completed_quest_day: null,
        daily_progress: JSON.stringify(initialProgress),
        username: username,
        username_changed_at: nowIso
      });
      if(error) return error;
      cachedStats = {
        totalXP: 0, username, usernameChangedAt: nowIso,
        isOwner: false, isTester: false, isHelper: false,
        isAdmin: false, isInvisible: false, bypassSleep: false, unlimitedQuests: false,
        streak: 0, lastStreakDay: null,
        dailyProgress: initialProgress
      };
      return null;
    } else {
      const { error } = await supabase.from("quest_stats")
        .update({ username: username, username_changed_at: nowIso })
        .eq("user_id", currentUser.id);
      if(error) return error;
      cachedStats.username = username;
      cachedStats.usernameChangedAt = nowIso;
      return null;
    }
  }

  /* on page load, check for an existing session (keeps you logged in) */
  (async function initSession(){
    const { data } = await supabase.auth.getSession();
    if(data.session && data.session.user){
      await onLoggedIn(data.session.user);
    }
  })();

  /* =========================================================
     DAILY PROGRESS ENGINE
     ========================================================= */

  // Folds a finished day's banked xp into the real total exactly once,
  // applying that day's streak multiplier at this single moment — the
  // multiplier never touches individual quest completions, only the
  // day's total when it settles.
  function settleDay(progress){
    if(progress.settled) return;
    const questDay = progress.day;
    const earnedToday = progress.pendingXp;

    if(earnedToday > 0){
      const prevDay = addDaysStr(questDay, -1);
      if(cachedStats.lastStreakDay === prevDay){
        cachedStats.streak += 1;
      } else if(cachedStats.lastStreakDay !== questDay){
        cachedStats.streak = 1;
      }
      cachedStats.lastStreakDay = questDay;

      const multiplier = streakMultiplier(cachedStats.streak);
      const boosted = Math.round(earnedToday * multiplier);
      cachedStats.totalXP += boosted;
      progress.pendingXp = 0;
    } else {
      cachedStats.streak = 0;
    }

    progress.settled = true;
  }

  // makes sure cachedStats.dailyProgress correctly reflects "right now":
  // rolls over to a fresh day at 06:00, folds pending xp into the real
  // total once the day's active window ends (22:00), and resets the
  // current hour's pick once the clock moves into a new hour slot.
  function ensureProgressForNow(){
    const now = new Date();
    const questDay = getQuestDay(now);
    const hour = now.getHours();
    let progress = cachedStats.dailyProgress;

    if(!progress || progress.day !== questDay){
      if(progress && !progress.settled){
        settleDay(progress);
      }
      progress = defaultProgress(questDay);
      cachedStats.dailyProgress = progress;
      saveUserStats();
      return progress;
    }

    const awake = cachedStats.bypassSleep || (hour >= HOUR_START && hour < HOUR_END);

    if(!awake){
      if(!progress.settled){
        settleDay(progress);
        saveUserStats();
      }
      return progress;
    }

    const effectiveHour = cachedStats.bypassSleep
      ? HOUR_START + (((hour - HOUR_START) % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY
      : hour;

    if(progress.hour !== effectiveHour){
      progress.hour = effectiveHour;
      progress.pick = null;
      progress.resolved = false;
      progress.completed = false;
      saveUserStats();
    }

    return progress;
  }

  function onPickQuest(difficulty){
    const progress = cachedStats.dailyProgress;
    if(!progress) return;
    if(progress.pick !== null && !cachedStats.unlimitedQuests) return;
    progress.pick = difficulty;
    progress.resolved = false;
    progress.completed = false;
    saveUserStats();
    tick();
  }

  async function onCompleteQuest(){
    const progress = cachedStats.dailyProgress;
    if(!progress || !progress.pick) return;
    if(progress.resolved && !cachedStats.unlimitedQuests) return;

    const schedule = getDailySchedule(progress.day);
    const slot = schedule.find(s => s.hour === progress.hour);
    if(!slot) return;
    const quest = slot[progress.pick];

    SoundFX.complete();

    progress.pendingXp += quest.xp;
    progress.resolved = true;
    progress.completed = true;

    renderStats();
    viewHourComplete(slot, progress);
    await saveUserStats();
  }

  /* =========================================================
     QUEST VIEWS
     ========================================================= */
  function viewSleep(now){
    const hour = now.getHours();
    const wake = new Date(now);
    if(hour >= HOUR_END){ wake.setDate(wake.getDate()+1); }
    wake.setHours(HOUR_START,0,0,0);
    const diffMs = wake - now;
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);

    el.card.innerHTML = `
      <div class="center-block state-fade">
        <div class="big-icon">${ICON_MOON}</div>
        <p class="center-title">Questie is asleep</p>
        <p class="center-sub">Hourly quests run 06:00–22:00. Today's xp has been folded into your total with your streak multiplier applied — a fresh set unlocks at 06:00.</p>
        <span class="mono-note">new quests in ${h}h ${pad2(m)}m</span>
      </div>
    `;
  }

  function viewHourChoice(slot, now){
    const mins = minutesUntilNextHour(now);
    el.card.innerHTML = `
      <div class="state-fade" style="display:flex; flex-direction:column; gap:14px;">
        <div class="quest-eyebrow-icon">${ICON_SCROLL}</div>
        <p class="quest-hour-note">Pick one for this hour · new set in ${mins}m</p>
        <div class="quest-choice-list">
          <button class="quest-choice quest-choice-easy" data-diff="easy">
            <span class="quest-choice-tag">Easy · +${slot.easy.xp} xp</span>
            <span class="quest-choice-text">${slot.easy.text}</span>
          </button>
          <button class="quest-choice quest-choice-medium" data-diff="medium">
            <span class="quest-choice-tag">Medium · +${slot.medium.xp} xp</span>
            <span class="quest-choice-text">${slot.medium.text}</span>
          </button>
          <button class="quest-choice quest-choice-hard" data-diff="hard">
            <span class="quest-choice-tag">Hard · +${slot.hard.xp} xp</span>
            <span class="quest-choice-text">${slot.hard.text}</span>
          </button>
        </div>
      </div>
    `;
    el.card.querySelectorAll(".quest-choice").forEach(btn => {
      btn.addEventListener("click", () => onPickQuest(btn.dataset.diff));
    });
  }

  function viewHourActive(slot, progress, now){
    const mins = minutesUntilNextHour(now);
    const quest = slot[progress.pick];
    el.card.innerHTML = `
      <div class="state-fade" style="display:flex; flex-direction:column; gap:14px;">
        <div class="quest-eyebrow-icon">${ICON_SCROLL}</div>
        <span class="quest-diff-pill quest-diff-${progress.pick}">${progress.pick}</span>
        <p class="quest-title">${quest.text}</p>
        <div class="quest-meta">worth <strong>${quest.xp} xp</strong> · ${mins}m left this hour</div>
        <button class="btn" id="completeBtn">${ICON_BTN_CHECK} Mark as complete</button>
      </div>
    `;
    document.getElementById("completeBtn").addEventListener("click", onCompleteQuest);
  }

  function viewHourComplete(slot, progress){
    const quest = slot[progress.pick];
    el.card.innerHTML = `
      <div class="center-block state-fade">
        <div class="big-icon moss">${ICON_CHECK}</div>
        <p class="center-title">+${quest.xp} xp added to today</p>
        <p class="center-sub">Nice work. A new set of quests unlocks at the top of the hour.</p>
      </div>
    `;
  }

  function renderQuestArea(progress){
    const now = new Date();
    const hour = now.getHours();
    const awake = cachedStats.bypassSleep || (hour >= HOUR_START && hour < HOUR_END);

    if(!awake){ viewSleep(now); return; }

    const schedule = getDailySchedule(progress.day);
    const slot = schedule.find(s => s.hour === progress.hour) || schedule[0];

    if(progress.pick && progress.resolved && progress.completed){
      viewHourComplete(slot, progress);
    } else if(progress.pick){
      viewHourActive(slot, progress, now);
    } else {
      viewHourChoice(slot, now);
    }
  }

  /* ---------- top stat rendering ---------- */
  function renderStats(){
    const lvl = levelInfo(cachedStats.totalXP);
    el.level.textContent = lvl.level;

    el.streak.textContent = cachedStats.streak;
    const mult = streakMultiplier(cachedStats.streak);
    el.streakMult.textContent = `x${formatMultiplier(mult)} mult`;

    const progress = cachedStats.dailyProgress;
    el.todayXp.textContent = `${progress ? progress.pendingXp : 0} xp`;

    el.xpText.textContent = `${lvl.into} / ${lvl.needed} xp`;
    el.xpToGo.textContent = `${lvl.needed - lvl.into} to go`;
    el.xpFill.style.width = Math.min(100, Math.round((lvl.into / lvl.needed) * 100)) + "%";
  }

  /* ---------- main tick ---------- */
  function tick(){
    if(!currentUser) return;
    const progress = ensureProgressForNow();
    renderStats();
    renderQuestArea(progress);
  }

  /* =========================================================
     SETTINGS
     ========================================================= */
  function openSettings(){
    el.appView.classList.add("hidden");
    el.settingsView.classList.remove("hidden");

    el.settingsEmail.textContent = currentUser.email;
    el.settingsUsername.innerHTML = "@" + cachedStats.username + badgeHTML(cachedStats);
    el.settingsUsernameForm.classList.add("hidden");
    el.settingsUsernameInput.value = "";
    el.settingsUsernameError.textContent = "";
    el.settingsNewPassword.value = "";
    el.settingsConfirmPassword.value = "";
    el.settingsPasswordError.textContent = "";
    el.settingsPasswordNote.textContent = "";

    const cooldownInfo = usernameCooldown();
    if(cooldownInfo.onCooldown){
      el.settingsEditUsernameBtn.classList.add("hidden");
      el.settingsUsernameCooldown.textContent = `you can change your username again on ${cooldownInfo.availableOn}`;
    } else {
      el.settingsEditUsernameBtn.classList.remove("hidden");
      el.settingsUsernameCooldown.textContent = "";
    }
  }

  function usernameCooldown(){
    if(!cachedStats.usernameChangedAt) return { onCooldown: false };
    const changed = new Date(cachedStats.usernameChangedAt);
    const nextAllowed = new Date(changed);
    nextAllowed.setDate(nextAllowed.getDate() + USERNAME_COOLDOWN_DAYS);
    const now = new Date();
    if(now < nextAllowed){
      return {
        onCooldown: true,
        availableOn: `${pad2(nextAllowed.getDate())}/${pad2(nextAllowed.getMonth()+1)}`
      };
    }
    return { onCooldown: false };
  }

  el.settingsBtn.addEventListener("click", openSettings);
  el.settingsBackBtn.addEventListener("click", () => {
    el.settingsView.classList.add("hidden");
    el.appView.classList.remove("hidden");
    tick();
  });

  el.settingsEditUsernameBtn.addEventListener("click", () => {
    el.settingsUsernameForm.classList.remove("hidden");
    el.settingsUsernameInput.focus();
  });

  el.settingsUsernameSaveBtn.addEventListener("click", async () => {
    const username = el.settingsUsernameInput.value.trim();
    el.settingsUsernameError.textContent = "";
    if(!isValidUsername(username)){
      el.settingsUsernameError.textContent = "Username must be 4-20 characters: letters, numbers, . or _ only.";
      return;
    }
    el.settingsUsernameSaveBtn.disabled = true;
    el.settingsUsernameSaveBtn.textContent = "Saving…";
    const err = await claimUsername(username, false);
    el.settingsUsernameSaveBtn.disabled = false;
    el.settingsUsernameSaveBtn.textContent = "Save username";
    if(err){
      console.error("claimUsername error:", err);
      el.settingsUsernameError.textContent = (err.code === "23505")
        ? "That username is already taken. Try another."
        : `Couldn't save that username: ${err.message || "unknown error"}`;
      return;
    }
    el.accountUsername.innerHTML = "@" + cachedStats.username + badgeHTML(cachedStats);
    openSettings();
  });

  el.settingsPasswordSaveBtn.addEventListener("click", async () => {
    const p1 = el.settingsNewPassword.value;
    const p2 = el.settingsConfirmPassword.value;
    el.settingsPasswordError.textContent = "";
    el.settingsPasswordNote.textContent = "";

    if(p1.length < 6){
      el.settingsPasswordError.textContent = "Password must be at least 6 characters.";
      return;
    }
    if(p1 !== p2){
      el.settingsPasswordError.textContent = "Passwords don't match.";
      return;
    }

    el.settingsPasswordSaveBtn.disabled = true;
    el.settingsPasswordSaveBtn.textContent = "Updating…";
    const { error } = await supabase.auth.updateUser({ password: p1 });
    el.settingsPasswordSaveBtn.disabled = false;
    el.settingsPasswordSaveBtn.textContent = "Update password";

    if(error){
      el.settingsPasswordError.textContent = error.message;
      return;
    }
    el.settingsNewPassword.value = "";
    el.settingsConfirmPassword.value = "";
    el.settingsPasswordNote.textContent = "Password updated.";
  });

  /* =========================================================
     LEADERBOARD
     ========================================================= */
  async function openLeaderboard(){
    el.appView.classList.add("hidden");
    el.leaderboardView.classList.remove("hidden");
    el.leaderboardList.innerHTML = `<p class="center-sub" style="text-align:center;">Loading…</p>`;

    const { data, error } = await supabase
      .from("quest_stats")
      .select("username, total_xp, is_owner, is_tester, is_helper")
      .not("username", "is", null)
      .eq("is_invisible", false)
      .order("total_xp", { ascending: false })
      .limit(10);

    if(error || !data || data.length === 0){
      el.leaderboardList.innerHTML = `<p class="center-sub" style="text-align:center;">No one on the board yet. Be the first.</p>`;
      return;
    }

    el.leaderboardList.innerHTML = data.map((row, i) => {
      const lvl = levelInfo(row.total_xp).level;
      const isMe = cachedStats.username && row.username.toLowerCase() === cachedStats.username.toLowerCase();
      const badges = badgeHTML({ isOwner: row.is_owner, isTester: row.is_tester, isHelper: row.is_helper });
      return `
        <div class="leaderboard-row${isMe ? " me" : ""}">
          <span class="leaderboard-rank">${i+1}</span>
          <span class="leaderboard-name"><span class="name-text">@${row.username}</span>${badges}</span>
          <span class="leaderboard-level">lv ${lvl}</span>
        </div>
      `;
    }).join("");
  }

  el.leaderboardBtn.addEventListener("click", openLeaderboard);
  el.leaderboardBackBtn.addEventListener("click", () => {
    el.leaderboardView.classList.add("hidden");
    el.appView.classList.remove("hidden");
    tick();
  });

  /* =========================================================
     ADMIN (owner + admin only)
     ========================================================= */
  el.adminNavBtn.addEventListener("click", async () => {
    if(!cachedStats.isOwner && !cachedStats.isAdmin) return;
    const code = prompt("Enter admin code:");
    if(code === null) return;
    if(code !== ADMIN_CODE){ alert("Wrong code."); return; }
    await openAdminPanel();
  });

  el.adminBackBtn.addEventListener("click", () => {
    document.body.classList.remove("admin-old-style");
    el.adminView.classList.add("hidden");
    el.appView.classList.remove("hidden");
    tick();
  });

  async function openAdminPanel(){
    // admin panel renders as a deliberately plain, unstyled "old website" —
    // see body.admin-old-style in styles.css. Functionality is unchanged.
    document.body.classList.add("admin-old-style");
    el.appView.classList.add("hidden");
    el.adminView.classList.remove("hidden");
    el.adminList.innerHTML = `<p class="center-sub" style="text-align:center;">Loading…</p>`;

    const { data, error } = await supabase
      .from("quest_stats")
      .select("user_id, username, total_xp, is_owner, is_tester, is_helper, bypass_sleep, unlimited_quests, is_invisible")
      .order("username", { ascending: true });

    if(error || !data){
      el.adminList.innerHTML = `<p class="center-sub" style="text-align:center;">Couldn't load users.</p>`;
      return;
    }

    el.adminList.innerHTML = data.map(row => {
      const lvl = levelInfo(row.total_xp).level;
      const name = row.username ? "@" + row.username : "(no username yet)";
      const ownerBadge = row.is_owner ? `<span class="badge badge-gold" data-tooltip="Developer">${ICON_CHECK}</span>` : "";
      const invisibleTag = row.is_invisible ? `<span class="invisible-tag">hidden</span>` : "";
      return `
        <div class="admin-row" data-uid="${row.user_id}">
          <div class="admin-row-top">
            <span class="leaderboard-name"><span class="name-text">${name}</span>${ownerBadge}${invisibleTag}</span>
            <span class="leaderboard-level" data-role="level-display">lv ${lvl}</span>
          </div>
          <div class="admin-row-actions">
            <button class="toggle-btn ${row.is_tester ? "active-blue" : ""}" data-field="is_tester" data-value="${!row.is_tester}">tester</button>
            <button class="toggle-btn ${row.is_helper ? "active-green" : ""}" data-field="is_helper" data-value="${!row.is_helper}">helper</button>
            <button class="toggle-btn ${row.bypass_sleep ? "active-orange" : ""}" data-field="bypass_sleep" data-value="${!row.bypass_sleep}">sleep off</button>
            <button class="toggle-btn ${row.unlimited_quests ? "active-teal" : ""}" data-field="unlimited_quests" data-value="${!row.unlimited_quests}">unlimited</button>
            <button class="toggle-btn ${row.is_invisible ? "active-purple" : ""}" data-field="is_invisible" data-value="${!row.is_invisible}">hidden</button>
            <div class="admin-level-set">
              <input type="number" min="0" class="level-input" value="${lvl}">
              <button class="toggle-btn level-set-btn">set lvl</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  el.adminList.addEventListener("click", async (e) => {
    const levelBtn = e.target.closest(".level-set-btn");
    if(levelBtn){
      const row = levelBtn.closest(".admin-row");
      const uid = row.dataset.uid;
      const input = row.querySelector(".level-input");
      const desiredLevel = Math.max(0, parseInt(input.value, 10) || 0);
      const newXP = xpForLevelStart(desiredLevel);

      levelBtn.disabled = true;
      const { error } = await supabase.from("quest_stats").update({ total_xp: newXP }).eq("user_id", uid);
      levelBtn.disabled = false;

      if(error){ alert("Couldn't set that level: " + error.message); return; }

      row.querySelector('[data-role="level-display"]').textContent = "lv " + desiredLevel;

      if(currentUser && uid === currentUser.id){
        cachedStats.totalXP = newXP;
        tick();
      }
      return;
    }

    const btn = e.target.closest(".toggle-btn");
    if(!btn) return;
    const row = btn.closest(".admin-row");
    const uid = row.dataset.uid;
    const field = btn.dataset.field;
    const newValue = btn.dataset.value === "true";

    btn.disabled = true;
    const { error } = await supabase.from("quest_stats").update({ [field]: newValue }).eq("user_id", uid);
    btn.disabled = false;

    if(error){ alert("Couldn't update that badge: " + error.message); return; }

    if(field === "is_tester") btn.classList.toggle("active-blue", newValue);
    if(field === "is_helper") btn.classList.toggle("active-green", newValue);
    if(field === "bypass_sleep") btn.classList.toggle("active-orange", newValue);
    if(field === "unlimited_quests") btn.classList.toggle("active-teal", newValue);
    if(field === "is_invisible") btn.classList.toggle("active-purple", newValue);
    btn.dataset.value = (!newValue).toString();

    if(currentUser && uid === currentUser.id){
      if(field === "is_tester") cachedStats.isTester = newValue;
      if(field === "is_helper") cachedStats.isHelper = newValue;
      if(field === "bypass_sleep") cachedStats.bypassSleep = newValue;
      if(field === "unlimited_quests") cachedStats.unlimitedQuests = newValue;
      if(field === "is_invisible") cachedStats.isInvisible = newValue;
      el.accountUsername.innerHTML = "@" + cachedStats.username + badgeHTML(cachedStats);
    }
  });

})();
