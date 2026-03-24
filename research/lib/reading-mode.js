(function() {
  var KEY = 'obs-reading-mode';
  var btn = document.createElement('button');
  btn.id = 'readingModeBtn';
  btn.title = 'Toggle Reading Mode (Esc to exit)';
  btn.textContent = '\u{1F4D6}';
  btn.setAttribute('aria-label', 'Toggle reading mode');
  document.body.appendChild(btn);

  // Restore saved state
  if (localStorage.getItem(KEY) === '1') {
    document.body.classList.add('reading-mode');
    btn.textContent = '\u2B05';
  }

  btn.addEventListener('click', function() {
    document.body.classList.toggle('reading-mode');
    var active = document.body.classList.contains('reading-mode');
    localStorage.setItem(KEY, active ? '1' : '0');
    btn.textContent = active ? '\u2B05' : '\u{1F4D6}';
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.body.classList.contains('reading-mode')) {
      document.body.classList.remove('reading-mode');
      localStorage.setItem(KEY, '0');
      btn.textContent = '\u{1F4D6}';
    }
  });
})();
