/**
 * Focus Widget — in-page Pomodoro timer with distraction detection.
 * Communicates with focus-server.js on localhost:3210.
 */
const FocusWidget = (() => {
  const SERVER = 'http://127.0.0.1:3210';
  let widget = null;
  let timerInterval = null;
  let sessionData = null;
  let distractionStart = null;
  let totalDistractedSec = 0;
  let distractionCount = 0;

  function init() {
    // Create widget DOM
    widget = document.createElement('div');
    widget.className = 'focus-widget';
    widget.innerHTML = `
      <div class="fw-header">
        <span class="fw-badge">P0</span>
        <span class="fw-stats-mini" style="font-size:0.6rem;color:var(--text-quaternary)"></span>
      </div>
      <div class="fw-task"></div>
      <div class="fw-distraction-alert">⚠️ 你离开了 <span class="fw-away-time">0s</span></div>
      <div class="fw-timer">25:00</div>
      <div class="fw-progress"><div class="fw-progress-fill" style="width:0%"></div></div>
      <div class="fw-stats">
        <span class="fw-elapsed">0m elapsed</span>
        <span class="fw-distractions">0 distractions</span>
      </div>
      <div class="fw-buttons">
        <button class="fw-btn stop" onclick="FocusWidget.stop()">Stop 停止</button>
      </div>
      <a class="fw-report-link" style="display:none" href="#" target="_blank">📊 View Report 查看报告</a>
    `;
    document.body.appendChild(widget);

    // Page Visibility API
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Check if there's already an active session on load
    checkExisting();
  }

  async function checkExisting() {
    try {
      const res = await fetch(`${SERVER}/status`);
      const data = await res.json();
      if (data.active) {
        sessionData = data;
        widget.classList.add('active');
        updateBadge(data.priority);
        widget.querySelector('.fw-task').textContent = data.task;
        distractionCount = data.distractions || 0;
        startTimerDisplay(data.remaining);
      }
    } catch {
      // Server not running — silent
    }
  }

  async function start(task, project, priority, duration) {
    try {
      const res = await fetch(`${SERVER}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, project, priority, duration })
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.session) {
          // Already active — show existing
          sessionData = err.session;
          widget.classList.add('active');
          widget.querySelector('.fw-task').textContent = err.session.task;
          return;
        }
        console.error('Focus start failed:', err);
        return;
      }
      const data = await res.json();
      sessionData = data;
      distractionCount = 0;
      totalDistractedSec = 0;

      widget.classList.remove('completed', 'distracted');
      widget.classList.add('active');
      widget.querySelector('.fw-task').textContent = task;
      widget.querySelector('.fw-report-link').style.display = 'none';
      widget.querySelector('.fw-buttons').style.display = 'flex';
      updateBadge(priority);
      startTimerDisplay(data.duration * 60 * 1000);

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (e) {
      console.error('Focus server unreachable:', e);
      alert('Focus server not running.\nRun: node ~/observatory/focus-server.js');
    }
  }

  function updateBadge(priority) {
    const badge = widget.querySelector('.fw-badge');
    badge.textContent = priority || 'P0';
    badge.className = 'fw-badge';
    if (priority === 'P1') badge.classList.add('p1');
    else if (priority === 'P2') badge.classList.add('p2');
  }

  function startTimerDisplay(remainingMs) {
    const endAt = Date.now() + remainingMs;
    const totalMs = remainingMs;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const left = Math.max(0, endAt - Date.now());
      const min = Math.floor(left / 60000);
      const sec = Math.floor((left % 60000) / 1000);
      widget.querySelector('.fw-timer').textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

      const pct = totalMs > 0 ? ((totalMs - left) / totalMs) * 100 : 100;
      widget.querySelector('.fw-progress-fill').style.width = `${pct}%`;

      const elapsedMin = Math.round((totalMs - left) / 60000);
      widget.querySelector('.fw-elapsed').textContent = `${elapsedMin}m elapsed`;
      widget.querySelector('.fw-distractions').textContent = `${distractionCount} distraction${distractionCount !== 1 ? 's' : ''}`;

      if (left <= 0) {
        clearInterval(timerInterval);
        onComplete();
      }
    }, 1000);
  }

  function onVisibilityChange() {
    if (!sessionData || widget.classList.contains('completed')) return;

    if (document.hidden) {
      // User left
      distractionStart = Date.now();
    } else if (distractionStart) {
      // User returned
      const awaySec = Math.round((Date.now() - distractionStart) / 1000);
      const threshold = 30; // seconds
      if (awaySec >= threshold) {
        distractionCount++;
        totalDistractedSec += awaySec;
        widget.classList.remove('distracted');

        // Report to server
        fetch(`${SERVER}/distraction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: awaySec })
        }).catch(() => {});
      }
      distractionStart = null;
    }
  }

  // Show distraction warning while user is away (checked by interval)
  setInterval(() => {
    if (!sessionData || !distractionStart || widget.classList.contains('completed')) return;
    const awaySec = Math.round((Date.now() - distractionStart) / 1000);
    if (awaySec >= 30) {
      widget.classList.add('distracted');
      const alertEl = widget.querySelector('.fw-away-time');
      if (awaySec >= 60) {
        alertEl.textContent = `${Math.floor(awaySec/60)}m${awaySec%60}s`;
      } else {
        alertEl.textContent = `${awaySec}s`;
      }
    }
  }, 5000);

  async function onComplete() {
    widget.classList.remove('distracted');
    widget.classList.add('completed');
    widget.querySelector('.fw-timer').textContent = '✅ 完成！';
    widget.querySelector('.fw-buttons').style.display = 'none';

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🍅 Focus Complete', {
        body: sessionData.task || 'Session finished!',
        silent: false
      });
    }

    try {
      const res = await fetch(`${SERVER}/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.reportPath) {
        const link = widget.querySelector('.fw-report-link');
        link.href = data.reportPath;
        link.style.display = 'block';
      }
    } catch {}

    sessionData = null;
    // Auto-hide after 30s
    setTimeout(() => { widget.classList.remove('active', 'completed'); }, 30000);
  }

  async function stop() {
    clearInterval(timerInterval);
    widget.classList.remove('distracted');
    widget.classList.add('completed');
    widget.querySelector('.fw-timer').textContent = '⏹ 已停止';
    widget.querySelector('.fw-buttons').style.display = 'none';

    try {
      const res = await fetch(`${SERVER}/stop`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.reportPath) {
        const link = widget.querySelector('.fw-report-link');
        link.href = data.reportPath;
        link.style.display = 'block';
      }
    } catch {}

    sessionData = null;
    setTimeout(() => { widget.classList.remove('active', 'completed'); }, 15000);
  }

  // Expose
  return { init, start, stop, checkExisting };
})();

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FocusWidget.init);
} else {
  FocusWidget.init();
}
