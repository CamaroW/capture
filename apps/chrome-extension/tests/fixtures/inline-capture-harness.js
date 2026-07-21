const article = document.querySelector("#capture-article");
const initialBounds = article.getBoundingClientRect();
const focusStatus = document.querySelector("#focus-status");
const escapeStatus = document.querySelector("#escape-status");
const layoutStatus = document.querySelector("#layout-status");
const bfcacheStatus = document.querySelector("#bfcache-status");
const dialog = document.querySelector("#top-layer-dialog");
let escapeEvents = 0;
let canceledEscapeEvents = 0;
let bfcacheRestores = 0;


function describeFocus() {
  const active = document.activeElement;
  focusStatus.textContent = `Focus: ${active?.id || active?.tagName?.toLowerCase() || "none"}`;
}


function checkLayout() {
  const bounds = article.getBoundingClientRect();
  const stable = bounds.width === initialBounds.width
    && bounds.height === initialBounds.height
    && bounds.left === initialBounds.left;
  const message = `Article layout: ${stable ? "stable" : "changed"}`;
  if (layoutStatus.textContent !== message) {
    layoutStatus.textContent = message;
  }
  layoutStatus.dataset.stable = String(stable);
}


document.addEventListener("focusin", describeFocus);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  escapeEvents += 1;
  queueMicrotask(() => {
    if (event.defaultPrevented) {
      canceledEscapeEvents += 1;
    }
    escapeStatus.textContent = `Escape events: ${escapeEvents}; canceled: ${canceledEscapeEvents}`;
  });
});

document.querySelector("#open-dialog").addEventListener("click", () => {
  dialog.showModal();
});
document.querySelector("#close-dialog").addEventListener("click", () => {
  dialog.close();
});
globalThis.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    bfcacheRestores += 1;
    bfcacheStatus.textContent = `BFCache restores: ${bfcacheRestores}`;
  }
});

new ResizeObserver(checkLayout).observe(article);
new MutationObserver(checkLayout).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
describeFocus();
checkLayout();
