(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR = 750;
  var EASE = 'cubic-bezier(.75,0,.2,1)';
  var FULL_POLY = 'polygon(0% 0%,100% 0%,100% 100%,0% 100%)';
  var TRI_POLY = 'polygon(50% 0%,50% 0%,100% 100%,0% 100%)';

  var ov = document.createElement('div');
  ov.id = 'morph';
  document.body.appendChild(ov);

  // ---- shape helpers: every shape has a "small" look and a "full-screen" look ----
  function look(shape, full) {
    if (shape === 'triangle') return { borderRadius: '0%', clipPath: full ? FULL_POLY : TRI_POLY };
    if (shape === 'circle') return { borderRadius: full ? '0%' : '50%', clipPath: FULL_POLY };
    return { borderRadius: full ? '0px' : '10px', clipPath: FULL_POLY };
  }
  function frame(rect, shape, full) {
    var l = look(shape, full);
    return {
      left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px',
      borderRadius: l.borderRadius, clipPath: l.clipPath
    };
  }
  var VIEW = function () { return { left: 0, top: 0, width: innerWidth, height: innerHeight }; };
  var CENTER = function () { return { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 }; };

  // ---- leaving: shape grows from the clicked element until it fills the screen ----
  function leave(el, href) {
    var shape = el.getAttribute('data-shape') || 'square';
    var color = el.getAttribute('data-color') || '#ed1b76';
    var target = el.querySelector('.glyph') || el;
    var rect = target.getBoundingClientRect();
    ov.style.background = color;
    ov.style.display = 'block';
    var a = ov.animate([frame(rect, shape, false), frame(VIEW(), shape, true)], { duration: DUR, easing: EASE, fill: 'forwards' });
    a.onfinish = function () {
      try { sessionStorage.setItem('morph', JSON.stringify({ shape: shape, color: color })); } catch (e) { }
      location.href = href;
    };
  }

  // ---- arriving: full-screen shape shrinks to the centre and disappears ----
  function arrive() {
    var data = null;
    try { data = JSON.parse(sessionStorage.getItem('morph') || 'null'); sessionStorage.removeItem('morph'); } catch (e) { }
    var root = document.documentElement;
    if (!data) { root.classList.remove('arriving'); return; }
    ov.style.background = data.color;
    ov.style.display = 'block';
    root.classList.remove('arriving');
    if (reduce) { ov.style.display = 'none'; return; }
    var a = ov.animate([frame(VIEW(), data.shape, true), frame(CENTER(), data.shape, false)], { duration: DUR, easing: EASE, fill: 'forwards' });
    a.onfinish = function () { ov.style.display = 'none'; };
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-morph]');
    if (!el) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    var href = el.getAttribute('href');
    if (reduce) { location.href = href; return; }
    leave(el, href);
  });

  // coming back with the browser's Back button
  addEventListener('pageshow', function (e) { if (e.persisted) { ov.style.display = 'none'; document.documentElement.classList.remove('arriving'); } });

  arrive();

  // ---- photo slots: show a labelled placeholder until you add your real picture ----
  function makeSlot(img) {
    if (img.dataset.done) return;
    img.dataset.done = '1';
    var s = document.createElement('div');
    s.className = 'slot';
    s.innerHTML = '<div><b>Add your photo</b>' + (img.getAttribute('src') || '') + '</div>';
    img.replaceWith(s);
  }
  document.querySelectorAll('.photo img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) makeSlot(img);
    img.addEventListener('error', function () { makeSlot(img); });
  });

  // ---- joke reveal ----
  document.querySelectorAll('.joke button').forEach(function (b) {
    b.addEventListener('click', function () {
      var j = b.closest('.joke');
      var open = j.classList.toggle('open');
      b.textContent = open ? 'HIDE' : 'REVEAL';
    });
  });
})();

/* ---------- UX upgrade ---------- */
(function () {
  var d = document, body = d.body;
  var PAGES = ['childhood', 'family', 'friends', 'love', 'food', 'movie', 'song', 'jokes'];
  var NAMES = ['Childhood', 'Family', 'Friends', 'Love', 'Food', 'Movie', 'Song', 'Jokes'];
  var cur = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');

  // reading progress bar
  var bar = d.createElement('div'); bar.id = 'progress'; body.appendChild(bar);
  function prog() { var h = d.documentElement.scrollHeight - innerHeight; bar.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%'; }
  addEventListener('scroll', prog, { passive: true }); prog();

  // round navigator (jump to any round)
  var top = d.querySelector('.topbar');
  if (top && PAGES.indexOf(cur) > -1) {
    var nav = d.createElement('nav'); nav.className = 'rounds'; nav.setAttribute('aria-label', 'Jump to a round');
    PAGES.forEach(function (p, i) {
      var a = d.createElement('a'); a.href = p + '.html'; a.textContent = i + 1;
      a.title = NAMES[i]; a.setAttribute('aria-label', 'Round ' + (i + 1) + ': ' + NAMES[i]);
      if (p === cur) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    top.after(nav);
  }

  // gentle reveal on scroll
  var items = d.querySelectorAll('.photo,.panel,.joke,.tile');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .1 });
    items.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  // photo lightbox
  var shots = [].slice.call(d.querySelectorAll('.photo'));
  if (shots.length) {
    var lb = d.createElement('div'); lb.id = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = '<button class="x" aria-label="Close">✕</button><button class="pv" aria-label="Previous photo">◀</button><img alt=""><p></p><button class="nx" aria-label="Next photo">▶</button>';
    body.appendChild(lb);
    var idx = 0, im = lb.querySelector('img'), cp = lb.querySelector('p');
    function show(i) {
      idx = (i + shots.length) % shots.length;
      var s = shots[idx], src = s.querySelector('img');
      if (!src) return;
      im.src = src.src; im.alt = src.alt; cp.textContent = s.querySelector('figcaption').textContent;
    }
    function close() { lb.classList.remove('open'); }
    shots.forEach(function (s, i) { s.addEventListener('click', function () { if (!s.querySelector('img')) return; show(i); lb.classList.add('open'); lb.querySelector('.x').focus(); }); });
    lb.querySelector('.x').onclick = close;
    lb.querySelector('.pv').onclick = function () { show(idx - 1); };
    lb.querySelector('.nx').onclick = function () { show(idx + 1); };
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  }

  // keyboard: Esc/arrows in lightbox, arrows to flip rounds
  d.addEventListener('keydown', function (e) {
    var lbo = d.getElementById('lb');
    if (lbo && lbo.classList.contains('open')) {
      if (e.key === 'Escape') lbo.classList.remove('open');
      if (e.key === 'ArrowLeft') lbo.querySelector('.pv').click();
      if (e.key === 'ArrowRight') lbo.querySelector('.nx').click();
      return;
    }
    if (/^(VIDEO|AUDIO|INPUT|TEXTAREA)$/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
    var links = d.querySelectorAll('.pager a');
    if (links.length < 2) return;
    if (e.key === 'ArrowLeft') links[0].click();
    if (e.key === 'ArrowRight') links[links.length - 1].click();
  });
  var pg = d.querySelector('.pager');
  if (pg) { var h = d.createElement('p'); h.className = 'hint-keys'; h.textContent = 'Tip: use the ← → arrow keys to move between rounds'; pg.after(h); }

  // joke buttons: announce state
  d.querySelectorAll('.joke button').forEach(function (b) {
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', function () { b.setAttribute('aria-expanded', b.closest('.joke').classList.contains('open')); });
  });
})();