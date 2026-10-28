import { ZONES, MAP_SIZE, money } from './data.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lockIcon = '<svg class="icon" aria-hidden="true"><use href="#ic-lock"/></svg>';

export function createBeachMap({onSelect, isOccupied}) {
  const viewport = document.getElementById('map-viewport');
  const world = document.getElementById('map-world');
  const holder = document.getElementById('map-markers');
  const value = document.getElementById('zoom-value');
  const plus = document.getElementById('zoom-in');
  const minus = document.getElementById('zoom-out');
  let zoom = 1, offsetX = 0, offsetY = 0;
  let worldWidth = 0, worldHeight = 0;
  const pointers = new Map();
  let dragAnchor = null, lastPinch = null;

  // Markers share the original photograph's coordinate system, independently of cropping.
  holder.innerHTML = ZONES.map(zone => `
    <button type="button" class="map-marker" data-zone-id="${zone.id}"
      style="left:${zone.x}%;top:${zone.y}%" aria-label="${zone.name}, ${money(zone.price)} за день">
      <span class="map-marker__badge" aria-hidden="true">${zone.number}</span>
      <span class="map-marker__tooltip" aria-hidden="true"><b>${zone.name}</b>
        <em>${zone.typeLabel} · до ${zone.capacity} гостей</em><strong>${money(zone.price)} / день</strong>
        <small class="tooltip-status">Свободно</small></span>
    </button>`).join('');

  holder.addEventListener('click', event => {
    const marker = event.target.closest('[data-zone-id]');
    if (marker && !marker.classList.contains('is-filtered')) onSelect(marker.dataset.zoneId, 'map');
  });

  function calculateSize() {
    const rect = viewport.getBoundingClientRect();
    // Fit the original photograph within the map column without stretching it.
    // On large desktops, leave the nearest beach marker clear of the overlaid
    // filters; the same photo coordinates are used for all marker positions.
    let fitWidth = rect.width;
    const filterPanel = document.getElementById('filters-panel');
    if (filterPanel && window.innerWidth > 1320 && getComputedStyle(filterPanel).display !== 'none') {
      const leftmost = Math.min(...ZONES.map(zone => zone.x / 100));
      const filterRight = filterPanel.offsetLeft + filterPanel.offsetWidth + 26;
      const visibleLimit = (rect.width / 2 - filterRight) / (0.5 - leftmost);
      if (visibleLimit > 0) fitWidth = Math.min(fitWidth, visibleLimit);
    }
    const base = Math.min(fitWidth / MAP_SIZE.width, rect.height / MAP_SIZE.height);
    worldWidth = MAP_SIZE.width * base;
    worldHeight = MAP_SIZE.height * base;
    world.style.width = `${worldWidth}px`;
    world.style.height = `${worldHeight}px`;
    world.style.left = `${(rect.width - worldWidth) / 2}px`;
    world.style.top = `${(rect.height - worldHeight) / 2}px`;
  }
  function restrictPan() {
    const maxX = Math.max(0, (worldWidth * zoom - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (worldHeight * zoom - viewport.clientHeight) / 2);
    offsetX = clamp(offsetX, -maxX, maxX);
    offsetY = clamp(offsetY, -maxY, maxY);
  }
  function paint() {
    restrictPan();
    world.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${zoom})`;
    value.textContent = `${zoom.toFixed(1)}×`;
    plus.disabled = zoom >= 2.999;
    minus.disabled = zoom <= 1.001;
    viewport.style.touchAction = zoom > 1.001 ? 'none' : 'pan-y';
  }
  function setZoom(target, clientX, clientY) {
    const next = clamp(target, 1, 3);
    if (Math.abs(next - zoom) < .0001) return;
    const rect = viewport.getBoundingClientRect();
    const ax = clientX === undefined ? 0 : clientX - rect.left - rect.width / 2;
    const ay = clientY === undefined ? 0 : clientY - rect.top - rect.height / 2;
    const factor = next / zoom;
    offsetX = ax - (ax - offsetX) * factor;
    offsetY = ay - (ay - offsetY) * factor;
    zoom = next;
    paint();
  }
  function resetView() {zoom = 1; offsetX = 0; offsetY = 0; paint();}
  function resize() {
    const oldW = worldWidth, oldH = worldHeight;
    calculateSize();
    // Keep the same point of the photo at the visual center when resizing.
    if (oldW && oldH) {
      offsetX *= worldWidth / oldW;
      offsetY *= worldHeight / oldH;
    }
    paint();
  }
  plus.addEventListener('click', () => setZoom(zoom + .3));
  minus.addEventListener('click', () => setZoom(zoom - .3));
  document.getElementById('zoom-reset').addEventListener('click', resetView);
  viewport.addEventListener('wheel', event => {
    // Ordinary mouse-wheel and trackpad scrolling must scroll the page,
    // even when the pointer is over the beach map.
    // Zoom the map only with Ctrl/Cmd + wheel (also used for trackpad pinch).
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.target.closest('button, input, select, form, .glass-panel')) return;
    event.preventDefault();
    setZoom(zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12), event.clientX, event.clientY);
  }, {passive: false});

  function pinchData() {
    const points = [...pointers.values()];
    if (points.length < 2) return null;
    const [a,b] = points;
    return {distance: Math.hypot(b.x-a.x, b.y-a.y), x: (a.x+b.x)/2, y:(a.y+b.y)/2};
  }
  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('button,input,select,form,.glass-panel')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    try {viewport.setPointerCapture(event.pointerId);} catch {}
    if (pointers.size === 1) {
      dragAnchor = {x:event.clientX, y:event.clientY, ox:offsetX, oy:offsetY};
      viewport.classList.add('is-dragging');
    } else {
      lastPinch = pinchData();
      dragAnchor = null;
    }
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    if (pointers.size >= 2) {
      const now = pinchData();
      if (now && lastPinch && lastPinch.distance > 2) {
        setZoom(zoom * now.distance / lastPinch.distance, now.x, now.y);
        offsetX += now.x - lastPinch.x;
        offsetY += now.y - lastPinch.y;
        paint();
      }
      lastPinch = now;
    } else if (dragAnchor) {
      offsetX = dragAnchor.ox + event.clientX - dragAnchor.x;
      offsetY = dragAnchor.oy + event.clientY - dragAnchor.y;
      paint();
    }
  });
  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    try {if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);} catch {}
    lastPinch = null;
    if (pointers.size === 1) {
      const point = [...pointers.values()][0];
      dragAnchor = {x:point.x, y:point.y, ox:offsetX, oy:offsetY};
    } else if (!pointers.size) {
      dragAnchor = null;
      viewport.classList.remove('is-dragging');
    }
  }
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  viewport.addEventListener('lostpointercapture', endPointer);
  window.addEventListener('resize', resize);

  function update({selectedId, visibleIds}) {
    for (const node of holder.querySelectorAll('[data-zone-id]')) {
      const id = node.dataset.zoneId;
      const reserved = isOccupied(id);
      const selected = selectedId === id;
      const zone = ZONES.find(item => item.id === id);
      node.classList.toggle('is-selected', selected);
      node.classList.toggle('is-booked', reserved);
      node.classList.toggle('is-filtered', !visibleIds.has(id));
      node.querySelector('.map-marker__badge').innerHTML = reserved ? lockIcon : String(zone.number);
      node.querySelector('.tooltip-status').textContent = reserved ? 'Занято' : selected ? 'Выбрано' : 'Свободно';
      node.setAttribute('aria-label', `${zone.name}, ${money(zone.price)} за день, ${reserved ? 'занято' : 'свободно'}`);
      node.tabIndex = visibleIds.has(id) ? 0 : -1;
    }
    document.getElementById('map-count').textContent = `${visibleIds.size} МЕСТ`;
  }
  function focusZone(zone) {
    if (!worldWidth) resize();
    zoom = Math.max(1.3, zoom);
    // On desktop we center into the area that lies *between* the two panels.
    const desktop = window.matchMedia('(min-width:1101px)').matches;
    const targetX = desktop ? -25 : 0;
    const targetY = desktop ? 20 : 0;
    offsetX = targetX - (zone.x / 100 - .5) * worldWidth * zoom;
    offsetY = targetY - (zone.y / 100 - .5) * worldHeight * zoom;
    paint();
  }
  resize();
  return {update, focusZone, resetView};
}
