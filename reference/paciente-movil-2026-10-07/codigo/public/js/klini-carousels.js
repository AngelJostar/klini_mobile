/* Shared presentation layer. Existing links, filters and service handlers remain in charge. */
(() => {
  'use strict';
  const families = [
    ['.unit-service-carousel-card', '.unit-service-carousel', '.unit-service-carousel-button'],
    ['.institution-service-carousel-card', '.institution-service-carousel', '.institution-service-carousel-button'],
    ['.operational-oncology-carousel', '.operational-oncology-carousel-track', '.operational-oncology-filter'],
    ['.import-action-carousel', '.import-carousel-track', '.import-carousel-item'],
  ];
  const assets = {
    catalog: ['01_catalogo.png', 403, 507, 85, 60, 235, 245],
    consultation: ['02_consulta_externa.png', 442, 540, 80, 95, 290, 255],
    nutrition: ['03_nutricion_parenteral.png', 378, 506, 95, 35, 220, 280],
    chemo: ['04_quimioterapia.png', 387, 506, 100, 35, 225, 285],
    import: ['05_importacion_medicamentos.png', 403, 506, 75, 50, 270, 260],
    delivery: ['06_pedido_entrega_medicamentos.png', 408, 507, 40, 80, 335, 230],
  };
  const assetRoot = new URL('../brand/klini/carousel/', document.currentScript.src);
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function artFor(label) {
    const text = normalize(label);
    if (/nutri|parenteral/.test(text)) return assets.nutrition;
    if (/quimio|oncolo|infusion/.test(text)) return assets.chemo;
    if (/importa|aduana/.test(text)) return assets.import;
    if (/pedido|entrega|envio|ruta/.test(text)) return assets.delivery;
    if (/consulta|medico/.test(text)) return assets.consultation;
    if (/catalogo|todos|todas|servicios/.test(text)) return assets.catalog;
    return null;
  }
  const decorate = () => families.forEach(([wrapperSelector, trackSelector, tileSelector]) => {
    document.querySelectorAll(wrapperSelector).forEach(wrapper => {
      if (wrapper.classList.contains('klini-carousel')) return;
      const track = wrapper.querySelector(trackSelector);
      const tiles = track ? [...track.querySelectorAll(tileSelector)] : [];
      if (!tiles.length) return;
      document.body.classList.add('klini-carousels-enabled');
      wrapper.classList.add('klini-carousel');
      wrapper.dataset.kliniCount = String(tiles.length);
      track.classList.add('klini-carousel-track');
      const controls = [...wrapper.querySelectorAll(':scope > button')];
      controls.forEach(button => button.classList.add('klini-carousel-control'));
      tiles.forEach(tile => {
        const title = tile.querySelector('strong') || tile.querySelector(':scope > span:last-child');
        const label = title?.textContent.trim() || tile.textContent.trim();
        tile.classList.add('klini-carousel-tile');
        if (title) title.classList.add('klini-carousel-label');
        const art = artFor(label);
        if (art) {
          const [file, width, height, x, y, cropWidth, cropHeight] = art;
          const frame = document.createElement('span');
          frame.className = 'klini-carousel-art';
          frame.setAttribute('aria-hidden', 'true');
          frame.style.aspectRatio = `${cropWidth}/${cropHeight}`;
          const img = document.createElement('img');
          img.src = new URL(file, assetRoot).href;
          img.alt = '';
          img.draggable = false;
          img.style.cssText = `width:${width / cropWidth * 100}%;height:${height / cropHeight * 100}%;left:${-x / cropWidth * 100}%;top:${-y / cropHeight * 100}%;`;
          frame.append(img);
          tile.prepend(frame);
          tile.classList.add('klini-carousel-has-art');
        }
        const badge = document.createElement('span');
        badge.className = 'klini-carousel-badge';
        badge.textContent = 'En uso';
        badge.setAttribute('aria-hidden', 'true');
        const arrow = document.createElement('span');
        arrow.className = 'klini-carousel-enter';
        arrow.textContent = '→';
        arrow.setAttribute('aria-hidden', 'true');
        tile.append(badge, arrow);
      });
      const indicators = document.createElement('div');
      indicators.className = 'klini-carousel-indicators';
      indicators.setAttribute('role', 'group');
      indicators.setAttribute('aria-label', 'Opciones del carrusel');
      const dots = tiles.map((tile, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'klini-carousel-indicator';
        dot.setAttribute('aria-label', `Mostrar ${tile.querySelector('.klini-carousel-label')?.textContent.trim() || `opción ${index + 1}`}`);
        dot.addEventListener('click', () => {
          track.scrollTo({ left: tile.offsetLeft - track.offsetLeft - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
          tile.focus({ preventScroll: true });
        });
        indicators.append(dot);
        return dot;
      });
      wrapper.append(indicators);
      const sync = () => {
        const active = tiles.findIndex(tile => tile.classList.contains('is-active'));
        dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === Math.max(0, active))));
      };
      new MutationObserver(sync).observe(track, { attributes: true, attributeFilter: ['class'], subtree: true });
      const syncEdges = () => {
        if (!track.clientWidth) return;
        if (controls[0]) controls[0].disabled = track.scrollLeft <= 1;
        if (controls[1]) controls[1].disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      };
      track.addEventListener('scroll', syncEdges, { passive: true });
      new ResizeObserver(syncEdges).observe(track);
      syncEdges();
      sync();
    });
  });
  decorate();
})();
