/* Shared behavior for every page: sticky header, main menu, photo lightbox. */

/* Sticky header: measure its height for anchor offsets, and show a hairline once the page scrolls. */
(function(){
  var h = document.querySelector('.site-header'); if (!h) return;
  var root = document.documentElement;
  function size(){ root.style.setProperty('--header-h', h.offsetHeight + 'px'); }
  function stuck(){ h.classList.toggle('is-stuck', h.getBoundingClientRect().top <= 0 && window.scrollY > 0); }
  size(); stuck();
  window.addEventListener('resize', size);
  window.addEventListener('scroll', stuck, { passive:true });
})();

/* Main menu: dropdowns on desktop, a full menu panel on phones. */
(function(){
  var items = [].slice.call(document.querySelectorAll('.nav-item.has-menu'));
  function closeAll(except){
    items.forEach(function(it){
      if (it === except) return;
      it.classList.remove('open');
      var b = it.querySelector('.nav-top'); if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  items.forEach(function(it){
    var btn = it.querySelector('.nav-top');
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      // With a mouse, hovering already opened it, so a click keeps it open instead of toggling it shut.
      var open = matchMedia('(hover:hover)').matches ? true : !it.classList.contains('open');
      closeAll(it);
      it.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Hover opens on devices with a mouse.
    it.addEventListener('mouseenter', function(){ if (matchMedia('(hover:hover)').matches) { closeAll(it); it.classList.add('open'); btn.setAttribute('aria-expanded','true'); } });
    it.addEventListener('mouseleave', function(){ if (matchMedia('(hover:hover)').matches) { it.classList.remove('open'); btn.setAttribute('aria-expanded','false'); } });
  });
  document.addEventListener('click', function(){ closeAll(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { closeAll(); closePanel(); } });

  var toggle = document.querySelector('.menu-toggle');
  var panel = document.getElementById('mobile-menu');
  function closePanel(){
    if (!panel || !toggle) return;
    panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
  }
  if (toggle && panel) {
    toggle.addEventListener('click', function(e){
      e.stopPropagation();
      var open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.classList.toggle('menu-open', open);
    });
    panel.addEventListener('click', function(e){ if (e.target.closest('a')) closePanel(); });
  }
})();

/* Tap or click a photo to see it larger. */
(function(){
  var lb = document.createElement('dialog');
  if (!lb.showModal) return;
  lb.className = 'lightbox'; lb.id = 'lightbox'; lb.setAttribute('aria-label', 'Enlarged photo');
  lb.innerHTML = '<button class="lb-close" type="button" aria-label="Close"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#393939" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><img alt="">';
  document.body.appendChild(lb);
  var big = lb.querySelector('img');
  var sel = '.what-photo img, .t2-sticker, .t2-pol, #tiles .tile img, .gallery img, img.zoom';
  function open(img){
    big.src = img.currentSrc || img.src; big.alt = img.alt || '';
    lb.showModal();
  }
  function wire(img){
    if (img.dataset.zoom) return; img.dataset.zoom = '1';
    img.classList.add('zoomable');
    if (!img.closest('[aria-hidden="true"]')) {
      img.tabIndex = 0; img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Enlarge photo' + (img.alt ? ': ' + img.alt : ''));
    }
  }
  function wireAll(){ document.querySelectorAll(sel).forEach(wire); }
  wireAll();
  var tiles = document.getElementById('tiles');
  if (tiles) new MutationObserver(wireAll).observe(tiles, { childList:true });
  document.addEventListener('click', function(e){
    var img = e.target.closest && e.target.closest(sel);
    if (img && img.tagName === 'IMG') { e.preventDefault(); open(img); }
  });
  document.addEventListener('keydown', function(e){
    var a = document.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && a && a.matches && a.matches(sel)) { e.preventDefault(); open(a); }
  });
  lb.addEventListener('click', function(){ lb.close(); });
})();

/* Stage carousel: swipe on phones, arrows everywhere. */
(function(){
  document.querySelectorAll('.stage-carousel').forEach(function(c){
    var track = c.querySelector('.sc-track'), cards = [].slice.call(track.children);
    var prev = c.querySelector('.sc-prev'), next = c.querySelector('.sc-next'), count = c.querySelector('.sc-count');
    function current(){
      var left = track.scrollLeft, best = 0;
      cards.forEach(function(el, i){ if (Math.abs(el.offsetLeft - track.offsetLeft - left) < Math.abs(cards[best].offsetLeft - track.offsetLeft - left)) best = i; });
      return best;
    }
    function update(){
      var i = current(), atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      count.textContent = (atEnd ? cards.length : i + 1) + ' / ' + cards.length;
      prev.disabled = track.scrollLeft <= 4; next.disabled = atEnd;
    }
    function go(d){ var i = Math.max(0, Math.min(cards.length - 1, current() + d)); track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft, behavior: 'smooth' }); }
    prev.addEventListener('click', function(){ go(-1); });
    next.addEventListener('click', function(){ go(1); });
    track.addEventListener('scroll', function(){ requestAnimationFrame(update); }, { passive:true });
    track.addEventListener('keydown', function(e){ if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
    window.addEventListener('resize', update);
    update();
  });
})();
