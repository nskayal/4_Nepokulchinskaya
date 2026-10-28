// Одна модель данных для карты, каталога и бронирования.
// Координаты привязаны к исходному изображению 1536 × 864, а не к экрану.
const MAP_WIDTH = 1536;
const MAP_HEIGHT = 864;
export const MAP_SIZE = Object.freeze({width: MAP_WIDTH, height: MAP_HEIGHT});
const loungerImage = './assets/loungers.webp';
const cabanaImage = './assets/cabana.webp';

// Каждая точка установлена на существующий комплект зонта с двумя лежаками.
const loungers = [
  [1, 2000, 375, 260, ['Зонт', 'У воды', 'Мягкие матрасы']],
  [2, 2300, 447, 299, ['Зонт', 'Первая линия', 'Столик']],
  [3, 2500, 512, 330, ['Зонт', 'Вид на море', 'Столик']],
  [4, 2600, 564, 354, ['Зонт', 'Мягкие матрасы', 'У воды']],
  [5, 2800, 645, 391, ['Зонт', 'Первая линия', 'Столик']],
  [6, 2900, 719, 421, ['Зонт', 'Вид на море', 'Столик']],
  [7, 3000, 790, 455, ['Зонт', 'Мягкие матрасы', 'У воды']],
  [8, 3200, 869, 487, ['Зонт', 'Первая линия', 'Столик']],
  [9, 3300, 933, 518, ['Зонт', 'Мягкие матрасы', 'Вид на море']],
  [10, 3500, 1041, 564, ['Зонт', 'Первая линия', 'Вид на море']],
].map(([n, price, px, py, features]) => ({
  id: `l${String(n).padStart(2, '0')}`, number: n, type: 'lounger',
  typeLabel: 'Лежаки с зонтиком', name: `Лежаки №${n}`, price, capacity: 2,
  x: px / MAP_WIDTH * 100, y: py / MAP_HEIGHT * 100,
  features, photo: loungerImage, photos: [loungerImage],
  description: 'Два комфортных лежака с мягкими матрасами и просторным светлым зонтом. Ваше место рядом с морем для неспешного отдыха.'
}));

// Пять реально существующих павильонов на новой аэрофотографии.
const cabanas = [
  [1, 5000, 4, 516, 110, ['Тень', 'Уединение', 'Мягкие диваны']],
  [2, 6000, 4, 622, 251, ['Тень', 'Вид на море', 'Столик']],
  [3, 7000, 6, 747, 309, ['Тень', 'Мягкие диваны', 'Вид на море']],
  [4, 7900, 6, 866, 360, ['Приватность', 'Диваны', 'Столик']],
  [5, 9000, 6, 1045, 433, ['Приватность', 'Вид на море', 'Тень']],
].map(([n, price, capacity, px, py, features]) => ({
  id: `g${String(n).padStart(2, '0')}`, number: n, type: 'gazebo',
  typeLabel: 'Беседки', name: `Беседка №${n}`, price, capacity,
  x: px / MAP_WIDTH * 100, y: py / MAP_HEIGHT * 100,
  features, photo: cabanaImage, photos: [cabanaImage],
  description: 'Просторная приватная беседка с деревянным каркасом, лёгкими шторами и мягкими диванами. Идеальна для отдыха с близкими.'
}));

export const ZONES = Object.freeze([...loungers, ...cabanas].map(zone => Object.freeze(zone)));
export const SEED_OCCUPIED = new Set(['l04', 'l09', 'g03']);
export const ZONE_TYPES = Object.freeze([
  {id: 'all', label: 'Все зоны'},
  {id: 'lounger', label: 'Лежаки'},
  {id: 'gazebo', label: 'Беседки'},
]);
export const PRICE_MIN = 2000;
export const PRICE_MAX = 9000;
export const money = amount => `${Number(amount).toLocaleString('ru-RU')} ₽`;
export const getZone = id => ZONES.find(zone => zone.id === id) || null;
