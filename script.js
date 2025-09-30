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
