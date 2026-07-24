/* ============================================================
   FITNESS CALISTA — js/ui.js
   window.UI : DOM helpers + shared widgets. No modules.
   ============================================================ */
(function () {
  'use strict';

  /**
   * el(tag, attrs, ...children)
   * attrs: { class, id, style (object|string), onclick, html, ...any attribute }
   * children: string -> textNode, Node -> appended, null/undefined/false -> skipped,
   *           Array -> flattened.
   */
  function el(tag, attrs) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    for (var key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      var val = attrs[key];
      if (val === null || val === undefined || val === false) continue;
      if (key === 'class' || key === 'className') {
        node.className = val;
      } else if (key === 'id') {
        node.id = val;
      } else if (key === 'style') {
        if (typeof val === 'string') {
          node.style.cssText = val;
        } else if (typeof val === 'object') {
          for (var prop in val) {
            if (Object.prototype.hasOwnProperty.call(val, prop)) {
              node.style[prop] = val[prop];
            }
          }
        }
      } else if (key === 'html') {
        node.innerHTML = val;
      } else if (key.indexOf('on') === 0 && typeof val === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (key === 'dataset' && typeof val === 'object') {
        for (var d in val) {
          if (Object.prototype.hasOwnProperty.call(val, d)) node.dataset[d] = val[d];
        }
      } else if (val === true) {
        node.setAttribute(key, '');
      } else {
        node.setAttribute(key, String(val));
      }
    }
    appendChildren(node, Array.prototype.slice.call(arguments, 2));
    return node;
  }

  function appendChildren(node, children) {
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child === null || child === undefined || child === false) continue;
      if (Array.isArray(child)) {
        appendChildren(node, child);
      } else if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        node.appendChild(child);
      }
    }
  }

  /**
   * topbar(titleVi, subtitleVi, onBack)
   * Returns a sticky top bar DOM element. If onBack is null, no back button.
   */
  function topbar(titleVi, subtitleVi, onBack) {
    var children = [];
    if (typeof onBack === 'function') {
      children.push(
        el('button', { class: 'topbar-back', 'aria-label': 'Quay lại', onclick: onBack }, '‹')
      );
    }
    var titles = el('div', { class: 'topbar-titles' },
      el('div', { class: 'topbar-title' }, titleVi || '')
    );
    if (subtitleVi) {
      titles.appendChild(el('div', { class: 'topbar-subtitle' }, subtitleVi));
    }
    children.push(titles);
    return el.apply(null, ['div', { class: 'topbar' }].concat(children));
  }

  /**
   * card(titleVi, accentColor, ...children)
   * accentColor: category key ('chest','back','leg','shoulder','arm','cardio',
   * 'free','facility','gold','danger','ok') or null for no accent bar.
   */
  var ACCENTS = {
    gold: 1, chest: 1, back: 1, leg: 1, shoulder: 1, arm: 1,
    cardio: 1, free: 1, facility: 1, danger: 1, ok: 1
  };
  function card(titleVi, accentColor) {
    var cls = 'card';
    if (accentColor && ACCENTS[accentColor]) cls += ' accent-' + accentColor;
    var node = el('div', { class: cls });
    if (titleVi) node.appendChild(el('div', { class: 'card-title' }, titleVi));
    appendChildren(node, Array.prototype.slice.call(arguments, 2));
    return node;
  }

  /**
   * numberedList(items) — <ol class="num-list"> with gold circled numbers.
   * items: array of strings or Nodes.
   */
  function numberedList(items) {
    var ol = el('ol', { class: 'num-list' });
    (items || []).forEach(function (item) {
      ol.appendChild(el('li', null, item));
    });
    return ol;
  }

  /**
   * bulletList(items, color) — bullets colored via CSS var --bullet-color.
   */
  function bulletList(items, color) {
    var attrs = { class: 'bullet-list' };
    if (color) attrs.style = { '--bullet-color': color };
    var ul = el('ul', attrs);
    // CSS custom property via style object may not apply in older engines; set directly.
    if (color) ul.style.setProperty('--bullet-color', color);
    (items || []).forEach(function (item) {
      ul.appendChild(el('li', null, item));
    });
    return ul;
  }

  function primaryBtn(textVi, onclick) {
    return el('button', { class: 'btn-primary', type: 'button', onclick: onclick }, textVi);
  }

  function secondaryBtn(textVi, onclick) {
    return el('button', { class: 'btn-secondary', type: 'button', onclick: onclick }, textVi);
  }

  /**
   * chip(textVi, color) — pill chip; color adds a colored dot.
   */
  function chip(textVi, color) {
    var node = el('span', { class: 'chip' });
    if (color) {
      node.appendChild(el('span', { class: 'chip-dot', style: { background: color } }));
    }
    node.appendChild(document.createTextNode(textVi || ''));
    return node;
  }

  /**
   * timerRing(canvasEl, remainingSec, totalSec)
   * Draws only the ring (background circle + gold remaining arc), no text.
   * Caller overlays numbers with HTML. Handles devicePixelRatio.
   */
  function timerRing(canvasEl, remainingSec, totalSec) {
    if (!canvasEl || !canvasEl.getContext) return;
    var dpr = window.devicePixelRatio || 1;
    var rect = canvasEl.getBoundingClientRect();
    var cssW = rect.width || canvasEl.width / dpr || 200;
    var cssH = rect.height || canvasEl.height / dpr || cssW;
    var pxW = Math.round(cssW * dpr);
    var pxH = Math.round(cssH * dpr);
    if (canvasEl.width !== pxW || canvasEl.height !== pxH) {
      canvasEl.width = pxW;
      canvasEl.height = pxH;
    }
    var ctx = canvasEl.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pxW, pxH);
    ctx.scale(dpr, dpr);

    var cx = cssW / 2;
    var cy = cssH / 2;
    var lineW = Math.max(8, Math.min(cssW, cssH) * 0.07);
    var radius = Math.min(cssW, cssH) / 2 - lineW / 2 - 2;
    if (radius <= 0) return;

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#2C3545';
    ctx.lineWidth = lineW;
    ctx.stroke();

    // Remaining arc (gold), from 12 o'clock, clockwise
    var frac = 0;
    if (totalSec > 0) frac = Math.max(0, Math.min(1, remainingSec / totalSec));
    if (frac > 0) {
      var start = -Math.PI / 2;
      var end = start + Math.PI * 2 * frac;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, end);
      ctx.strokeStyle = '#F5C542';
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(245, 197, 66, 0.45)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  /**
   * statPill(labelVi, value)
   */
  function statPill(labelVi, value) {
    return el('div', { class: 'stat-pill' },
      el('div', { class: 'stat-value' }, String(value)),
      el('div', { class: 'stat-label' }, labelVi || '')
    );
  }

  /**
   * fmtTime(sec) -> 'M:SS'  (fmtTime(125) === '2:05')
   */
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' + s : String(s));
  }

  window.UI = {
    el: el,
    topbar: topbar,
    card: card,
    numberedList: numberedList,
    bulletList: bulletList,
    primaryBtn: primaryBtn,
    secondaryBtn: secondaryBtn,
    chip: chip,
    timerRing: timerRing,
    statPill: statPill,
    fmtTime: fmtTime
  };
})();
