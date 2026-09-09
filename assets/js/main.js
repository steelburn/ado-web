/* ═══════════════════════════════════════════════════════════
   ADO Code — Website interactions
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

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
          p.setAttribute('aria-selected', p === pill ? 'true' : 'false');
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

  /* ── Respect reduced motion for the status-bar working dot ── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
  }
})();
