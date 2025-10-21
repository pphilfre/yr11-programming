(() => {
  // Query elements
  const featured = document.querySelector('.featured-show');
  const controls = featured?.querySelector('.controls');
  const modalOverlay = document.getElementById('modal-featured');
  const closeBtn = modalOverlay?.querySelector('.modal-close');
  const closeActionBtn = modalOverlay?.querySelector('[data-close]');
  const titleEl = modalOverlay?.querySelector('#featured-modal-title');
  const artistEl = modalOverlay?.querySelector('#featured-modal-artist');
  const playLink = modalOverlay?.querySelector('#featured-modal-play');
  const playBtn = controls?.querySelector('.play-toggle');
  const playIcon = playBtn?.querySelector('.icon');
  const loopToggle = controls?.querySelector('.loop-toggle');
  const seekBar = featured?.querySelector('.seek-bar');
  const timeline = featured?.querySelector('.timeline');
  const currentTimeEl = featured?.querySelector('.current-time');
  const durationEl = featured?.querySelector('.duration');
  const audioEl = document.getElementById('featured-audio');
  const audioSrc = featured?.getAttribute('data-audio');

  if (!featured) return;

  // Audio setup
  if (audioEl) {
    if (!audioEl.src && audioSrc) {
      audioEl.src = audioSrc;
      audioEl.load();
    }
    audioEl.loop = true;
    loopToggle?.setAttribute('aria-pressed', 'true');
    if (seekBar) {
      seekBar.value = '0';
      seekBar.disabled = true;
    }
    updateCurrentTimeDisplay(0);

    audioEl.addEventListener('loadedmetadata', () => {
      if (durationEl) durationEl.textContent = formatTime(audioEl.duration);
      if (seekBar) {
        seekBar.disabled = false;
        seekBar.value = '0';
      }
      updateCurrentTimeDisplay(0);
    });

    audioEl.addEventListener('timeupdate', () => {
      if (!seekBar || !Number.isFinite(audioEl.duration) || audioEl.duration === 0) return;
      const percent = (audioEl.currentTime / audioEl.duration) * 100;
      seekBar.value = String(percent);
      updateCurrentTimeDisplay(audioEl.currentTime);
    });

    audioEl.addEventListener('play', () => setPlayingState(true));
    audioEl.addEventListener('pause', () => setPlayingState(false));
    audioEl.addEventListener('ended', () => {
      if (!audioEl.loop) setPlayingState(false);
    });

    seekBar?.addEventListener('input', () => {
      if (!Number.isFinite(audioEl.duration) || audioEl.duration === 0) return;
      const percent = Number(seekBar.value);
      audioEl.currentTime = (percent / 100) * audioEl.duration;
      updateCurrentTimeDisplay(audioEl.currentTime);
    });

    const stopModalPropagation = (event) => event.stopPropagation();
    ['mousedown', 'touchstart', 'pointerdown', 'click'].forEach((evt) => {
      seekBar?.addEventListener(evt, stopModalPropagation);
      timeline?.addEventListener(evt, stopModalPropagation);
    });

    loopToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      const pressed = loopToggle.getAttribute('aria-pressed') === 'true';
      const next = !pressed;
      loopToggle.setAttribute('aria-pressed', String(next));
      if (next) {
        audioEl.loop = true;
        audioEl.setAttribute('loop', '');
      } else {
        audioEl.loop = false;
        audioEl.removeAttribute('loop');
      }
    });
  }

  playBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audioEl) {
      if (audioEl.paused) {
        audioEl.play().catch(() => setPlayingState(false));
      } else {
        audioEl.pause();
      }
    }
    openModal();
  });

  // Open modal only when clicking the featured background, not the controls
  featured.addEventListener('click', (e) => {
    const target = e.target;
    if (!controls) return;
    if (controls.contains(target)) return; // ignore clicks on playback controls
    openModal();
  });

  // Also stop propagation from buttons explicitly to be safe
  controls?.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', (e) => e.stopPropagation());
  });

  function openModal() {
    if (!modalOverlay) return;
    // hydrate info from data attributes
    const artist = featured.getAttribute('data-artist') || 'Unknown Artist';
    const spotify = featured.getAttribute('data-spotify') || 'https://open.spotify.com';
    const title = featured.querySelector('h2')?.textContent?.trim() || 'Featured';

    if (titleEl) titleEl.textContent = title;
    if (artistEl) artistEl.textContent = `Artist: ${artist}`;
    if (playLink) playLink.setAttribute('href', spotify);

    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // focus trap start
    const focusable = modalOverlay.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    modalOverlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return closeModal();
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // initial focus
    (closeBtn || first)?.focus();
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  closeBtn?.addEventListener('click', closeModal);
  closeActionBtn?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal(); // click outside to close
  });

  function setPlayingState(isPlaying) {
    if (!playBtn || !playIcon) return;
    playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    playIcon.classList.toggle('icon-play', !isPlaying);
    playIcon.classList.toggle('icon-pause', isPlaying);
  }

  function updateCurrentTimeDisplay(timeSeconds) {
    if (!currentTimeEl) return;
    const seconds = Number.isFinite(timeSeconds) ? timeSeconds : 0;
    currentTimeEl.textContent = formatTime(seconds);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  }
})();

// Settings gear progressive acceleration
(() => {
  const gear = document.querySelector('.settings-btn .icon-settings');
  if (!gear) return;
  let hoverStart = 0;
  let frameId = null;
  const minSpeed = 1.2; // seconds per rotation at start
  const maxSpeed = 0.18; // fastest speed
  const accelDuration = 2500; // ms to reach max speed

  function easeOutQuad(t) { return t * (2 - t); }

  function update() {
    const elapsed = performance.now() - hoverStart;
    const clamped = Math.min(elapsed / accelDuration, 1);
    const eased = easeOutQuad(clamped);
    const current = minSpeed - (minSpeed - maxSpeed) * eased; // interpolate
    gear.style.setProperty('--gear-speed', current.toFixed(3) + 's');
    frameId = requestAnimationFrame(update);
  }

  function start() {
    hoverStart = performance.now();
    gear.classList.add('spin');
    if (frameId) cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(update);
  }

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = null;
    gear.classList.remove('spin');
    gear.style.removeProperty('--gear-speed');
  }

  const btn = document.querySelector('.settings-btn');
  btn?.addEventListener('mouseenter', start);
  btn?.addEventListener('focus', start);
  btn?.addEventListener('mouseleave', stop);
  btn?.addEventListener('blur', stop);
})();

// Team modal logic (separate scope)
(() => {
  const teamCards = document.querySelectorAll('.about-page .team-card');
  const modal = document.getElementById('team-modal');
  if (!teamCards.length || !modal) return;

  const closeBtn = modal.querySelector('.modal-close');
  const closeAction = modal.querySelector('[data-close-team]');
  const nameEl = modal.querySelector('#team-modal-name');
  const roleEl = modal.querySelector('#team-modal-role');
  const descEl = modal.querySelector('#team-modal-desc');
  const photoEl = modal.querySelector('#team-modal-photo');

  let lastFocused = null;

  function open(card) {
    lastFocused = document.activeElement;
    nameEl.textContent = card.dataset.name || '';
    roleEl.textContent = card.dataset.role || '';
    descEl.textContent = card.dataset.description || '';
    photoEl.src = card.dataset.photo || '';
    photoEl.alt = card.dataset.name || '';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocus();
  }

  function close() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function trapFocus() {
    const focusable = modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return close();
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }, { once: true });
  }

  teamCards.forEach(card => {
    card.addEventListener('click', () => open(card));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); } });
    const btn = card.querySelector('.team-more');
    btn?.addEventListener('click', (e) => { e.stopPropagation(); open(card); });
  });

  closeBtn?.addEventListener('click', close);
  closeAction?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
})();

// Schedule event modal logic
(() => {
  const modal = document.getElementById('schedule-event-modal');
  if (!modal) return; // only on schedule page

  const closeBtn = modal.querySelector('.modal-close');
  const closeAction = modal.querySelector('[data-close-event]');
  const titleEl = modal.querySelector('#event-modal-title');
  const performerEl = modal.querySelector('#event-modal-performer');
  const datetimeEl = modal.querySelector('#event-modal-datetime');
  const descEl = modal.querySelector('#event-modal-description');
  const imgEl = modal.querySelector('#event-modal-image');
  const badge = modal.querySelector('.modal-badge');

  let lastFocused = null;

  function formatDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); } catch { return iso; }
  }

  function open(ev) {
    lastFocused = document.activeElement;
    titleEl.textContent = ev.dataset.title || 'Show';
    performerEl.textContent = ev.dataset.performer ? `Hosted by ${ev.dataset.performer}` : '';
    datetimeEl.textContent = `${formatDate(ev.dataset.date)} • ${ev.dataset.time || ''}`.trim();
    descEl.textContent = ev.dataset.description || '';
    imgEl.src = ev.dataset.image || '';
    imgEl.alt = ev.dataset.title || '';
    modal.querySelector('.event-modal').setAttribute('data-color', ev.dataset.color || '');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocus();
  }

  function close() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function trapFocus() {
    const focusable = modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    modal.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(); modal.removeEventListener('keydown', handler); }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  document.querySelectorAll('.calendar .event').forEach(link => {
    link.addEventListener('click', (e) => { e.preventDefault(); open(link); });
    link.setAttribute('role', 'button');
    link.setAttribute('tabindex', '0');
    link.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(link); } });
  });

  [closeBtn, closeAction].forEach(btn => btn?.addEventListener('click', close));
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
})();

// Playlist search filtering
(() => {
  if (!document.body.classList.contains('playlists-page')) return;
  const input = document.querySelector('.playlist-search-input');
  const tiles = Array.from(document.querySelectorAll('.playlist-grid .playlist-tile'));
  const status = document.querySelector('.playlist-status');
  const emptyMsg = document.querySelector('.playlist-empty');
  if (!input || !tiles.length) return;

  function filter() {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    tiles.forEach(tile => {
      const name = tile.dataset.name.toLowerCase();
      const show = !q || name.includes(q);
      tile.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (status) status.textContent = q ? `${visible} result${visible===1?'':'s'} for "${q}"` : '';
    if (emptyMsg) emptyMsg.hidden = visible !== 0;
  }

  input.addEventListener('input', filter);
})();

// Playlist modal logic
(() => {
  if (!document.body.classList.contains('playlists-page')) return;
  const modalOverlay = document.getElementById('playlist-modal');
  if (!modalOverlay) return;
  const modal = modalOverlay.querySelector('.playlist-modal');
  const closeBtn = modalOverlay.querySelector('.modal-close');
  const closeAction = modalOverlay.querySelector('[data-close-playlist]');
  const titleEl = modalOverlay.querySelector('#playlist-modal-title');
  const durationEl = modalOverlay.querySelector('#playlist-modal-duration');
  const artEl = modalOverlay.querySelector('#playlist-modal-art');
  const tracksEl = modalOverlay.querySelector('#playlist-modal-tracks');
  const playBtn = modalOverlay.querySelector('#playlist-play-btn');
  let lastFocused = null;

  function parseTracks(str) {
    return str.split(';').map(p => p.trim()).filter(Boolean).map(pair => {
      const [title, time] = pair.split('|');
      return { title: (title||'').trim(), time: (time||'').trim() };
    });
  }

  function open(tile) {
    lastFocused = document.activeElement;
    const name = tile.dataset.name || 'Playlist';
    const duration = tile.dataset.duration || '';
    const art = tile.dataset.art || '';
    const tracksRaw = tile.dataset.tracks || '';
    const tracks = parseTracks(tracksRaw);
    titleEl.textContent = name;
    durationEl.textContent = duration ? `${duration} • ${tracks.length} track${tracks.length===1?'':'s'}` : `${tracks.length} tracks`;
    artEl.src = art;
    artEl.alt = name;
    tracksEl.innerHTML = '';
    tracks.forEach((t,i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="track-title">${i+1}. ${t.title}</span><span class="track-time">${t.time}</span><button class="track-fav" type="button" aria-pressed="false" aria-label="Favourite ${t.title}"><span class="icon icon-heart" aria-hidden="true"></span></button>`;
      tracksEl.appendChild(li);
    });
    modalOverlay.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    focusTrap();
  }

  function close() {
    modalOverlay.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function focusTrap() {
    const f = modalOverlay.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length-1];
    first.focus();
    modalOverlay.addEventListener('keydown', function handler(e){
      if (e.key === 'Escape') { close(); modalOverlay.removeEventListener('keydown', handler); }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });
  }

  document.querySelectorAll('.playlist-grid .playlist-tile').forEach(tile => {
    tile.addEventListener('click', e => { e.preventDefault(); open(tile); });
    tile.addEventListener('keydown', e => { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); open(tile); } });
    tile.setAttribute('tabindex','0');
    tile.setAttribute('role','button');
    tile.setAttribute('aria-haspopup','dialog');
  });

  tracksEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button.track-fav');
    if (!btn) return;
    const pressed = btn.getAttribute('aria-pressed') === 'true';
    btn.setAttribute('aria-pressed', String(!pressed));
  });

  playBtn?.addEventListener('click', () => {
    playBtn.classList.add('pulse');
    setTimeout(()=> playBtn.classList.remove('pulse'), 600);
  });

  ;[closeBtn, closeAction].forEach(btn => btn?.addEventListener('click', close));
  modalOverlay.addEventListener('click', e => { if(e.target === modalOverlay) close(); });
})();

// Global search functionality for new search page
(() => {
  if (!document.body.classList.contains('search-page')) return;
  const input = document.querySelector('.global-search-input');
  const filterChips = Array.from(document.querySelectorAll('.search-filters .chip'));
  const groups = Array.from(document.querySelectorAll('.search-group'));
  const status = document.querySelector('.search-status');
  const empty = document.querySelector('.search-empty');

  let activeFilter = 'all';

  function apply() {
    const q = (input?.value || '').trim().toLowerCase();
    let visibleCount = 0;

    groups.forEach(group => {
      const type = group.getAttribute('data-group');
      const isGroupActive = activeFilter === 'all' || activeFilter === type;
      let groupVisible = 0;

      group.querySelectorAll('.result-card').forEach(card => {
        const name = card.getAttribute('data-name')?.toLowerCase() || '';
        const cType = card.getAttribute('data-type');
        const matchesText = !q || name.includes(q);
        const matchesType = activeFilter === 'all' || activeFilter === cType || (activeFilter === 'podcasts' && cType === 'podcast');
        const show = matchesText && matchesType && isGroupActive;
        card.style.display = show ? '' : 'none';
        if (show) { visibleCount++; groupVisible++; }
      });

      group.style.display = groupVisible ? '' : 'none';
    });

    if (status) {
      const scopeLabel = activeFilter === 'all' ? 'all categories' : activeFilter;
      status.textContent = q ? `${visibleCount} result${visibleCount===1?'':'s'} for "${q}" in ${scopeLabel}` : '';
    }
    if (empty) empty.hidden = visibleCount !== 0;
  }

  input?.addEventListener('input', apply);

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.dataset.filter === activeFilter) return;
      activeFilter = chip.dataset.filter;
      filterChips.forEach(c => {
        c.classList.toggle('active', c === chip);
        c.setAttribute('aria-checked', c===chip ? 'true' : 'false');
      });
      apply();
    });
  });

  apply();
})();

// Settings modal overlay logic shared across podcast pages
(() => {
  const triggers = Array.from(document.querySelectorAll('.settings-btn'));
  if (!triggers.length) return;

  let overlay = document.getElementById('settings-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay settings-overlay';
    overlay.id = 'settings-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1">
        <button class="modal-close settings-close" type="button" aria-label="Close settings">✕</button>
        <header class="settings-header">
          <p class="eyebrow settings-eyebrow">Control centre</p>
          <h2 id="settings-title">Settings</h2>
          <p class="settings-subtitle">Tune how YR11 Radio behaves across every podcast page.</p>
        </header>

        <div class="settings-scroll" role="group" aria-label="Settings options">
          <section class="settings-section profile-section" aria-labelledby="settings-profile-title">
            <div class="section-head">
              <h3 id="settings-profile-title">Profile</h3>
              <span class="section-badge">Active</span>
            </div>
            <p class="profile-current">Signed in as <strong>Jordan Rivera</strong></p>
            <p class="profile-role">Student DJ access • Studio booth 2 clearance</p>
            <div class="settings-actions">
              <button class="btn outline profile-view" type="button">View profile</button>
              <button class="btn profile-edit" type="button">Edit badge</button>
            </div>
          </section>

          <section class="settings-section preferences-section" aria-labelledby="settings-preferences-title">
            <h3 id="settings-preferences-title">Preferences</h3>
            <ul class="settings-toggle-list">
              <li class="settings-toggle">
                <div class="toggle-copy">
                  <span class="toggle-label">Autoplay next episode</span>
                  <p>Keep the show rolling when an episode ends.</p>
                </div>
                <button class="toggle-btn is-on" type="button" aria-pressed="true" data-label="Autoplay next episode">
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="toggle-state" aria-hidden="true">On</span>
                </button>
              </li>
              <li class="settings-toggle">
                <div class="toggle-copy">
                  <span class="toggle-label">Ambient studio glow</span>
                  <p>Add subtle lighting animations while listening.</p>
                </div>
                <button class="toggle-btn" type="button" aria-pressed="false" data-label="Ambient studio glow">
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="toggle-state" aria-hidden="true">Off</span>
                </button>
              </li>
              <li class="settings-toggle">
                <div class="toggle-copy">
                  <span class="toggle-label">New episode alerts</span>
                  <p>Send me a ping when favourite shows publish.</p>
                </div>
                <button class="toggle-btn is-on" type="button" aria-pressed="true" data-label="New episode alerts">
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="toggle-state" aria-hidden="true">On</span>
                </button>
              </li>
            </ul>
          </section>

          <section class="settings-section account-section" aria-labelledby="settings-account-title">
            <h3 id="settings-account-title">Account settings</h3>
            <div class="settings-links">
              <button class="settings-link" type="button" data-action="plan">Manage plan</button>
              <button class="settings-link" type="button" data-action="billing">Update billing</button>
              <button class="settings-link" type="button" data-action="devices">Connected devices</button>
            </div>
          </section>

          <section class="settings-section support-section" aria-labelledby="settings-support-title">
            <h3 id="settings-support-title">Support</h3>
            <p>Need a hand? Reach out and the studio managers on duty will answer fast.</p>
            <div class="settings-actions">
              <button class="btn outline support-action" type="button" data-action="chat">Start live support</button>
              <button class="btn support-action" type="button" data-action="guide">Browse help guide</button>
            </div>
          </section>

          <section class="settings-section switch-section" aria-labelledby="settings-switch-title">
            <h3 id="settings-switch-title">Switch profile</h3>
            <p>Jump into a different studio identity for scheduled takeovers.</p>
            <label class="switch-label" for="settings-profile-select">Active profile</label>
            <select id="settings-profile-select" class="profile-select" aria-describedby="settings-live">
              <option value="Jordan Rivera" selected>Jordan Rivera — Student DJ</option>
              <option value="Maya Chen">Maya Chen — Newsroom Anchor</option>
              <option value="Studio Guest">Studio Guest — Visiting Host</option>
            </select>
          </section>

          <div class="settings-footer">
            <button class="btn danger sign-out-btn" type="button">Sign out</button>
            <p class="settings-footnote" id="settings-live" role="status" aria-live="polite">All changes save automatically.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const panel = overlay.querySelector('.settings-modal');
  const closeBtn = overlay.querySelector('.settings-close');
  const toggleButtons = Array.from(overlay.querySelectorAll('.toggle-btn'));
  const profileSelect = overlay.querySelector('#settings-profile-select');
  const profileName = overlay.querySelector('.profile-current strong');
  const statusRegion = overlay.querySelector('#settings-live');
  const supportButtons = Array.from(overlay.querySelectorAll('.support-action'));
  const accountButtons = Array.from(overlay.querySelectorAll('.settings-link'));
  const profileButtons = Array.from(overlay.querySelectorAll('.profile-view, .profile-edit'));
  const signOutBtn = overlay.querySelector('.sign-out-btn');
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  let lastFocused = null;
  let activeTrigger = null;
  let detachKeyHandler = null;

  const announce = (message) => {
    if (statusRegion) statusRegion.textContent = message;
  };

  const setExpanded = (expandedTrigger) => {
    triggers.forEach((btn) => btn.setAttribute('aria-expanded', btn === expandedTrigger ? 'true' : 'false'));
  };

  const closeSettings = () => {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-active');
    detachKeyHandler?.();
    detachKeyHandler = null;
    document.body.style.overflow = '';
    setExpanded(null);
    announce('Settings closed.');
    const focusTarget = activeTrigger || lastFocused;
    if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
    activeTrigger = null;
  };

  const trapFocus = () => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSettings();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(overlay.querySelectorAll(focusableSelector));
      if (panel) focusable.unshift(panel);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    overlay.addEventListener('keydown', handler);
    detachKeyHandler = () => overlay.removeEventListener('keydown', handler);
  };

  const openSettings = (trigger) => {
    if (overlay.getAttribute('aria-hidden') === 'false') return;
    lastFocused = document.activeElement;
    activeTrigger = trigger || null;
    setExpanded(activeTrigger);
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    panel?.focus();
    trapFocus();
    announce('Settings menu opened.');
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings();
  });
  closeBtn?.addEventListener('click', () => closeSettings());

  triggers.forEach((btn) => {
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => openSettings(btn));
  });

  toggleButtons.forEach((btn) => {
    const sync = () => {
      const isOn = btn.getAttribute('aria-pressed') === 'true';
      btn.classList.toggle('is-on', isOn);
      const state = btn.querySelector('.toggle-state');
      if (state) state.textContent = isOn ? 'On' : 'Off';
    };
    sync();
    btn.addEventListener('click', () => {
      const isOn = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!isOn));
      sync();
      const label = btn.dataset.label || 'Setting';
      announce(`${label} ${!isOn ? 'enabled' : 'disabled'}.`);
    });
  });

  profileSelect?.addEventListener('change', () => {
    if (profileName) profileName.textContent = profileSelect.value;
    announce(`Switched to ${profileSelect.value}.`);
  });

  profileButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const message = btn.classList.contains('profile-view')
        ? 'Profile overview opens in a new window. (Demo copy)'
        : 'Badge editor ready for your next update. (Demo copy)';
      announce(message);
    });
  });

  accountButtons.forEach((btn) => {
    const messages = {
      plan: 'Plan management portal opens in a new tab. (Demo copy)',
      billing: 'Billing preferences queued for review. (Demo copy)',
      devices: 'Connected devices synced. (Demo copy)',
    };
    btn.addEventListener('click', () => {
      const action = btn.dataset.action || 'account';
      announce(messages[action] || 'Account action triggered.');
    });
  });

  supportButtons.forEach((btn) => {
    const messages = {
      chat: 'Support ping sent — a producer will reply shortly.',
      guide: 'Help guide opened in a side panel. (Demo copy)',
    };
    btn.addEventListener('click', () => {
      const action = btn.dataset.action || 'support';
      announce(messages[action] || 'Support action triggered.');
    });
  });

  signOutBtn?.addEventListener('click', () => {
    announce('Sign out request queued. (Demo copy — no action)');
  });
})();

// Profile modal overlay logic (user icon)
(() => {
  const triggers = Array.from(document.querySelectorAll('.user-profile-btn'));
  if (!triggers.length) return;

  let overlay = document.getElementById('profile-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay profile-overlay';
    overlay.id = 'profile-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title" tabindex="-1">
        <button class="modal-close profile-close" type="button" aria-label="Close profile">✕</button>
        <header class="profile-header">
          <p class="eyebrow profile-eyebrow">On air identity</p>
          <h2 id="profile-title">Jordan Rivera</h2>
          <p class="profile-subtitle">Student DJ • YR11 Radio Lab • Broadcasting since 2023</p>
        </header>

        <div class="profile-scroll" role="group" aria-label="Profile sections">
          <section class="profile-section identity-section" aria-labelledby="profile-identity-title">
            <div class="identity-card">
              <div class="identity-main">
                <div class="profile-avatar">
                  <img src="public/logo.jpg" alt="Jordan Rivera avatar" />
                  <button class="avatar-action" type="button">Update avatar</button>
                </div>
                <div class="identity-body">
                  <h3 id="profile-identity-title">Studio presence</h3>
                  <p class="identity-tagline">Mixing future beats &amp; midnight study aids for campus listeners.</p>
                  <div class="identity-meta">
                    <label for="profile-presence" class="identity-label">Pronouns</label>
                    <select id="profile-presence" class="identity-select profile-select">
                      <option value="they/them" selected>They/Them</option>
                      <option value="she/her">She/Her</option>
                      <option value="he/him">He/Him</option>
                      <option value="custom">Custom...</option>
                    </select>
                  </div>
                  <div class="identity-actions">
                    <button class="btn outline profile-copy" type="button">Copy profile link</button>
                    <button class="btn profile-download" type="button">Download show reel</button>
                  </div>
                </div>
              </div>
              <dl class="identity-stats">
                <div>
                  <dt>Followers</dt>
                  <dd>12.4k</dd>
                </div>
                <div>
                  <dt>Weekly hours</dt>
                  <dd>9 hrs</dd>
                </div>
                <div>
                  <dt>Live segments</dt>
                  <dd>32</dd>
                </div>
              </dl>
            </div>
          </section>

          <section class="profile-section activity-section" aria-labelledby="profile-activity-title">
            <h3 id="profile-activity-title">Recent activity</h3>
            <ul class="activity-timeline">
              <li>
                <div>
                  <p class="activity-title">Scheduled "Synthwave Skylines" for Friday</p>
                  <p class="activity-meta">2 hours ago · playlist refresh locked in</p>
                </div>
                <button class="timeline-cta" type="button">View rundown</button>
              </li>
              <li>
                <div>
                  <p class="activity-title">Answered 14 listener requests</p>
                  <p class="activity-meta">Yesterday · queued for late night blend</p>
                </div>
                <button class="timeline-cta" type="button">Open inbox</button>
              </li>
              <li>
                <div>
                  <p class="activity-title">Uploaded "Campus Coffee Shop" mini-interview</p>
                  <p class="activity-meta">Mar 28 · studio 2 production suite</p>
                </div>
                <button class="timeline-cta" type="button">Play clip</button>
              </li>
            </ul>
          </section>

          <section class="profile-section badges-section" aria-labelledby="profile-badges-title">
            <h3 id="profile-badges-title">Achievements</h3>
            <div class="badge-grid">
              <span class="badge-chip">All-night marathon</span>
              <span class="badge-chip">Listener darling</span>
              <span class="badge-chip">Studio mentor</span>
              <span class="badge-chip">Sound design wiz</span>
              <span class="badge-chip">Top 10 chart</span>
            </div>
          </section>

          <section class="profile-section availability-section" aria-labelledby="profile-availability-title">
            <h3 id="profile-availability-title">Availability</h3>
            <ul class="settings-toggle-list">
              <li class="settings-toggle">
                <div class="toggle-copy">
                  <span class="toggle-label">Open to guest segments</span>
                  <p>Let producers drop you into collaborative shows.</p>
                </div>
                <button class="toggle-btn is-on profile-toggle" type="button" aria-pressed="true" data-label="Guest segments">
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="toggle-state" aria-hidden="true">On</span>
                </button>
              </li>
              <li class="settings-toggle">
                <div class="toggle-copy">
                  <span class="toggle-label">Show online status</span>
                  <p>Display when you're live editing from the booth.</p>
                </div>
                <button class="toggle-btn profile-toggle" type="button" aria-pressed="false" data-label="Online status">
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="toggle-state" aria-hidden="true">Off</span>
                </button>
              </li>
              <li class="settings-toggle">
                <div class="toggle-copy">
                  <span class="toggle-label">Auto-share tracklists</span>
                  <p>Publish playlists after each broadcast session.</p>
                </div>
                <button class="toggle-btn is-on profile-toggle" type="button" aria-pressed="true" data-label="Tracklists">
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                  <span class="toggle-state" aria-hidden="true">On</span>
                </button>
              </li>
            </ul>
          </section>

          <section class="profile-section access-section" aria-labelledby="profile-access-title">
            <h3 id="profile-access-title">Studio access</h3>
            <div class="access-grid">
              <article>
                <h4>Studios</h4>
                <ul>
                  <li>Studio Booth 1 — Live broadcast</li>
                  <li>Studio Booth 2 — Production suite</li>
                  <li>Podcast Lab — Reserved Thursdays</li>
                </ul>
              </article>
              <article>
                <h4>Equipment locker</h4>
                <ul>
                  <li>Shure SM7B mic — Checked out</li>
                  <li>Zoom H5 recorder — Due back Fri</li>
                  <li>LED light kit — Available</li>
                </ul>
              </article>
            </div>
          </section>

          <div class="profile-footer">
            <div class="profile-footer-actions">
              <button class="btn outline profile-edit" type="button">Edit profile</button>
              <button class="btn profile-schedule" type="button">View my schedule</button>
            </div>
            <p class="profile-footnote" id="profile-live" role="status" aria-live="polite">Profile synced with campus directory.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const panel = overlay.querySelector('.profile-modal');
  const closeBtn = overlay.querySelector('.profile-close');
  const statusRegion = overlay.querySelector('#profile-live');
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const toggles = Array.from(overlay.querySelectorAll('.profile-toggle'));
  const selectPronoun = overlay.querySelector('#profile-presence');
  const avatarBtn = overlay.querySelector('.avatar-action');
  const copyBtn = overlay.querySelector('.profile-copy');
  const downloadBtn = overlay.querySelector('.profile-download');
  const timelineButtons = Array.from(overlay.querySelectorAll('.timeline-cta'));
  const footerButtons = Array.from(overlay.querySelectorAll('.profile-footer-actions .btn'));

  let lastFocused = null;
  let activeTrigger = null;
  let detachKeyHandler = null;

  const announce = (message) => {
    if (statusRegion) statusRegion.textContent = message;
  };

  const setExpanded = (trigger) => {
    triggers.forEach((btn) => btn.setAttribute('aria-expanded', btn === trigger ? 'true' : 'false'));
  };

  const closeProfile = () => {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-active');
    detachKeyHandler?.();
    detachKeyHandler = null;
    document.body.style.overflow = '';
    setExpanded(null);
    announce('Profile panel closed.');
    const focusTarget = activeTrigger || lastFocused;
    if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
    activeTrigger = null;
  };

  const trapFocus = () => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeProfile();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(overlay.querySelectorAll(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    overlay.addEventListener('keydown', handler);
    detachKeyHandler = () => overlay.removeEventListener('keydown', handler);
  };

  const openProfile = (trigger) => {
    if (overlay.getAttribute('aria-hidden') === 'false') return;
    lastFocused = document.activeElement;
    activeTrigger = trigger || null;
    setExpanded(activeTrigger);
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    panel?.focus();
    trapFocus();
    announce('Profile panel opened.');
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeProfile();
  });
  closeBtn?.addEventListener('click', () => closeProfile());

  triggers.forEach((btn) => {
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => openProfile(btn));
  });

  toggles.forEach((btn) => {
    const sync = () => {
      const isOn = btn.getAttribute('aria-pressed') === 'true';
      btn.classList.toggle('is-on', isOn);
      const state = btn.querySelector('.toggle-state');
      if (state) state.textContent = isOn ? 'On' : 'Off';
    };
    sync();
    btn.addEventListener('click', () => {
      const isOn = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!isOn));
      sync();
      const label = btn.dataset.label || 'Setting';
      announce(`${label} ${!isOn ? 'enabled' : 'disabled'}.`);
    });
  });

  selectPronoun?.addEventListener('change', () => {
    announce(`Pronouns updated to ${selectPronoun.value}.`);
  });

  avatarBtn?.addEventListener('click', () => {
    announce('Avatar uploader ready — drag a new cover shot. (Demo)');
  });

  copyBtn?.addEventListener('click', () => {
    announce('Profile link copied to clipboard. (Demo)');
  });

  downloadBtn?.addEventListener('click', () => {
    announce('Show reel download queued. (Demo)');
  });

  timelineButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.textContent?.trim() || 'Item';
      announce(`${text} opened in a side drawer. (Demo)`);
    });
  });

  footerButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const isEdit = btn.classList.contains('profile-edit');
      announce(isEdit ? 'Profile editor launching. (Demo)' : 'Personal schedule loaded. (Demo)');
    });
  });
})();
