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

  if (!featured || !modalOverlay) return;

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
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  closeBtn?.addEventListener('click', closeModal);
  closeActionBtn?.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal(); // click outside to close
  });
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
