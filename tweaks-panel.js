// tweaks-panel.js — reusable settings-overlay component library. Vanilla
// JS, no React, no build step (rewritten 2026-07-21, replacing the React
// version — sailaja-os-frontier-and-method Item 2: this panel is ~10 simple
// form controls, never needed React's reconciler). App-agnostic: knows
// nothing about this specific app's pages/CSS vars — see index.html's
// mountTweaks() for that composition.
//
// API shape: each control is `tweakX(containerEl, { label, value, onChange,
// ... })` — builds its DOM into containerEl and wires native event
// listeners directly to onChange. There is no virtual DOM and no
// re-render loop: every control updates its own visual state (slider
// position, toggle state, radio thumb) imperatively inside its own event
// handler, exactly as a native <input> already does. createTweaksPanel()
// rebuilds the panel body from scratch each time it opens (mirroring the
// old React version's `if (!open) return null` full-unmount behavior), so
// callers always see fresh values on open — no staleness to manage.

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;width:100%;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}
`;

// Minimal DOM-builder: el(tag, props, ...children). props: className,
// style (object), data-*/aria-*/role (plain attrs), on<event> (lowercase,
// e.g. onclick/onmousedown/oninput) wired via addEventListener.
function el(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      if (k === 'className') node.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
  }
  children.flat().forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function tweakRow(body, { label, value }, contentEl) {
  const valueSpan = value != null ? el('span', { className: 'twk-val' }, String(value)) : null;
  const lbl = el('div', { className: 'twk-lbl' }, el('span', null, label), valueSpan);
  body.appendChild(el('div', { className: 'twk-row' }, lbl, contentEl));
  return valueSpan;
}

function tweakSection(body, label) {
  body.appendChild(el('div', { className: 'twk-sect' }, label));
}

function tweakSlider(body, { label, value, min = 0, max = 100, step = 1, unit = '', onChange }) {
  const input = el('input', { type: 'range', className: 'twk-slider', min, max, step, value });
  const valueSpan = tweakRow(body, { label, value: `${value}${unit}` }, input);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    if (valueSpan) valueSpan.textContent = `${v}${unit}`;
    onChange(v);
  });
}

function tweakToggle(body, { label, value, onChange }) {
  const btn = el('button', {
    type: 'button', className: 'twk-toggle', 'data-on': value ? '1' : '0',
    role: 'switch', 'aria-checked': String(!!value),
  }, el('i'));
  btn.addEventListener('click', () => {
    const next = btn.getAttribute('data-on') !== '1';
    btn.setAttribute('data-on', next ? '1' : '0');
    btn.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  const lbl = el('div', { className: 'twk-lbl' }, el('span', null, label));
  body.appendChild(el('div', { className: 'twk-row twk-row-h' }, lbl, btn));
}

function tweakRadio(body, { label, value, options, onChange }) {
  const opts = options.map(o => (typeof o === 'object' ? o : { value: o, label: o }));
  const n = opts.length;
  let current = value;
  const track = el('div', { role: 'radiogroup', className: 'twk-seg' });
  const thumb = el('div', { className: 'twk-seg-thumb' });
  track.appendChild(thumb);
  const buttons = opts.map(o => {
    const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(o.value === current) }, o.label);
    track.appendChild(b);
    return b;
  });
  const idxOf = v => Math.max(0, opts.findIndex(o => o.value === v));
  const positionThumb = idx => {
    thumb.style.left = `calc(2px + ${idx} * (100% - 4px) / ${n})`;
    thumb.style.width = `calc((100% - 4px) / ${n})`;
  };
  const setSelected = v => {
    current = v;
    buttons.forEach((b, i) => b.setAttribute('aria-checked', String(opts[i].value === v)));
    positionThumb(idxOf(v));
  };
  positionThumb(idxOf(current));
  const segAt = clientX => {
    const r = track.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  track.addEventListener('pointerdown', e => {
    track.classList.add('dragging');
    const v0 = segAt(e.clientX);
    if (v0 !== current) { setSelected(v0); onChange(v0); }
    const move = ev => {
      const v = segAt(ev.clientX);
      if (v !== current) { setSelected(v); onChange(v); }
    };
    const up = () => {
      track.classList.remove('dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  tweakRow(body, { label }, track);
}

function tweakSelect(body, { label, value, options, onChange }) {
  const select = el('select', { className: 'twk-field' });
  options.forEach(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    const opt = el('option', { value: v }, l);
    if (v === value) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => onChange(select.value));
  tweakRow(body, { label }, select);
}

function tweakText(body, { label, value, placeholder, onChange }) {
  const input = el('input', { className: 'twk-field', type: 'text', value: value || '', placeholder });
  input.addEventListener('input', () => onChange(input.value));
  tweakRow(body, { label }, input);
}

function tweakNumber(body, { label, value, min, max, step = 1, unit = '', onChange }) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const input = el('input', { type: 'number', value, min, max, step });
  input.addEventListener('change', () => onChange(clamp(Number(input.value))));
  const lblSpan = el('span', { className: 'twk-num-lbl' }, label);
  lblSpan.addEventListener('pointerdown', e => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = Number(input.value);
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startX;
      const raw = startVal + dx * step;
      const snapped = Math.round(raw / step) * step;
      const clamped = clamp(Number(snapped.toFixed(decimals)));
      input.value = clamped;
      onChange(clamped);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  const unitSpan = unit ? el('span', { className: 'twk-num-unit' }, unit) : null;
  body.appendChild(el('div', { className: 'twk-num' }, lblSpan, input, unitSpan));
}

function tweakColor(body, { label, value, onChange }) {
  const input = el('input', { type: 'color', className: 'twk-swatch', value });
  input.addEventListener('input', () => onChange(input.value));
  const lbl = el('div', { className: 'twk-lbl' }, el('span', null, label));
  body.appendChild(el('div', { className: 'twk-row twk-row-h' }, lbl, input));
}

function tweakButton(body, { label, onClick, secondary = false }) {
  const btn = el('button', { type: 'button', className: secondary ? 'twk-btn secondary' : 'twk-btn' }, label);
  btn.addEventListener('click', onClick);
  body.appendChild(btn);
}

// createTweaksPanel(rootEl, { title, buildBody }) — mounts into rootEl.
// Stays closed until a parent frame sends postMessage({type:
// '__activate_edit_mode'}); rebuilds the whole panel body via buildBody(el)
// fresh on every open (mirrors the old React version's full unmount/remount
// on close, so callers never need to worry about stale DOM).
function createTweaksPanel(rootEl, { title = 'Tweaks', buildBody }) {
  let open = false;
  let offset = { x: 16, y: 16 };
  let panelEl = null;
  let cleanupResize = null;
  const PAD = 16;

  function clampToViewport() {
    if (!panelEl) return;
    const w = panelEl.offsetWidth, h = panelEl.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offset = {
      x: Math.min(maxRight, Math.max(PAD, offset.x)),
      y: Math.min(maxBottom, Math.max(PAD, offset.y)),
    };
    panelEl.style.right = offset.x + 'px';
    panelEl.style.bottom = offset.y + 'px';
  }

  function onDragStart(e) {
    if (!panelEl) return;
    const r = panelEl.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offset = { x: startRight - (ev.clientX - sx), y: startBottom - (ev.clientY - sy) };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function dismiss() {
    open = false;
    renderClosed();
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  }

  function renderOpen() {
    rootEl.innerHTML = '';
    const styleEl = el('style', null, __TWEAKS_STYLE);
    const closeBtn = el('button', {
      className: 'twk-x', 'aria-label': 'Close tweaks',
      onmousedown: e => e.stopPropagation(), onclick: dismiss,
    }, '✕');
    const hd = el('div', { className: 'twk-hd', onmousedown: onDragStart }, el('b', null, title), closeBtn);
    const body = el('div', { className: 'twk-body' });
    buildBody(body);
    panelEl = el('div', {
      className: 'twk-panel', 'data-noncommentable': '',
      style: { right: offset.x + 'px', bottom: offset.y + 'px' },
    }, hd, body);
    rootEl.appendChild(styleEl);
    rootEl.appendChild(panelEl);
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      cleanupResize = () => window.removeEventListener('resize', clampToViewport);
    } else {
      const ro = new ResizeObserver(clampToViewport);
      ro.observe(document.documentElement);
      cleanupResize = () => ro.disconnect();
    }
  }

  function renderClosed() {
    rootEl.innerHTML = '';
    if (cleanupResize) { cleanupResize(); cleanupResize = null; }
    panelEl = null;
  }

  window.addEventListener('message', e => {
    const t = e && e.data && e.data.type;
    if (t === '__activate_edit_mode') { open = true; renderOpen(); }
    else if (t === '__deactivate_edit_mode') { open = false; renderClosed(); }
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
}
