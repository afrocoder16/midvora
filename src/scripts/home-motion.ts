import { createScrollArt } from './scroll-art';

// Progressive enhancement: all content is complete and readable before this runs.
const page = document.querySelector<HTMLElement>('.home-page');
if (page) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const staticPreview = new URLSearchParams(window.location.search).has('staticPreview');
  const pauseButtons = [...page.querySelectorAll<HTMLButtonElement>('.home-motion-toggle')];
  const counters = [...page.querySelectorAll<HTMLElement>('[data-counter]')];
  const activeAnimations = new Set<Animation>();
  const counterFrames = new Set<number>();
  let userPaused = false;
  let scrollFrame = 0;
  let scrollArt: ReturnType<typeof createScrollArt> | undefined;
  const isMoving = () => !reducedMotion.matches && !staticPreview && !userPaused && !document.hidden;

  counters.forEach(counter => { counter.dataset.counterFinal = counter.textContent || ''; });
  function syncMotion() {
    page!.dataset.motion = reducedMotion.matches || staticPreview ? 'reduced' : isMoving() ? 'running' : 'paused';
    pauseButtons.forEach(button => {
      button.hidden = reducedMotion.matches || staticPreview;
      button.setAttribute('aria-pressed', String(userPaused));
      const label = button.querySelector('[data-motion-label]');
      const icon = button.querySelector('[data-motion-icon]');
      if (label) label.textContent = userPaused ? 'Play motion' : 'Pause motion';
      if (icon) icon.textContent = userPaused ? '▷' : 'Ⅱ';
    });
    if (!isMoving()) {
      activeAnimations.forEach(animation => animation.cancel());
      activeAnimations.clear();
      counterFrames.forEach(frame => cancelAnimationFrame(frame));
      counterFrames.clear();
      counters.forEach(counter => { counter.textContent = counter.dataset.counterFinal || ''; });
    }
    scrollArt?.sync();
    scheduleScroll();
  }
  pauseButtons.forEach(button => button.addEventListener('click', () => { userPaused = !userPaused; syncMotion(); }));
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();

  const zones = page.querySelectorAll<HTMLElement>('[data-motion-zone]');
  if ('IntersectionObserver' in window) {
    const zoneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
    }, { rootMargin: '70px 0px', threshold: 0 });
    zones.forEach(zone => zoneObserver.observe(zone));
  }

  function animateElement(element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    if (!isMoving()) return;
    const animation = element.animate(keyframes, options);
    activeAnimations.add(animation);
    animation.finished.then(() => activeAnimations.delete(animation)).catch(() => activeAnimations.delete(animation));
  }
  page.querySelectorAll<HTMLElement>([
    '.home-section-heading', '.home-work-card', '#redesign-demo', '.home-contact-copy',
    '.studio-section-head', '.studio-package', '.service-menu-grid article', '.collection-copy',
    '.name-story-bottom', '.belief-list article', '.contact-details-grid > div',
    '.faq-grid > div:first-child', '.home-footer-top > div',
  ].join(',')).forEach(element => {
    element.dataset.homeReveal = '';
  });
  page.querySelectorAll<HTMLElement>('.studio-packages, .service-menu-grid, .home-work-grid, .home-footer-top').forEach(group => {
    [...group.children].forEach((child, index) => (child as HTMLElement).style.setProperty('--reveal-order', String(index)));
  });
  const ink = page.querySelectorAll<HTMLElement>('h2 > em');
  ink.forEach(element => { element.dataset.scrollInk = ''; });
  if ('IntersectionObserver' in window) {
    const inkObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('ink-drawn');
        inkObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    ink.forEach(element => inkObserver.observe(element));
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        revealObserver.unobserve(element);
        // Controls stay put while someone is typing or using the keyboard.
        if (element.contains(document.activeElement)) return;
        const phone = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
        animateElement(element, [{ translate: `0 ${phone ? 18 : 28}px` }, { translate: '0 0' }], {
          duration: phone ? 560 : 720,
          delay: phone ? 0 : Number(element.style.getPropertyValue('--reveal-order') || 0) * 75,
          easing: 'cubic-bezier(.2,.75,.25,1)',
        });
        const rule = element.querySelector<HTMLElement>('.home-offer-rule');
        if (rule) animateElement(rule, [{ transform: 'scaleX(.08)' }, { transform: 'scaleX(1)' }], { duration: 1000, easing: 'cubic-bezier(.2,.75,.25,1)' });
        const counter = element.querySelector<HTMLElement>('[data-counter]');
        if (counter && isMoving()) countUp(counter);
      });
    }, { threshold: .06, rootMargin: '0px 0px -35px 0px' });
    page.querySelectorAll<HTMLElement>('[data-home-reveal]').forEach(element => revealObserver.observe(element));
  }

  function countUp(counter: HTMLElement) {
    const target = Number(counter.dataset.counter || 0);
    if (!target) return;
    const start = performance.now();
    const prefix = counter.dataset.counterPrefix || '';
    const suffix = counter.dataset.counterSuffix || '';
    let frame = 0;
    const tick = (now: number) => {
      counterFrames.delete(frame);
      if (!isMoving()) { counter.textContent = counter.dataset.counterFinal || ''; return; }
      const progress = Math.min(1, (now - start) / 1100);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = prefix + Math.round(target * eased) + suffix;
      if (progress < 1) { frame = requestAnimationFrame(tick); counterFrames.add(frame); }
      else counter.textContent = counter.dataset.counterFinal || '';
    };
    frame = requestAnimationFrame(tick);
    counterFrames.add(frame);
  }

  const header = page.querySelector<HTMLElement>('.home-header');
  const scrollingElement = document.documentElement;
  let scrollRange = 0;
  const progressBar = document.createElement('div');
  progressBar.className = 'home-scroll-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  page.prepend(progressBar);
  function updateScroll() {
    scrollFrame = 0;
    scrollRange = scrollingElement.scrollHeight - scrollingElement.clientHeight;
    // Give the first screen priority; prepare scroll artwork when the visitor moves.
    if (!scrollArt && isMoving() && scrollY > 5 && 'IntersectionObserver' in window && 'ResizeObserver' in window) {
      scrollArt = createScrollArt(page!, isMoving, scheduleScroll);
    }
    scrollArt?.update();
    progressBar.style.transform = `scaleX(${scrollRange > 0 ? Math.min(1, Math.max(0, scrollY / scrollRange)) : 0})`;
    header?.classList.toggle('has-scrolled', scrollY > 30);
  }
  function scheduleScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  scheduleScroll();
}
