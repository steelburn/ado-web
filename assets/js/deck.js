/* ═══════════════════════════════════════════════════════════
   ADO Code — Presentation deck controller
   Keyboard: ←/→/Space/PgUp/PgDn/Home/End · F fullscreen · G overview · N notes · Esc close
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const CANVAS_W = 1280;
  const CANVAS_H = 720;

  const stage = document.getElementById('deck-stage');
  const viewport = document.getElementById('deck-viewport');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  let current = 0;
  let overviewOpen = false;

  const $ = (id) => document.getElementById(id);
  const counterCur = $('counter-cur');
  const counterTotal = $('counter-total');
  const progressFill = $('progress-fill');
  const notesBody = $('notes-body');
  const notesSlide = $('notes-slide');
  const notesPanel = $('deck-notes');
  const overviewEl = $('deck-overview');
  const overviewGrid = $('overview-grid');

  /* ── Scale the fixed 16:9 canvas to fit the viewport ── */
  function fit() {
    if (!stage || !viewport) return;
    const pad = 48; // 24px breathing room each side
    const availW = viewport.clientWidth - pad;
    const availH = viewport.clientHeight - pad;
    const s = Math.max(0.1, Math.min(availW / CANVAS_W, availH / CANVAS_H));
    stage.style.transform = 'scale(' + s + ')';
  }

  /* ── Show a slide ── */
  function show(i) {
    current = (i + total) % total;
    slides.forEach((s, idx) => s.classList.toggle('is-active', idx === current));
    if (counterCur) counterCur.textContent = String(current + 1);
    if (counterTotal) counterTotal.textContent = String(total);
    if (progressFill) progressFill.style.width = ((current + 1) / total * 100) + '%';
    renderNotes();
    markActiveThumb();
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  /* ── Speaker notes ── */
  function renderNotes() {
    if (!notesBody) return;
    const slide = slides[current];
    const note = slide ? slide.querySelector('.slide__notes') : null;
    notesBody.textContent = note ? note.textContent.trim() : 'No notes for this slide.';
    if (notesSlide) notesSlide.textContent = (current + 1) + ' / ' + total;
  }

  function toggleNotes(force) {
    const open = typeof force === 'boolean' ? force : !document.body.classList.contains('notes-open');
    document.body.classList.toggle('notes-open', open);
    const btn = $('btn-notes');
    if (btn) btn.setAttribute('aria-pressed', String(open));
    if (notesPanel) notesPanel.setAttribute('aria-hidden', String(!open));
    requestAnimationFrame(fit);
  }

  /* ── Fullscreen ── */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen && document.exitFullscreen();
    }
  }

  function syncFullscreenBtn() {
    const on = !!document.fullscreenElement;
    const btn = $('btn-fullscreen');
    if (btn) btn.setAttribute('aria-pressed', String(on));
    const enter = $('fs-icon-enter');
    const exit = $('fs-icon-exit');
    if (enter) enter.style.display = on ? 'none' : 'block';
    if (exit) exit.style.display = on ? 'block' : 'none';
    requestAnimationFrame(fit);
  }

  /* ── Overview grid ── */
  function buildOverview() {
    if (!overviewGrid) return;
    slides.forEach((slide, idx) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'ov-thumb';
      thumb.setAttribute('aria-label', 'Go to slide ' + (idx + 1));

      const num = document.createElement('span');
      num.className = 'ov-num';
      num.textContent = String(idx + 1);
      thumb.appendChild(num);

      const inner = document.createElement('div');
      inner.className = 'ov-thumb-inner';
      const clone = slide.cloneNode(true);
      clone.classList.remove('is-active');
      clone.removeAttribute('id');
      clone.querySelectorAll('.slide__notes').forEach((n) => n.remove());
      inner.appendChild(clone);
      thumb.appendChild(inner);

      thumb.addEventListener('click', () => {
        show(idx);
        setOverview(false);
      });
      overviewGrid.appendChild(thumb);
    });
  }

  function fitThumbs() {
    if (!overviewGrid) return;
    overviewGrid.querySelectorAll('.ov-thumb').forEach((thumb) => {
      const inner = thumb.querySelector('.ov-thumb-inner');
      if (inner) inner.style.transform = 'scale(' + (thumb.clientWidth / CANVAS_W) + ')';
    });
  }

  function markActiveThumb() {
    if (!overviewGrid) return;
    overviewGrid.querySelectorAll('.ov-thumb').forEach((t, idx) => t.classList.toggle('ov-active', idx === current));
  }

  function setOverview(open) {
    overviewOpen = open;
    if (overviewEl) overviewEl.hidden = !open;
    const btn = $('btn-overview');
    if (btn) btn.setAttribute('aria-pressed', String(open));
    if (open) {
      requestAnimationFrame(fitThumbs);
      const active = overviewGrid && overviewGrid.querySelector('.ov-thumb.ov-active');
      if (active) active.focus({ preventScroll: true });
    }
  }

  /* ── Copy-to-clipboard (install command) ── */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); resolve(); }
      catch (e) { reject(e); }
      finally { document.body.removeChild(ta); }
    });
  }

  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', async () => {
      const original = el.textContent;
      try {
        await copyText(el.dataset.copy);
        el.textContent = '✓';
        el.classList.add('copied');
      } catch {
        el.textContent = '!';
      }
      setTimeout(() => {
        el.textContent = original;
        el.classList.remove('copied');
      }, 1400);
    });
  });

  /* ── Wiring ── */
  $('btn-next').addEventListener('click', next);
  $('btn-prev').addEventListener('click', prev);
  $('btn-fullscreen').addEventListener('click', toggleFullscreen);
  $('btn-overview').addEventListener('click', () => setOverview(!overviewOpen));
  $('btn-overview-close').addEventListener('click', () => setOverview(false));
  $('btn-notes').addEventListener('click', () => toggleNotes());

  /* click on the stage background advances (not on links/buttons/code) */
  stage.addEventListener('click', (e) => {
    if (overviewOpen) return;
    if (e.target.closest('a, button, code, input, textarea, summary, [data-copy]')) return;
    next();
  });

  document.addEventListener('keydown', (e) => {
    if (overviewOpen) {
      if (e.key === 'Escape') { setOverview(false); }
      return;
    }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); show(0); break;
      case 'End': e.preventDefault(); show(total - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'g': case 'G': setOverview(!overviewOpen); break;
      case 'n': case 'N': toggleNotes(); break;
      case 'Escape': toggleNotes(false); break;
    }
  });

  document.addEventListener('fullscreenchange', syncFullscreenBtn);
  window.addEventListener('resize', () => { fit(); if (overviewOpen) fitThumbs(); });
  if ('ResizeObserver' in window && viewport) {
    new ResizeObserver(() => { fit(); }).observe(viewport);
  }

  /* ── Init ── */
  buildOverview();
  show(0);
  fit();
})();
