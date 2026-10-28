import { ZONES, ZONE_TYPES, PRICE_MAX, PRICE_MIN } from './data.js';

export function createFilters({onChange, onSubmit}) {
  const state = {type: 'all', guests: 2, maxPrice: PRICE_MAX};
  const buttons = document.getElementById('filter-types');
  const tabs = document.getElementById('catalog-tabs');
  const range = document.getElementById('price-range');
  const count = document.getElementById('filter-guests');
  const priceDisplay = document.getElementById('price-display');
  const form = document.getElementById('filters-panel');
  const maxGuests = Math.max(...ZONES.map(zone => zone.capacity));
  const counts = Object.fromEntries(ZONE_TYPES.map(type => [type.id,
    type.id === 'all' ? ZONES.length : ZONES.filter(zone => zone.type === type.id).length
  ]));
  function update() {
    for (const root of [buttons, tabs]) {
      root.querySelectorAll('[data-type]').forEach(button => {
        const active = button.dataset.type === state.type;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }
    count.textContent = String(state.guests);
    priceDisplay.textContent = state.maxPrice.toLocaleString('ru-RU') + ' ₽';
    range.value = String(state.maxPrice);
    range.style.setProperty('--range-fill', `${100 * (state.maxPrice - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)}%`);
  }
  function setType(type) {
    if (!ZONE_TYPES.some(zone => zone.id === type)) return;
    state.type = type; update(); onChange();
  }
  function setGuests(value) {
    state.guests = Math.max(1, Math.min(maxGuests, value)); update(); onChange();
  }
  function setMaxPrice(value) {
    state.maxPrice = Math.max(PRICE_MIN, Math.min(PRICE_MAX, Number(value) || PRICE_MIN));
    update(); onChange();
  }
  function reset() {state.type = 'all'; state.guests = 2; state.maxPrice = PRICE_MAX; update(); onChange();}
  buttons.innerHTML = ZONE_TYPES.map(type => `<button type="button" data-type="${type.id}" aria-pressed="false">${type.label}</button>`).join('');
  tabs.innerHTML = ZONE_TYPES.map(type => `<button type="button" data-type="${type.id}" aria-pressed="false">${type.label}<span class="count">${counts[type.id]}</span></button>`).join('');
  const typeClick = event => {
    const button = event.target.closest('[data-type]');
    if (button) setType(button.dataset.type);
  };
  buttons.addEventListener('click', typeClick);
  tabs.addEventListener('click', typeClick);
  range.addEventListener('input', () => setMaxPrice(range.value));
  form.addEventListener('submit', event => {event.preventDefault(); onSubmit();});
  update();
  return {state, setType, setGuests, setMaxPrice, reset,
    match(zone) {
      return (state.type === 'all' || zone.type === state.type) &&
        zone.capacity >= state.guests && zone.price <= state.maxPrice;
    }
  };
}
