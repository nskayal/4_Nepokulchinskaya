import {ZONES,getZone,money} from './data.js';
import {createFilters} from './filters.js';
import {createBeachMap} from './map.js';
import {loadBookings,getBookings,occupied,createBooking,cancelBooking,resetBookings} from './booking.js';

const $ = selector => document.querySelector(selector);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#ic-${name}"/></svg>`;
const state={selectedId:'g02',guests:2,days:1,sort:'default',view:'map',modalAction:null};
let busy=false;
let previousFocus=null;

const storage=loadBookings();
const filters=createFilters({onChange:handleFilterChange,onSubmit:showFilterResults});
const map=createBeachMap({onSelect:selectZone,isOccupied:occupied});

function toast(message,type='ok'){
  const root=$('#toast-stack');
  const el=document.createElement('div');
  el.className=`toast ${type==='error'?'toast--error':''}`;
  el.innerHTML=`${icon(type==='error'?'info':'check')}<span></span><button type="button" aria-label="Закрыть уведомление">${icon('close')}</button>`;
  el.querySelector('span').textContent=message;
  el.querySelector('button').addEventListener('click',()=>el.remove(),{once:true});
  root.append(el);
  setTimeout(()=>el.remove(),5400);
}
if(!storage.ok)toast('Сохранённые бронирования недоступны. Новые брони возможны только при доступном хранилище.','error');
else if(storage.corrupted)toast('Некорректные записи бронирований пропущены.','error');

function filteredZones(){return ZONES.filter(zone=>filters.match(zone));}
function updateCounters(){
  const count=getBookings().length;
  $('#header-bookings').textContent=String(count);
  $('#drawer-count').textContent=String(count);
}
function handleFilterChange(){
  if(state.selectedId&&!filters.match(getZone(state.selectedId))){state.selectedId=null;}
  render();
}
function showFilterResults(){
  const found=filteredZones().length;
  if(matchMedia('(max-width:620px)').matches)closeMobileFilters();
  toast(found===0?'По этим условиям мест не найдено.':`Показано ${found} ${declinePlaces(found)}.`);
}
function declinePlaces(n){return n%10===1&&n%100!==11?'место':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'места':'мест';}
function selectZone(id,source='card'){
  const zone=getZone(id);
  if(!zone)return;
  if(!filters.match(zone)){toast('Место не подходит под выбранные фильтры.','error');return;}
  state.selectedId=id;
  state.guests=Math.min(zone.capacity,Math.max(1,filters.state.guests));
  state.days=1;
  
  render();
  if(source==='card'){
    map.focusZone(zone);
    $('#beach-map').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
}
function render(){
  const visible=filteredZones();
  const visibleIds=new Set(visible.map(z=>z.id));
  map.update({selectedId:state.selectedId,visibleIds});
  $('#filter-count').textContent=`Найдено ${visible.length} ${declinePlaces(visible.length)}`;
  $('#result-summary').textContent=`${visible.length} ${declinePlaces(visible.length)}`;
  updateCounters();
  renderSelection();
  renderCatalog(visible);
}
function renderSelection(){
  const node=$('#selection-panel');
  const zone=getZone(state.selectedId);
  if(!zone){
    node.innerHTML=`<div class="selection-placeholder"><div class="selection-placeholder__icon">${icon('map')}</div><div><h3>Выберите место на карте</h3><p>Нажмите на маркер или выберите зону из каталога, чтобы узнать подробности.</p><span class="arrow-hint">15 МЕСТ ДЛЯ ОТДЫХА →</span></div></div>`;
    return;
  }
  const booked=occupied(zone.id);
  const guestsValid=Number.isInteger(state.guests)&&state.guests>=1&&state.guests<=zone.capacity;
  const daysValid=Number.isInteger(state.days)&&state.days>=1&&state.days<=30;
  const error=!guestsValid?`Допустимо от 1 до ${zone.capacity} гостей.`:!daysValid?'Допустимо от 1 до 30 дней.':'';
  const photo=zone.photo;
  node.innerHTML=`<div class="selection-full">
    <div class="selection-image-wrap"><img src="${photo}" alt="${zone.name} — зона отдыха на пляже" fetchpriority="low"><span class="selection-image-shade"></span>
      <button class="selection-close" type="button" data-action="close-selection" aria-label="Закрыть информацию о месте">${icon('close')}</button>
    </div>
    <div class="selection-content">
      <div class="selection-name-row"><h2>${zone.name}</h2><span class="status-pill ${booked?'status-pill--booked':''}">${booked?'Занято':'Свободно'}</span></div>
      <div class="selection-meta"><span>${icon('user')} До ${zone.capacity} гостей</span><span>${icon('umbrella')} ${zone.typeLabel}</span></div>
      <p class="selection-description">${zone.description}</p>
      <div class="feature-pills">${zone.features.map(f=>`<span>${f}</span>`).join('')}</div>
      <div class="selection-divider"></div>
      <div class="price-main"><strong>${money(zone.price)}</strong><span>/ день</span></div>
      <div class="selection-controls">
        <div class="control-group"><label>Количество гостей</label><div class="stepper"><button type="button" data-action="guest-minus" aria-label="Уменьшить количество гостей" ${state.guests<=1?'disabled':''}>${icon('minus')}</button><output aria-live="polite">${state.guests}</output><button type="button" data-action="guest-plus" aria-label="Увеличить количество гостей" ${state.guests>=zone.capacity?'disabled':''}>${icon('plus')}</button></div><div class="control-hint">До ${zone.capacity} гостей</div></div>
        <div class="control-group"><label>Количество дней</label><div class="stepper"><button type="button" data-action="days-minus" aria-label="Уменьшить количество дней" ${state.days<=1?'disabled':''}>${icon('minus')}</button><output aria-live="polite">${state.days}</output><button type="button" data-action="days-plus" aria-label="Увеличить количество дней" ${state.days>=30?'disabled':''}>${icon('plus')}</button></div><div class="control-hint">От 1 до 30 дней</div></div>
      </div>
      <div class="selection-error" role="status">${error}</div>
      <div class="price-total-row"><span>Итого</span><strong>${money(zone.price*state.days)}</strong></div>
      <button class="btn btn--accent btn--full selection-book" type="button" data-action="book" ${(booked||error)?'disabled':''}>${icon(booked?'lock':'calendar')} ${booked?'Место занято':'Забронировать'} ${booked?'':icon('arrow-right').replace('class="icon"','class="icon icon--right"')}</button>
    </div>
  </div>`;
}
function renderCatalog(visible){
  const list=[...visible];
  if(state.sort==='asc')list.sort((a,b)=>a.price-b.price);
  if(state.sort==='desc')list.sort((a,b)=>b.price-a.price);
  if(state.sort==='capacity')list.sort((a,b)=>b.capacity-a.capacity||a.price-b.price);
  $('#catalog-grid').innerHTML=list.map(zone=>{
    const booked=occupied(zone.id),selected=state.selectedId===zone.id;
    return `<article class="zone-card ${booked?'is-booked':''} ${selected?'is-selected':''}">
      <div class="zone-card__image"><img loading="lazy" src="${zone.photo}" alt="${zone.name} — фотография зоны отдыха">
        <span class="card-status ${booked?'is-booked':''}"><i></i>${booked?'Занято':'Свободно'}</span></div>
      <div class="zone-card__body"><h3 class="zone-card__title">${zone.name}</h3><div class="zone-card__meta"><span>${icon('user')} До ${zone.capacity} гостей</span><span>${icon('umbrella')} ${zone.typeLabel}</span></div>
      <div class="zone-card__features">${zone.features.join(' · ')}</div>
      <div class="zone-card__bottom"><span class="zone-card__price">${money(zone.price)} <small>/ день</small></span></div>
      <button type="button" class="zone-card__select" data-select="${zone.id}" aria-label="${booked?'Посмотреть занятую зону':'Выбрать'} ${zone.name}">${selected?'Выбрано':booked?'Посмотреть':'Выбрать место'}</button>
      </div></article>`;
  }).join('');
  $('#catalog-empty').hidden=list.length!==0;
  $('#catalog-grid').hidden=list.length===0;
}
function renderBookings(){
  const list=$('#bookings-list');
  const entries=getBookings();
  $('#clear-bookings').hidden=entries.length===0;
  if(!entries.length){
    list.innerHTML=`<div class="bookings-empty"><span class="empty-icon">${icon('bag')}</span><h3>Пока нет бронирований</h3><p>Выберите место на карте — и оно появится здесь.</p><button type="button" class="btn btn--accent" data-action="close-bookings">Вернуться к карте ${icon('arrow-right')}</button></div>`;
    return;
  }
  list.innerHTML=entries.map(entry=>{
    const zone=getZone(entry.zoneId);
    if(!zone)return '';
    return `<article class="booking-entry"><img src="${zone.photo}" alt="${zone.name}">
      <div class="booking-entry__content"><h3>${zone.name}</h3><div class="booking-entry__num">Бронь № ${entry.id}</div>
        <div class="booking-entry__meta">${icon('user')} ${entry.guests} гостей · ${entry.days} дн.</div><div class="booking-entry__price">${money(entry.total)}</div>
        <div class="booking-entry__bottom"><span class="status-pill">Активна</span><button type="button" data-cancel-id="${entry.id}">Отменить</button></div></div></article>`;
  }).join('');
}
function showDrawer(){
  closeMobileFilters();
  previousFocus=document.activeElement;
  renderBookings();
  $('#drawer-overlay').hidden=false;
  $('#bookings-drawer').hidden=false;
  document.body.style.overflow='hidden';
  $('#bookings-drawer [data-action="close-bookings"]').focus();
}
function closeDrawer(){
  $('#drawer-overlay').hidden=true;
  $('#bookings-drawer').hidden=true;
  if($('#modal-backdrop').hidden)document.body.style.overflow='';
  previousFocus?.focus?.();previousFocus=null;
}
function showModal(html,action=null){
  state.modalAction=action;
  previousFocus=document.activeElement;
  $('#modal').innerHTML=html;
  $('#modal-backdrop').hidden=false;
  document.body.style.overflow='hidden';
  $('#modal').focus();
}
function closeModal(){
  $('#modal-backdrop').hidden=true;
  $('#modal').innerHTML='';
  state.modalAction=null;
  if($('#bookings-drawer').hidden)document.body.style.overflow='';
  previousFocus?.focus?.();previousFocus=null;
}
function confirmModal({title,text,yes='Подтвердить',onConfirm}){
  showModal(`<div class="modal__warn-icon">${icon('info')}</div><h2 id="modal-title">${title}</h2><p>${text}</p><div class="modal__actions"><button class="btn btn--light" type="button" data-action="modal-close">Назад</button><button class="btn btn--danger" type="button" data-action="modal-confirm">${yes}</button></div>`,onConfirm);
}
function bookSelected(){
  if(busy)return;
  const zone=getZone(state.selectedId);
  if(!zone){toast('Выберите место на карте.','error');return;}
  busy=true;
  try{
    const result=createBooking(zone.id,state.guests,state.days);
    if(!result.ok){toast(result.error,'error');render();return;}
    const entry=result.entry;
    render();
    showModal(`<div class="modal__success-icon">${icon('check')}</div><span class="eyebrow">ВАШ ОТДЫХ ЗАПЛАНИРОВАН</span><h2 id="modal-title">Бронирование оформлено</h2><p>Место закреплено за вами в рамках учебного демо.</p>
      <div class="modal__booking-info"><div><span>Место</span><strong>${zone.name}</strong></div><div><span>Номер брони</span><strong>${entry.id}</strong></div><div><span>Гости</span><strong>${entry.guests}</strong></div><div><span>Дней</span><strong>${entry.days}</strong></div><div><span>Итого</span><strong>${money(entry.total)}</strong></div></div>
      <button class="btn btn--accent btn--full" type="button" data-action="modal-show-bookings">Мои брони ${icon('arrow-right')}</button><button class="btn btn--ghost btn--full modal-secondary" type="button" data-action="modal-close">Вернуться к карте</button>`);
  }finally{busy=false;}
}
function adjustSelection(field,amount){
  const zone=getZone(state.selectedId);if(!zone)return;
  if(field==='guests')state.guests=Math.max(1,Math.min(zone.capacity,state.guests+amount));
  else state.days=Math.max(1,Math.min(30,state.days+amount));
  const action=`${field==='guests'?'guest':'days'}-${amount>0?'plus':'minus'}`;
  renderSelection();
  const next=$(`#selection-panel [data-action=\"${action}\"]`);
  if(next&&!next.disabled)next.focus({preventScroll:true});
}
function toggleMobileFilters(){
  const panel=$('#filters-panel');
  const open=!panel.classList.contains('is-mobile-open');
  panel.classList.toggle('is-mobile-open',open);
  $('#mobile-filter-button').setAttribute('aria-expanded',String(open));
}
function closeMobileFilters(){
  $('#filters-panel').classList.remove('is-mobile-open');
  $('#mobile-filter-button').setAttribute('aria-expanded','false');
}
function switchView(view){
  if(!['map','list'].includes(view))return;
  state.view=view;
  $('.catalog-section').classList.toggle('list-view',view==='list');
  document.querySelectorAll('[data-view]').forEach(button=>{
    button.classList.toggle('is-active',button.dataset.view===view);
    button.setAttribute('aria-pressed',String(button.dataset.view===view));
  });
  if(view==='map')$('#beach-map').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}

document.addEventListener('click',e=>{
  const cardSelect=e.target.closest('[data-select]');
  if(cardSelect){selectZone(cardSelect.dataset.select);return;}
  const cancel=e.target.closest('[data-cancel-id]');
  if(cancel){
    const id=cancel.dataset.cancelId;
    confirmModal({title:'Отменить бронь?',text:`Бронь № ${id} будет отменена, а место снова станет доступно.`,yes:'Отменить бронь',onConfirm:()=>{
      const result=cancelBooking(id);closeModal();
      if(!result.ok)toast(result.error,'error');else{render();renderBookings();toast('Бронь отменена. Место снова доступно.');}
    }});return;
  }
  const view=e.target.closest('[data-view]');
  if(view){switchView(view.dataset.view);return;}
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  switch(action){
    case 'show-bookings':showDrawer();break;
    case 'close-bookings':closeDrawer();break;
    case 'toggle-filters':toggleMobileFilters();break;
    case 'reset-filters':filters.reset();toast('Фильтры сброшены.');break;
    case 'filter-guests-minus':filters.setGuests(filters.state.guests-1);break;
    case 'filter-guests-plus':filters.setGuests(filters.state.guests+1);break;
    case 'close-selection':state.selectedId=null;render();break;
    case 'guest-minus':adjustSelection('guests',-1);break;
    case 'guest-plus':adjustSelection('guests',1);break;
    case 'days-minus':adjustSelection('days',-1);break;
    case 'days-plus':adjustSelection('days',1);break;
    case 'book':bookSelected();break;
    case 'modal-close':closeModal();break;
    case 'modal-show-bookings':closeModal();showDrawer();break;
    case 'modal-confirm':{
      const callback=state.modalAction;
      if(typeof callback==='function'){state.modalAction=null;callback();}
      break;
    }
    case 'reset-bookings':confirmModal({title:'Сбросить бронирования?',text:'Все созданные в этом браузере демонстрационные брони будут удалены. Предустановленные занятые места останутся занятыми.',yes:'Сбросить',onConfirm:()=>{
      const result=resetBookings();closeModal();
      if(!result.ok)toast(result.error,'error');else{render();renderBookings();toast('Демонстрационные бронирования сброшены.');}
    }});break;
    case 'toggle-menu':{
      const menu=$('#main-nav'),button=$('.mobile-menu-button');
      const open=!menu.classList.contains('is-open');menu.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open));
      break;
    }
  }
});
$('#main-nav').addEventListener('click',e=>{
  if(e.target.closest('a')){$('#main-nav').classList.remove('is-open');$('.mobile-menu-button').setAttribute('aria-expanded','false');}
});
$('#sort-select').addEventListener('change',e=>{state.sort=e.target.value;renderCatalog(filteredZones());});
$('#drawer-overlay').addEventListener('click',closeDrawer);
$('#modal-backdrop').addEventListener('click',e=>{if(e.target===$('#modal-backdrop'))closeModal();});
function trapFocus(e,root){
  const focusable=[...root.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);
  if(!focusable.length){e.preventDefault();root.focus();return;}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&(document.activeElement===first||document.activeElement===root)){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(!$('#modal-backdrop').hidden)closeModal();
    else if(!$('#bookings-drawer').hidden)closeDrawer();
    else{closeMobileFilters();$('#main-nav').classList.remove('is-open');$('.mobile-menu-button').setAttribute('aria-expanded','false');}
  }
  if(e.key==='Tab'){
    if(!$('#modal-backdrop').hidden)trapFocus(e,$('#modal'));
    else if(!$('#bookings-drawer').hidden)trapFocus(e,$('#bookings-drawer'));
  }
});
render();
