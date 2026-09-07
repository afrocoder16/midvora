// The page keeps native touch scrolling. Only nearby artwork is scrubbed, with
// browser animations instead of cascading CSS-variable changes on every frame.
type Track = { selector: string; phase: 'travel' | 'arrival'; frames: Keyframe[] };
type Scene = { element: HTMLElement; tracks: { animation: Animation; phase: Track['phase'] }[]; last: string };

export function createScrollArt(page: HTMLElement, isMoving: () => boolean, schedule: () => void) {
  const phone = window.matchMedia('(max-width: 700px), (pointer: coarse)');
  const visible = new Set<Scene>();
  const scenes = new Map<Element, Scene>();
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const selectors = '.home-art-stage,.home-ribbons,.home-work-image,.home-process-art,.home-price-art,.studio-art,.gallery-wall,.collection-media,.prairie-art,.mainstreet-art,.cta-sun-art';

  function tracks(): Track[] {
    const distance = phone.matches ? 24 : 42;
    const angle = phone.matches ? 6 : 8;
    const travel = (selector: string, from: Keyframe, to: Keyframe): Track => ({ selector, phase: 'travel', frames: [from, to] });
    const arrive = (selector: string, from: Keyframe, to: Keyframe): Track => ({ selector, phase: 'arrival', frames: [from, to] });
    return [
      travel('.home-art-drift', { translate: `0 ${distance * .8}px`, rotate: `${-angle * .5}deg` }, { translate: `0 ${-distance * .8}px`, rotate: `${angle * .5}deg` }),
      travel('.prairie-art > .studio-float', { transform: `translateY(${distance * .7}px) rotate(${-angle * .45}deg)` }, { transform: `translateY(${-distance * .7}px) rotate(${angle * .45}deg)` }),
      travel('.home-ribbon-offer', { translate: '50px 0' }, { translate: '-50px 0' }),
      travel('.home-ribbon-craft', { translate: '-50px 0' }, { translate: '50px 0' }),
      arrive('.home-work-window,.collection-window', { translate: '0 18px', rotate: 'x 7deg' }, { translate: '0 0', rotate: 'x 0deg' }),
      arrive('.print-left', { translate: '28px 28px', rotate: '9deg' }, { translate: '0 0', rotate: '0deg' }),
      arrive('.print-right', { translate: '-28px 18px', rotate: '-9deg' }, { translate: '0 0', rotate: '0deg' }),
      travel('.print-center', { translate: `0 ${distance * .6}px` }, { translate: `0 ${-distance * .6}px` }),
      travel('.gallery-stamp', { rotate: '5deg' }, { rotate: '-5deg' }),
      arrive('.note-back', { translate: '22px 16px', rotate: '12deg' }, { translate: '0 0', rotate: '0deg' }),
      travel('.note-front', { translate: '0 15px', rotate: '3deg' }, { translate: '0 -15px', rotate: '-3deg' }),
      arrive('.pane-back', { translate: '-18px 25px' }, { translate: '0 0' }),
      arrive('.pane-middle', { translate: '-9px 13px' }, { translate: '0 0' }),
      arrive('.process-browser', { rotate: 'y -13deg' }, { rotate: 'y 0deg' }),
      travel('.process-plane', { translate: phone.matches ? '-27px 25px' : '-38px 32px', rotate: '12deg' }, { translate: phone.matches ? '27px -25px' : '38px -32px', rotate: '-12deg' }),
      arrive('.process-flight-path path', { strokeDashoffset: '1' }, { strokeDashoffset: '0' }),
      travel('.process-launch-sun', { translate: '0 -16px' }, { translate: '0 16px' }),
      travel('.process-orbit,.price-orbits', { rotate: '-18deg' }, { rotate: '18deg' }),
      travel('.price-art-seal', { translate: '0 20px' }, { translate: '0 -20px' }),
      arrive('.sheet-third', { rotate: '7deg' }, { rotate: '0deg' }),
      arrive('.sheet-second', { rotate: '3.5deg' }, { rotate: '0deg' }),
      travel('.build-window', { rotate: '3deg' }, { rotate: '-3deg' }),
      travel('.build-type-card', { rotate: '-7deg' }, { rotate: '7deg' }),
      travel('.build-sun,.mainstreet-sun,.lost-sun', { transform: `translateY(${distance * .75}px)` }, { transform: `translateY(${-distance * .75}px)` }),
      arrive('.hello-letter', { translate: '0 37px', rotate: '4deg' }, { translate: '0 -6px', rotate: '0deg' }),
      travel('.hello-postmark', { rotate: '8deg' }, { rotate: '-8deg' }),
      arrive('.building-one', { translate: '0 18px' }, { translate: '0 0' }),
      arrive('.building-two', { translate: '0 36px' }, { translate: '0 0' }),
      arrive('.building-three', { translate: '0 25px' }, { translate: '0 0' }),
      travel('.lost-numbers', { rotate: '-5deg' }, { rotate: '5deg' }),
      travel('.cta-sun-art > .studio-turn', { transform: 'rotate(-70deg)' }, { transform: 'rotate(70deg)' }),
    ];
  }
  let definitions = tracks();
  page.querySelectorAll<HTMLElement>(selectors).forEach(element => {
    element.dataset.scrollScene = '';
    scenes.set(element, { element, tracks: [], last: '' });
  });
  page.querySelectorAll('.process-flight-path path').forEach(path => path.setAttribute('pathLength', '1'));

  function release(scene: Scene) {
    scene.tracks.forEach(track => track.animation.cancel());
    scene.tracks = [];
    scene.last = '';
  }
  function prepare(scene: Scene) {
    definitions.forEach(track => {
      scene.element.querySelectorAll<HTMLElement>(track.selector).forEach(element => {
        const animation = element.animate(track.frames, { duration: 1000, fill: 'both' });
        animation.pause();
        scene.tracks.push({ animation, phase: track.phase });
      });
    });
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const scene = scenes.get(entry.target)!;
      if (entry.isIntersecting) visible.add(scene);
      else { visible.delete(scene); release(scene); }
      scene.element.toggleAttribute('data-scroll-active', entry.isIntersecting);
    });
    if (isMoving()) schedule();
  }, { rootMargin: '100px 0px' });
  scenes.forEach(scene => observer.observe(scene.element));

  // Filtering projects, loading images and opening FAQs can change the page height.
  const resizeObserver = new ResizeObserver(() => { if (isMoving()) schedule(); });
  const main = page.querySelector('main');
  if (main) resizeObserver.observe(main);
  phone.addEventListener('change', () => {
    definitions = tracks();
    scenes.forEach(release);
    schedule();
  });

  return {
    update() {
      if (!isMoving()) return;
      const height = document.documentElement.clientHeight;
      // Read stable scene geometry together, then update the animation playheads.
      const updates = [...visible].map(scene => {
        const rect = scene.element.getBoundingClientRect();
        return {
          scene,
          travel: Math.round(clamp((height - rect.top) / (height + rect.height)) * 1000),
          arrival: Math.round(clamp((height * .93 - rect.top) / Math.min(height * .68, rect.height + height * .15)) * 1000),
        };
      });
      updates.forEach(({ scene, travel, arrival }) => {
        const state = `${travel}/${arrival}`;
        if (state === scene.last) return;
        if (!scene.tracks.length) prepare(scene);
        scene.tracks.forEach(track => {
          const time = track.phase === 'travel' ? travel : arrival;
          if (track.animation.currentTime !== time) track.animation.currentTime = time;
        });
        scene.last = state;
      });
    },
    sync() {
      if (page.dataset.motion === 'reduced') scenes.forEach(release);
      schedule();
    },
  };
}