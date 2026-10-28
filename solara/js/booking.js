import { getZone, SEED_OCCUPIED } from './data.js';

const KEY = 'solara-bookings';
let bookings = [];
let storageError = null;

function isValidBooking(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const zone=getZone(value.zoneId);
  return Boolean(zone && typeof value.id==='string' && /^[\w-]{6,100}$/.test(value.id)
    && Number.isInteger(value.guests) && value.guests>=1 && value.guests<=zone.capacity
    && Number.isInteger(value.days) && value.days>=1 && value.days<=30
    && value.total===zone.price*value.days && typeof value.createdAt==='string');
}

export function loadBookings() {
  storageError=null;
  try {
    const raw=localStorage.getItem(KEY);
    if (!raw) {bookings=[];return {ok:true,corrupted:false};}
    const parsed=JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('invalid data format');
    const unique=new Set(),occupied=new Set();
    const valid=[];
    for(const item of parsed){
      if(!isValidBooking(item) || unique.has(item.id) || occupied.has(item.zoneId) || SEED_OCCUPIED.has(item.zoneId))continue;
      unique.add(item.id);occupied.add(item.zoneId);valid.push(item);
    }
    bookings=valid;
    return {ok:true,corrupted:valid.length!==parsed.length};
  } catch(error) {
    bookings=[];
    storageError='Хранилище недоступно или данные бронирований повреждены.';
    return {ok:false,corrupted:true,error:storageError};
  }
}

export function getBookings(){return [...bookings];}
export function occupied(zoneId){return SEED_OCCUPIED.has(zoneId)||bookings.some(b=>b.zoneId===zoneId);}
export function getStorageError(){return storageError;}
function persist(next) {
  try {localStorage.setItem(KEY,JSON.stringify(next));bookings=next;storageError=null;return {ok:true};}
  catch(error){storageError='Не удалось сохранить данные. Проверьте разрешения браузера и доступность localStorage.';return {ok:false,error:storageError};}
}
function makeId(){
  const raw=typeof crypto!=='undefined' && typeof crypto.randomUUID==='function'
    ?crypto.randomUUID().split('-')[0].toUpperCase()
    :`${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`.toUpperCase();
  return `SLR-${raw}`;
}
export function createBooking(zoneId,guests,days){
  const zone=getZone(zoneId);
  if(!zone)return {ok:false,error:'Выберите зону отдыха.'};
  if(occupied(zoneId))return {ok:false,error:'Место уже занято. Выберите другое.'};
  if(!Number.isInteger(guests)||guests<1||guests>zone.capacity)return {ok:false,error:`Допустимое количество гостей: от 1 до ${zone.capacity}.`};
  if(!Number.isInteger(days)||days<1||days>30)return {ok:false,error:'Выберите от 1 до 30 дней.'};
  let id=makeId();while(bookings.some(b=>b.id===id))id=makeId();
  const entry={id,zoneId,guests,days,total:zone.price*days,createdAt:new Date().toISOString()};
  const result=persist([...bookings,entry]);
  return result.ok?{ok:true,entry}:{ok:false,error:result.error};
}
export function cancelBooking(id){
  if(!bookings.some(b=>b.id===id))return {ok:false,error:'Бронь не найдена.'};
  return persist(bookings.filter(b=>b.id!==id));
}
export function resetBookings(){return persist([]);}
