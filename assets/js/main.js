/* ═══════════════════════════════════════════════════════════
   ADO Code — Website interactions
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Flag a successful boot so the inline head safety-net can detect a failed load.
  window.__adoBooted = true;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ── Mobile nav ── */
  const burger = $('.nav-burger');
  const navLinks = $('.nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('open', !open);
    });
    $$('a', navLinks).forEach((a) =>
      a.addEventListener('click', () => {
        burger.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('open');
      })
    );
  }

  /* ── Hero tree expand/collapse ── */
  $$('.tree-parent', $('#tree') || document).forEach((row) => {
    row.addEventListener('click', () => {
      const children = row.nextElementSibling;
      if (!children || !children.classList.contains('tree-children')) return;
      const collapsed = row.dataset.collapsed !== 'false';
      row.dataset.collapsed = String(!collapsed);
      const caret = $('.tree-caret', row);
      if (caret) caret.textContent = collapsed ? '▾' : '▸';
      children.classList.toggle('tree-hidden', !collapsed);
    });
  });

  /* ── Copy-to-clipboard buttons ── */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  $$('[data-copy]').forEach((el) => {
    el.addEventListener('click', async () => {
      const text = el.dataset.copy;
      try {
        await copyText(text);
        const fb = $('.copy-feedback', el);
        if (fb) {
          fb.textContent = 'copied ✓';
          fb.classList.add('show');
          setTimeout(() => fb.classList.remove('show'), 1600);
        }
      } catch {
        const fb = $('.copy-feedback', el);
        if (fb) {
          fb.textContent = 'press Ctrl+C';
          fb.classList.add('show');
          setTimeout(() => fb.classList.remove('show'), 1600);
        }
      }
    });
  });

  /* ── Mode demo (hero pills + mode section) ── */
  const MODE_COPY = {
    inline: 'Chat — ask, then approve',
    plan: 'Plan — read-only inspection',
    act: 'Act — agentic workhorse',
    yolo: 'YOLO — full autonomy',
  };

  function bindModePills(root) {
    const pills = $$('.pill, .mode-pill', root);
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const mode = pill.dataset.mode;
        const isHero = !!pill.closest('.window');
        const group = isHero ? '.mode-pills' : '.modes-pills';
        const pillSel = isHero ? '.pill' : '.mode-pill';
        const panelGroup = isHero ? '#hero-chat' : '.mode-panels';

        $$(pillSel, $(group) || root).forEach((p) => {
          p.classList.toggle('pill-active', p === pill);
          p.classList.toggle('mode-pill-active', p === pill);
          if (isHero) {
            // Hero mode pills are a toggle group, not a tab list.
            p.setAttribute('aria-pressed', p === pill ? 'true' : 'false');
          } else {
            p.setAttribute('aria-selected', p === pill ? 'true' : 'false');
            p.setAttribute('tabindex', p === pill ? '0' : '-1');
          }
        });

        // Hero: swap the status bar + first AI message to reflect the mode
        if (isHero) {
          const status = $('.status-right');
          if (status && MODE_COPY[mode]) {
            status.textContent = MODE_COPY[mode] + ' · feature/ADO-123-stripe-integration';
          }
          const firstAi = $('.msg-ai .msg-body');
          const thinking = $('.thinking span:not(.thinking-dot)');
          if (mode === 'plan') {
            if (thinking) thinking.textContent = 'Inspecting the checkout module, the work item and its acceptance criteria… (read-only)';
            if (firstAi) firstAi.textContent = 'Here\u2019s my plan for ADO-123 — no files touched. Approve it and I\u2019ll switch to Act to implement.';
          } else if (mode === 'act') {
            if (thinking) thinking.textContent = 'Planning: read the checkout module, find the payment stub, wire the Stripe API…';
            if (firstAi) firstAi.textContent = 'On it. Applying edits directly — I\u2019ll show the diff when I\u2019m done.';
          } else if (mode === 'yolo') {
            if (thinking) thinking.textContent = 'Autonomous run: full tool access, no consent prompts…';
            if (firstAi) firstAi.textContent = 'Running fully autonomous — every tool, every command. A remote push still asks first.';
          } else {
            if (thinking) thinking.textContent = 'Planning: read the checkout module, find the payment stub, wire the Stripe API…';
            if (firstAi) firstAi.textContent = 'On it. I\u2019ll work through ADO-123, then hand the branch back for review.';
          }
          return;
        }

        // Mode section: swap panels
        $$('.mode-panel', $(panelGroup) || document).forEach((panel) => {
          const active = panel.dataset.mode === mode;
          panel.classList.toggle('mode-panel-active', active);
        });
      });
    });
  }
  bindModePills(document);

  /* ── Reveal on scroll ── */
  try {
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Very tall targets (e.g. the feature reference) can never satisfy a
          // 12% visibility threshold — reveal them as soon as any part enters.
          const tallTarget = entry.boundingClientRect.height > window.innerHeight;
          if (entry.isIntersecting && (entry.intersectionRatio >= 0.12 || tallTarget)) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }
  } catch (err) {
    // Never leave content invisible: reveal everything if reveal setup fails.
    if (window.__adoRevealAll) { window.__adoRevealAll(); }
  }

  /* ── Tabs: keyboard support for the Modes tab list ── */
  function bindTabs(tablist) {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) { return; }
    tablist.addEventListener('keydown', (event) => {
      const current = tabs.indexOf(document.activeElement);
      if (current === -1) { return; }
      let next;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = (current + 1) % tabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = (current - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  }
  document.querySelectorAll('.modes-pills[role="tablist"]').forEach(bindTabs);

  /* ── Nav: close the mobile menu on Escape and restore focus ── */
  if (burger && navLinks) {
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') { return; }
      if (burger.getAttribute('aria-expanded') !== 'true') { return; }
      burger.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('open');
      burger.focus();
    });
  }

  /* ── Copy buttons: announce success to assistive technology ── */
  document.addEventListener('click', (event) => {
    const btn = event.target instanceof Element ? event.target.closest('[data-copy]') : null;
    if (!btn) { return; }
    const status = document.getElementById('a11y-status');
    if (status) { status.textContent = 'Command copied to clipboard'; }
  }, true);

  /* ── Screenshot lightbox ─────────────────────────────────────────────
     Gallery screenshots open full-screen on click, Enter or Space (a real
     capture, or a placeholder stand-in in ?shots=placeholders mode). Esc, the
     ✕ button or a click on the backdrop closes it. Pages without the #shot-lb
     overlay are left untouched (deck.html wires its own viewer in deck.js). */
  const shotLb = $('#shot-lb');
  if (shotLb && $('figure.shot')) {
    const shotLbImg = $('#shot-lb-img');
    const shotLbCap = $('#shot-lb-cap');
    const shotLbClose = $('#shot-lb-close');
    let shotLbOpen = false;
    let shotLbReturn = null;

    function zoomableShot(fig) {
      const img = fig.querySelector('img');
      if (!img || !img.getAttribute('src')) return null;
      if (getComputedStyle(img).display === 'none') return null;
      return img;
    }

    function openShot(fig) {
      const img = zoomableShot(fig);
      if (!img || shotLbOpen) return;
      shotLbReturn = document.activeElement;
      shotLbImg.src = img.getAttribute('src');
      shotLbImg.alt = img.getAttribute('alt') || '';
      const cap = fig.querySelector('figcaption');
      const capText = cap ? cap.textContent.trim() : '';
      shotLbCap.textContent = capText;
      shotLbCap.hidden = !capText;
      shotLb.hidden = false;
      shotLbOpen = true;
      if (shotLbClose) shotLbClose.focus();
    }

    function closeShot() {
      if (!shotLbOpen) return;
      shotLb.hidden = true;
      shotLbOpen = false;
      shotLbImg.removeAttribute('src');
      if (shotLbReturn && typeof shotLbReturn.focus === 'function') shotLbReturn.focus();
      shotLbReturn = null;
    }

    $('figure.shot').forEach((fig) => {
      if (!zoomableShot(fig)) return;
      const cap = fig.querySelector('figcaption');
      fig.classList.add('shot--zoom');
      fig.tabIndex = 0;
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', 'View screenshot full screen' + (cap ? ': ' + cap.textContent.trim() : ''));
      fig.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openShot(fig);
      });
      fig.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          e.stopPropagation();
          openShot(fig);
        }
      });
    });

    if (shotLbClose) shotLbClose.addEventListener('click', (e) => { e.preventDefault(); closeShot(); });
    shotLb.addEventListener('click', (e) => { if (e.target === shotLb) closeShot(); });
    document.addEventListener('keydown', (e) => {
      if (shotLbOpen && e.key === 'Escape') { e.preventDefault(); closeShot(); }
    });
  }

  /* ── Respect reduced motion for the status-bar working dot ── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
  }
})();
