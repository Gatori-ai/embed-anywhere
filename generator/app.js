import { buildSnippet, PLATFORMS, MODES } from '/lib/snippet.js';

const form = document.getElementById('form');
const codeEl = document.getElementById('code');
const stepsEl = document.getElementById('steps');
const notesEl = document.getElementById('notes');
const errorEl = document.getElementById('error');
const preview = document.getElementById('preview');
const modeHint = document.getElementById('mode-hint');
const platformSel = form.elements.platform;
const modeSel = form.elements.mode;

for (const [key, p] of Object.entries(PLATFORMS)) {
  platformSel.add(new Option(p.label + (p.tested ? '' : ' (untested)'), key));
}
form.elements.url.value = new URL('/starter/', location.href).href;

function fillModes() {
  const allowed = PLATFORMS[platformSel.value].modes;
  const current = modeSel.value;
  modeSel.innerHTML = '';
  for (const m of allowed) modeSel.add(new Option(MODES[m].label, m));
  if (allowed.includes(current)) modeSel.value = current;
}

function list(el, items) {
  el.innerHTML = '';
  for (const text of items) {
    const li = document.createElement('li');
    li.textContent = text;
    el.append(li);
  }
}

let previewTimer;
function render() {
  const mode = modeSel.value;
  modeHint.textContent = MODES[mode].summary;
  for (const label of document.querySelectorAll('#height-row [data-for]')) {
    label.hidden = !label.dataset.for.split(' ').includes(mode);
  }
  const f = form.elements;
  try {
    const s = buildSnippet({
      url: f.url.value, platform: platformSel.value, mode, background: f.background.value, title: f.title.value,
      minHeight: f.minHeight.value, height: f.height.value, fullBleed: f.fullBleed.checked,
    });
    errorEl.textContent = '';
    codeEl.value = s.code;
    list(stepsEl, s.steps.map((x) => x.replace(/^Publish \(or open the builder preview\), then run the check: .*/, 'Publish, then open the page on your phone and your computer. Look for gaps at the edges, a sideways scrollbar, or a page cut off at the bottom. An agent runs bin/verify-embed.mjs for this.')));
    list(notesEl, s.notes);
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      preview.src = '/preview/?v=' + Date.now() + '#' + encodeURIComponent(s.code);
    }, 400);
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

let lastMode = '';
function onModeChange() {
  if (modeSel.value !== lastMode) {
    form.elements.fullBleed.checked = modeSel.value === 'auto';
    lastMode = modeSel.value;
  }
}

platformSel.addEventListener('change', () => { fillModes(); onModeChange(); render(); });
modeSel.addEventListener('change', () => { onModeChange(); render(); });
form.addEventListener('input', render);
form.addEventListener('submit', (e) => e.preventDefault());

document.getElementById('copy').addEventListener('click', async (e) => {
  try {
    await navigator.clipboard.writeText(codeEl.value);
    e.target.textContent = 'Copied';
  } catch {
    codeEl.select();
    e.target.textContent = 'Press Ctrl+C or Cmd+C';
  }
  setTimeout(() => { e.target.textContent = 'Copy code'; }, 1800);
});

fillModes();
onModeChange();
render();
