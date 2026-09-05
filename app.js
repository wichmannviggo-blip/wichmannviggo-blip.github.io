(function(){

  /* =========================================================
     SUPABASE CONFIG — paste your own project values here
     Get these from: Supabase dashboard -> Project Settings -> API
     ========================================================= */
  const SUPABASE_URL = "https://ulnimalkakdkutcsiiqx.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_vinWN7-Ec9WP9rZX_c4szg_wyybhxPk";

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ---------- content ---------- */
  const QUESTS = [
    "Give a genuine compliment to 20 different people today.",
    "Start a real conversation with 5 people you've never talked to before.",
    "Write a short note thanking someone who's helped you, and actually give it to them.",
    "Learn 10 words in a language you don't speak, then use 3 of them out loud today.",
    "Take a 20-minute walk somewhere in your area you've never been before.",
    "Call someone you haven't spoken to in over a year. No texting allowed.",
    "Ask 3 strangers what they're passionate about, and really listen to the answer.",
    "Do something kind for a stranger without letting them know it was you.",
    "Sit somewhere public for 20 minutes with your phone away, just observing.",
    "Teach someone something you know how to do, start to finish."
  ];

  const ADMIN_CODE = "Ksl14cpe!@";

  /* ---------- icons ---------- */
  const ICON_MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>`;
  const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.3 2.3L16 10"/></svg>`;
  const ICON_SCROLL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h11a2 2 0 0 1 2 2v13a1 1 0 0 1-1.6.8L15 18l-2.4 1.8a1 1 0 0 1-1.2 0L9 18l-2.4 1.8A1 1 0 0 1 5 19V6a2 2 0 0 1 1-1Z"/><path d="M9 9h6M9 12.5h6"/></svg>`;
  const ICON_BTN_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 6"/></svg>`;
  const ICON_HAMMER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="13" y="2" width="9" height="6" rx="1.4" transform="rotate(45 17.5 5)"/><path d="M15.3 7.3 4.2 18.4"/><path d="M3 19.5 4.6 21"/></svg>`;

  /* ---------- date / time helpers ---------- */
  function fmtDate(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }
  function getQuestDay(now){
    const d = new Date(now);
    if(d.getHours() < 6){ d.setDate(d.getDate()-1); }
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
  function getQuestForDay(dateStr){ return QUESTS[ hashStr(dateStr) % QUESTS.length ]; }
  function xpForHour(hour){
    if(hour < 6 || hour >= 22) return null;
    return Math.max(5, 100 - (hour - 6) * 5);
  }
  function pad2(n){ return String(n).padStart(2,"0"); }

  /* ---------- streak xp multiplier: day 0 of a streak = x1, day 1 = x1.5,
     day 2 = x2, etc. Resets back to x1 whenever the streak resets. ---------- */
  function streakMultiplier(streakCount){
    return 1 + 0.5 * Math.max(0, streakCount - 1);
  }
  function formatMultiplier(m){
    return (Math.round(m * 10) / 10).toString().replace(/\.0$/, "");
  }
  /* works out the "real" current streak (accounting for a broken streak that
     hasn't been re-rendered yet) plus what the streak WOULD be if the user
     completes (or already completed) today's quest — used both to preview
     the multiplier before completing and to apply it for real on completion */
  function computeStreakState(questDay){
    let effectiveStreak = cachedStats.streak;
    const prevDay = addDaysStr(questDay, -1);
    if(cachedStats.lastCompletedQuestDay && cachedStats.lastCompletedQuestDay !== questDay && cachedStats.lastCompletedQuestDay !== prevDay){
      effectiveStreak = 0;
    }
    const alreadyCompletedToday = cachedStats.lastCompletedQuestDay === questDay;
    let projectedStreak;
    if(alreadyCompletedToday){
      projectedStreak = cachedStats.streak;
    } else if(cachedStats.lastCompletedQuestDay === prevDay){
      projectedStreak = effectiveStreak + 1;
    } else {
      projectedStreak = 1;
    }
    return { effectiveStreak, alreadyCompletedToday, projectedStreak };
  }

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

  /* ---------- badge tap/click tooltip (works on touch, not just hover) ----------
     Tapping a badge toggles a small tooltip next to it; tapping elsewhere,
     or tapping another badge, closes it. Delegated on document so this
     keeps working for badges that get re-rendered dynamically. */
  document.addEventListener("click", (e) => {
    const badge = e.target.closest(".badge");
    document.querySelectorAll(".badge.show-tip").forEach(b => {
      if(b !== badge) b.classList.remove("show-tip");
    });
    if(badge){
      badge.classList.toggle("show-tip");
    }
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
  /* total XP required to sit at the very start of a given level —
     used by the admin "set level" control */
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
    clock: document.getElementById("clock"),
    level: document.getElementById("levelValue"),
    streak: document.getElementById("streakValue"),
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
    totalXP: 0, streak: 0, lastCompletedQuestDay: null, username: null, usernameChangedAt: null,
    isOwner: false, isTester: false, isHelper: false,
    isAdmin: false, isInvisible: false, bypassSleep: false, unlimitedQuests: false
  };
  let profileRowExists = false; // whether a quest_stats row already exists for currentUser
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
        el.loginError.textContent = (err.code === "23505")
          ? "That username is already taken. Try another."
          : "Couldn't save that username. Try another.";
        return;
      }
      profileRowExists = true;
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

  // clicking the dimmed backdrop also cancels
  el.signOutModal.addEventListener("click", (e) => {
    if(e.target === el.signOutModal){
      el.signOutModal.classList.add("hidden");
    }
  });

  el.signOutConfirmBtn.addEventListener("click", async () => {
    el.signOutModal.classList.add("hidden");
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
      .select("total_xp, streak, last_completed_quest_day, username, username_changed_at, is_owner, is_tester, is_helper, is_admin, is_invisible, bypass_sleep, unlimited_quests")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if(error){
      console.error(error);
      cachedStats = {
        totalXP: 0, streak: 0, lastCompletedQuestDay: null, username: null, usernameChangedAt: null,
        isOwner: false, isTester: false, isHelper: false,
        isAdmin: false, isInvisible: false, bypassSleep: false, unlimitedQuests: false
      };
      profileRowExists = false;
      return;
    }

    if(!data){
      profileRowExists = false;
      cachedStats = {
        totalXP: 0, streak: 0, lastCompletedQuestDay: null, username: null, usernameChangedAt: null,
        isOwner: false, isTester: false, isHelper: false,
        isAdmin: false, isInvisible: false, bypassSleep: false, unlimitedQuests: false
      };
    } else {
      profileRowExists = true;
      cachedStats = {
        totalXP: data.total_xp,
        streak: data.streak,
        lastCompletedQuestDay: data.last_completed_quest_day,
        username: data.username,
        usernameChangedAt: data.username_changed_at,
        isOwner: data.is_owner,
        isTester: data.is_tester,
        isHelper: data.is_helper,
        isAdmin: data.is_admin,
        isInvisible: data.is_invisible,
        bypassSleep: data.bypass_sleep,
        unlimitedQuests: data.unlimited_quests
      };
    }
  }

  async function saveUserStats(){
    await supabase.from("quest_stats").update({
      total_xp: cachedStats.totalXP,
      streak: cachedStats.streak,
      last_completed_quest_day: cachedStats.lastCompletedQuestDay,
      updated_at: new Date().toISOString()
    }).eq("user_id", currentUser.id);
  }

  /* creates (isNewRow=true) or updates (isNewRow=false) the username.
     returns null on success, or the Supabase error object on failure. */
  async function claimUsername(username, isNewRow){
    const nowIso = new Date().toISOString();
    if(isNewRow){
      const { error } = await supabase.from("quest_stats").insert({
        user_id: currentUser.id,
        total_xp: 0,
        streak: 0,
        last_completed_quest_day: null,
        username: username,
        username_changed_at: nowIso
      });
      if(error) return error;
      cachedStats = {
        totalXP: 0, streak: 0, lastCompletedQuestDay: null, username, usernameChangedAt: nowIso,
        isOwner: false, isTester: false, isHelper: false,
        isAdmin: false, isInvisible: false, bypassSleep: false, unlimitedQuests: false
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
     QUEST VIEWS
     ========================================================= */
  function viewSleep(now){
    const hour = now.getHours();
    const wake = new Date(now);
    if(hour >= 22){ wake.setDate(wake.getDate()+1); }
    wake.setHours(6,0,0,0);
    const diffMs = wake - now;
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);

    el.card.innerHTML = `
      <div class="center-block state-fade">
        <div class="big-icon">${ICON_MOON}</div>
        <p class="center-title">Questie is asleep</p>
        <p class="center-sub">Quests run from 06:00 to 22:00. No sidequests during quiet hours — get some rest.</p>
        <span class="mono-note">new quest in ${h}h ${pad2(m)}m</span>
      </div>
    `;
  }

  function viewCompleted(){
    el.card.innerHTML = `
      <div class="center-block state-fade">
        <div class="big-icon moss">${ICON_CHECK}</div>
        <p class="center-title">Quest complete</p>
        <p class="center-sub">Nicely done. Come back tomorrow, from 06:00, for a new sidequest.</p>
      </div>
    `;
  }

  function viewActive(now, questDay){
    const hour = now.getHours();
    const quest = getQuestForDay(questDay);
    const xpNow = xpForHour(hour);

    const state = computeStreakState(questDay);
    const multiplier = streakMultiplier(state.projectedStreak);
    const effXpNow = Math.round(xpNow * multiplier);
    const multiplierTxt = multiplier > 1 ? ` <span class="streak-mult">(x${formatMultiplier(multiplier)} streak)</span>` : "";

    let noteHTML;
    if(hour === 21){
      const closeAt = new Date(now); closeAt.setHours(22,0,0,0);
      const mins = Math.max(0, Math.ceil((closeAt - now)/60000));
      noteHTML = `worth <strong>${effXpNow} xp</strong>${multiplierTxt} right now · window closes in ${mins}m`;
    } else {
      const nextHour = hour+1;
      const nextXp = xpForHour(nextHour);
      const effNextXp = Math.round(nextXp * multiplier);
      const nextBoundary = new Date(now); nextBoundary.setHours(nextHour,0,0,0);
      const mins = Math.max(0, Math.ceil((nextBoundary - now)/60000));
      noteHTML = `worth <strong>${effXpNow} xp</strong>${multiplierTxt} right now · drops to ${effNextXp} xp at ${pad2(nextHour)}:00 (${mins}m)`;
    }

    el.card.innerHTML = `
      <div class="state-fade" style="display:flex; flex-direction:column; gap:14px;">
        <div class="quest-eyebrow-icon">${ICON_SCROLL}</div>
        <p class="quest-title">${quest}</p>
        <div class="quest-meta">${noteHTML}</div>
        <button class="btn" id="completeBtn">${ICON_BTN_CHECK} Mark as complete</button>
      </div>
    `;

    document.getElementById("completeBtn").addEventListener("click", onComplete);
  }

  function viewJustCompleted(xpEarned, leveledUp, newLevel, multiplier){
    const bonusNote = multiplier > 1 ? ` · x${formatMultiplier(multiplier)} streak bonus` : "";
    el.card.innerHTML = `
      <div class="center-block state-fade">
        <div class="big-icon moss">${ICON_CHECK}</div>
        <p class="center-title">+${xpEarned} xp earned${bonusNote}</p>
        <p class="center-sub">Quest complete. Come back tomorrow, from 06:00, for a new sidequest.</p>
        ${leveledUp ? `<div class="levelup-banner">level up — you're now level ${newLevel}</div>` : ``}
      </div>
    `;
  }

  /* ---------- top stat rendering ---------- */
  function renderStats(questDay){
    const lvl = levelInfo(cachedStats.totalXP);

    const { effectiveStreak } = computeStreakState(questDay);
    if(effectiveStreak === 0 && cachedStats.streak !== 0){
      cachedStats.streak = 0;
      saveUserStats();
    }

    el.level.textContent = lvl.level;
    el.streak.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2 1 4-1 5-2 5 1-2-1-3-1-5-1 2-3 3-3 6a5 5 0 0 0 10 0c0-5-4-6-6-11-1 2-3 2-3 0Z"/></svg>
      ${effectiveStreak}
    `;
    el.xpText.textContent = `${lvl.into} / ${lvl.needed} xp`;
    el.xpToGo.textContent = `${lvl.needed - lvl.into} to go`;
    el.xpFill.style.width = Math.min(100, Math.round((lvl.into / lvl.needed) * 100)) + "%";
  }

  /* ---------- sleep check (per-account, set from the Admin panel) ---------- */
  function isSleeping(hour){
    if(cachedStats.bypassSleep) return false;
    return hour >= 22 || hour < 6;
  }

  /* ---------- complete handler ---------- */
  async function onComplete(){
    const now = new Date();
    const hour = now.getHours();
    if(isSleeping(hour)) return;

    const questDay = getQuestDay(now);
    const state = computeStreakState(questDay);
    if(state.alreadyCompletedToday && !cachedStats.unlimitedQuests) return;

    const multiplier = streakMultiplier(state.projectedStreak);
    const xp = Math.round(xpForHour(hour) * multiplier);

    if(!state.alreadyCompletedToday){
      cachedStats.streak = state.projectedStreak;
    }

    const beforeLevel = levelInfo(cachedStats.totalXP).level;
    cachedStats.totalXP += xp;
    cachedStats.lastCompletedQuestDay = questDay;

    const afterLevel = levelInfo(cachedStats.totalXP).level;

    renderStats(questDay);
    viewJustCompleted(xp, afterLevel > beforeLevel, afterLevel, multiplier);

    await saveUserStats();
  }

  /* ---------- main tick ---------- */
  function tick(){
    if(!currentUser) return;
    const now = new Date();
    el.clock.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    const hour = now.getHours();
    const questDay = getQuestDay(now);

    renderStats(questDay);

    if(isSleeping(hour)){
      viewSleep(now);
    } else if(cachedStats.lastCompletedQuestDay === questDay && !cachedStats.unlimitedQuests){
      viewCompleted();
    } else {
      viewActive(now, questDay);
    }
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
      el.settingsUsernameError.textContent = (err.code === "23505")
        ? "That username is already taken. Try another."
        : "Couldn't save that username. Try another.";
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
          <span class="leaderboard-name">@${row.username}${badges}</span>
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
    el.adminView.classList.add("hidden");
    el.appView.classList.remove("hidden");
    tick();
  });

  async function openAdminPanel(){
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
            <span class="leaderboard-name">${name}${ownerBadge}${invisibleTag}</span>
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

    // keep our own header badge / test flags in sync if we just toggled ourselves
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
