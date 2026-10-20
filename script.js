(() => {
  const apps = [
    { id:'instagram', name:'Instagram', type:'Social media', icon:'◎', color:'#42272e', ink:'#ff9eb5', selected:true },
    { id:'youtube', name:'YouTube', type:'Video & entertainment', icon:'▶', color:'#442724', ink:'#ff9a8c', selected:true },
    { id:'games', name:'Games', type:'Games & entertainment', icon:'⌘', color:'#282947', ink:'#b7b5ff', selected:true },
    { id:'browser', name:'Browser', type:'Web browsing', icon:'◉', color:'#203642', ink:'#9ddcff', selected:false },
    { id:'tiktok', name:'TikTok', type:'Short videos', icon:'♪', color:'#2d293d', ink:'#d7baff', selected:false },
    { id:'reddit', name:'Reddit', type:'Forums & feeds', icon:'●', color:'#443123', ink:'#ffbd8b', selected:false }
  ];
  const $ = id => document.getElementById(id);
  let duration = 25 * 60;
  let remaining = duration;
  let active = false;
  let strict = true;
  let interval = null;
  let startedAt = null;
  let focusSecondsToday = 0;
  let completed = 0;
  let totalSeconds = 0;
  let streak = 0;
  let history = [];
  let daily = [0, 0, 0, 0, 0, 0, 0];
  let toastTimer;
  const nowLabel = () => new Date().toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }).toUpperCase();
  $('todayDate').textContent = nowLabel();
  function showToast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2500);
  }
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  function prettyMinutes(seconds) {
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    return h ? `${h}h ${m % 60}m` : `${m}m`;
  }
  function renderApps() {
    $('appList').innerHTML = apps.map(app => `
      <div class="app-item" role="checkbox" tabindex="0" aria-checked="${app.selected}" data-app="${app.id}">
        <div class="app-icon" style="background:${app.color};color:${app.ink}">${app.icon}</div>
        <div class="app-name"><strong>${app.name}</strong><small>${app.type}</small></div>
        <div class="check ${app.selected ? 'on' : ''}">${app.selected ? '✓' : ''}</div>
      </div>`).join('');
    $('selectedCount').textContent = `${apps.filter(a => a.selected).length} SELECTED`;
    document.querySelectorAll('.app-item').forEach(el => {
      const toggle = () => {
        if (active) { showToast('End the session before changing blocked apps.'); return; }
        const app = apps.find(a => a.id === el.dataset.app);
        app.selected = !app.selected;
        renderApps();
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }
  function renderWeek() {
    const labels = ['M','T','W','T','F','S','S'];
    const max = Math.max(60, ...daily);
    $('weekBars').innerHTML = daily.map((sec, i) => `<div class="day"><div class="bar-track"><div class="bar-fill ${i === 6 ? 'today' : ''}" style="height:${Math.max(sec ? 7 : 4, sec / max * 70)}px"></div></div><label>${labels[i]}</label></div>`).join('');
    $('weekTotal').textContent = prettyMinutes(daily.reduce((a,b) => a+b,0));
    $('weekAverage').textContent = `${Math.round(daily.reduce((a,b)=>a+b,0) / 7 / 60)} min`;
    const goal = daily.reduce((a,b)=>a+b,0) / (5*3600) * 100;
    $('weekGoal').textContent = `${Math.min(100, Math.round(goal))}%`;
    $('goalProgress').style.width = `${Math.min(100, goal)}%`;
    $('goalText').textContent = prettyMinutes(daily.reduce((a,b)=>a+b,0));
  }
  function renderHistory() {
    if (!history.length) {
      $('historyList').innerHTML = `<div class="history-row"><div class="history-mark">◷</div><div class="history-info"><strong>No sessions yet</strong><small>Your first session starts here</small></div><div class="history-time">—</div></div>`;
      return;
    }
    $('historyList').innerHTML = history.slice(0,3).map(item => `<div class="history-row"><div class="history-mark">✓</div><div class="history-info"><strong>${item.label}</strong><small>${item.when}</small></div><div class="history-time">${item.time}</div></div>`).join('');
  }
  function renderStats() {
    $('todayStat').textContent = prettyMinutes(focusSecondsToday);
    $('sessionsStat').textContent = completed;
    $('streakStat').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
    $('todayFoot').textContent = focusSecondsToday ? 'Nice work — keep it going' : 'Start your first session';
    $('streakFoot').textContent = streak ? 'Consistency is building' : 'Start a streak today';
    renderWeek(); renderHistory();
  }
  function renderTimer() {
    $('timerText').textContent = formatTime(remaining);
    $('timerRing').style.setProperty('--timer-progress', `${(1 - remaining / duration) * 100}%`);
    $('timerLabel').textContent = active ? 'STAY IN YOUR ZONE' : 'MINUTES OF FOCUS';
    $('timerLock').textContent = active ? '🔒' : '♧';
    $('startBtn').textContent = active ? 'Ⅱ   Pause session' : '↗   Start focus session';
    $('sessionTag').textContent = active ? (strict ? 'STRICT MODE ON' : 'SESSION IN PROGRESS') : 'READY WHEN YOU ARE';
    $('statusText').textContent = active ? 'Focus session active' : 'Ready to focus';
    $('strictDescription').textContent = strict ? 'Stay on track during your session' : 'Strict Mode is switched off';
    $('strictSwitch').classList.toggle('off', !strict);
    $('strictSwitch').setAttribute('aria-pressed', String(strict));
    document.querySelectorAll('.duration').forEach(btn => {
      btn.classList.toggle('selected', Number(btn.dataset.minutes) * 60 === duration);
      btn.disabled = active;
      btn.style.opacity = active ? '.55' : '1';
      btn.style.cursor = active ? 'not-allowed' : 'pointer';
    });
    $('appList').style.opacity = active ? '.75' : '1';
  }
  function finishSession(completedNormally) {
    if (!active) return;
    clearInterval(interval); interval = null;
    const elapsed = Math.max(0, duration - remaining);
    active = false;
    if (completedNormally) {
      completed++;
      streak++;
      const minutes = Math.round(duration / 60);
      history.unshift({ label: `${minutes}-minute focus`, when: 'Just now · Strict Mode', time: prettyMinutes(elapsed) });
      showToast('Session complete. Great work! 🎉');
    } else {
      if (elapsed >= 60) history.unshift({ label: 'Focus session', when: 'Ended early', time: prettyMinutes(elapsed) });
      showToast('Session ended. Your progress has been recorded.');
    }
    renderStats(); renderTimer();
  }
  $('durationRow').addEventListener('click', e => {
    const btn = e.target.closest('[data-minutes]');
    if (!btn || active) return;
    duration = Number(btn.dataset.minutes) * 60;
    remaining = duration;
    renderTimer();
  });
  $('strictSwitch').addEventListener('click', () => {
    if (active) { showToast('Strict Mode stays fixed during a session.'); return; }
    strict = !strict;
    renderTimer();
    showToast(strict ? 'Strict Mode enabled.' : 'Strict Mode disabled.');
  });
  $('startBtn').addEventListener('click', () => {
    if (active) {
      active = false;
      clearInterval(interval); interval = null;
      renderTimer();
      showToast('Session paused. Press start to resume.');
      return;
    }
    if (remaining < duration && remaining > 0) {
      active = true;
    } else {
      if (!apps.some(a => a.selected)) { showToast('Choose at least one app to block first.'); return; }
      remaining = duration;
      active = true;
      startedAt = Date.now();
    }
    renderTimer();
    clearInterval(interval);
    interval = setInterval(() => {
      if (!active) return;
      remaining--;
      focusSecondsToday++;
      totalSeconds++;
      daily[6]++;
      if (remaining <= 0) {
        remaining = 0;
        renderTimer();
        finishSession(true);
      } else {
        renderTimer();
        if (focusSecondsToday % 5 === 0) renderStats();
      }
    }, 1000);
    showToast(strict ? 'Strict Mode is on. Stay focused.' : 'Focus session started.');
  });
  $('backToFocus').addEventListener('click', () => $('blockedModal').classList.remove('show'));
  $('endFromModal').addEventListener('click', () => { $('blockedModal').classList.remove('show'); finishSession(false); });
  document.querySelectorAll('.nav button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b === btn));
    const view = btn.dataset.view;
    if (view === 'apps') {
      $('pageTitle').textContent = 'Choose your distractions.';
      $('pageSub').textContent = 'Pick the apps you want to leave behind during focus time.';
      $('appsPanel').scrollIntoView({behavior:'smooth', block:'center'});
    } else if (view === 'stats') {
      $('pageTitle').textContent = 'Progress, not perfection.';
      $('pageSub').textContent = 'Every focused minute is a win. Keep building your habit.';
      $('bottomGrid').scrollIntoView({behavior:'smooth', block:'center'});
    } else {
      $('pageTitle').textContent = 'Make time for what matters.';
      $('pageSub').textContent = 'One session at a time. Your attention is yours to protect.';
      window.scrollTo({top:0, behavior:'smooth'});
    }
  }));
  // Demo-only shortcut: simulate trying to open a selected app while focus is active.
  $('appList').addEventListener('dblclick', e => {
    const el = e.target.closest('[data-app]');
    if (!active || !el) return;
    const app = apps.find(a => a.id === el.dataset.app);
    if (app && app.selected) {
      $('blockedMessage').textContent = `${app.name} is on your block list. Keep going — your future self will thank you.`;
      $('blockedModal').classList.add('show');
    }
  });
  renderApps(); renderTimer(); renderStats();
})();
