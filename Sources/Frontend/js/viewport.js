// iOS can resize its visual viewport when browser controls, the keyboard or
// a restored Home Screen window appear. Keep the mobile shell inside it.
let frame;
function syncViewport() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const viewport = window.visualViewport;
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
    document.documentElement.style.setProperty('--amt-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
    document.documentElement.style.setProperty('--amt-viewport-top', `${viewport?.offsetTop ?? 0}px`);
  });
}
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
window.addEventListener('resize', syncViewport);
window.addEventListener('pageshow', syncViewport);
document.addEventListener('visibilitychange', syncViewport);
syncViewport();
