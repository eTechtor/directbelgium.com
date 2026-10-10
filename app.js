const CATALOG_ROOT = 'public/catalog/';
const PAGE_SIZE = 12;
const CAD_ADDITION = 1600;
const NGN_PER_CAD = 953.055;
const FEATURED_VEHICLE_TITLES = [
  '2015 Nissan Altima 2.5',
  '2015 Chevrolet Equinox 1LT',
  '2015 Volkswagen Tiguan S',
  '2017 Mitsubishi i-MiEV ES',
  '2016 Hyundai Elantra GT',
  '2020 Tesla Model 3 Standard Range Plus',
  '2017 Chevrolet Volt LT'
];

const state = { all: [], filtered: [], visible: PAGE_SIZE, selected: null, photoIndex: 0 };
const products = document.querySelector('#products');
const resultCount = document.querySelector('#result-count');
const showMore = document.querySelector('#view-all');
const searchInput = document.querySelector('#inventory-search');
const makeFilter = document.querySelector('#make-filter');
const bodyFilter = document.querySelector('#body-filter');
const sortFilter = document.querySelector('#sort-filter');
const vehicleModal = document.querySelector('#vehicle-modal');
const vehicleContent = document.querySelector('#vehicle-content');
const heroCarLink = document.querySelector('[data-hero-car]');
const heroCarImage = document.querySelector('#hero-car-image');
const heroCarTitle = document.querySelector('#hero-car-title');
const heroCarPrice = document.querySelector('#hero-car-price');
const heroDots = document.querySelector('#hero-carousel-dots');
const heroVisual = document.querySelector('.hero-visual');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let heroCars = [];
let heroIndex = 0;
let heroTimer;

const clean = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);
const number = (value) => Number.parseInt(value, 10) || 0;
const ngn = (value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Math.round(value));
const adjustedCad = (car) => number(car.price_cad) + CAD_ADDITION;
const adjustedNgn = (car) => adjustedCad(car) * NGN_PER_CAD;
const integer = (value) => new Intl.NumberFormat('en-CA').format(number(value));
const photoUrl = (path) => /^https?:\/\//.test(path) ? path : `${CATALOG_ROOT}${path}`;
const drivetrain = (value) => ({
  AllWheelDriveConfiguration: 'All-wheel drive',
  FrontWheelDriveConfiguration: 'Front-wheel drive',
  RearWheelDriveConfiguration: 'Rear-wheel drive',
  FourWheelDriveConfiguration: 'Four-wheel drive'
})[value] || value;

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function populateFilters() {
  uniqueOptions(state.all.map((car) => car.make)).forEach((make) => makeFilter.insertAdjacentHTML('beforeend', `<option value="${clean(make)}">${clean(make)}</option>`));
  uniqueOptions(state.all.map((car) => car.body_type)).forEach((body) => bodyFilter.insertAdjacentHTML('beforeend', `<option value="${clean(body)}">${clean(body)}</option>`));
}

function card(car) {
  const photos = [...(car.local_images || []), ...(car.image_urls_original || [])];
  const imageSource = photos[0] ? photoUrl(photos[0]) : car.source_card_image_url;
  const imageMarkup = imageSource
    ? `<img src="${clean(imageSource)}" alt="${clean(car.title)} — supplier photo 1" loading="lazy" />`
    : '<div class="catalog-loading">Photo unavailable</div>';
  const description = car.description_en || 'Condition details available during verification.';
  const sold = car.availability === 'sold';
  const specs = [
    car.transmission,
    number(car.mileage_km) > 0 ? `${integer(car.mileage_km)} km` : null,
    car.body_type || car.fuel_type
  ].filter(Boolean);
  return `<article class="product-card catalog-card" data-car-id="${clean(car.id)}">
    <button class="product-image" type="button" data-view-car="${clean(car.id)}" aria-label="View ${clean(car.title)} details">
      ${imageMarkup}
      ${sold ? '<span class="sold-badge" aria-label="Sold">SOLD</span>' : '<span class="badge">VERIFY AVAILABILITY</span>'}
      <span class="photo-count">▧ ${photos.length} photos</span>
    </button>
    <div class="product-info">
      <h3>${clean(car.title)}</h3>
      <p class="meta">Stock ${clean(car.stock_number || car.id)}</p>
      <div class="specs">${specs.length ? specs.map((item) => `<span>${clean(item)}</span>`).join('') : '<span>Specifications available during verification</span>'}</div>
      <p class="description-preview">${clean(description)}</p>
      <div class="price-row"><div><small>Estimated price in naira</small><b>${ngn(adjustedNgn(car))}</b></div><button type="button" data-view-car="${clean(car.id)}">View details →</button></div>
    </div>
  </article>`;
}

function render() {
  const visibleCars = state.filtered.slice(0, state.visible);
  resultCount.innerHTML = `<strong>${state.filtered.length}</strong> ${state.filtered.length === 1 ? 'vehicle matches' : 'vehicles match'} your search · ${state.all.reduce((total, car) => total + (car.local_images?.length || 0), 0).toLocaleString()} supplier photos imported`;
  if (!visibleCars.length) {
    products.innerHTML = '<div class="empty-catalog"><h3>No vehicles found</h3><p>Try another make, body style or search term.</p></div>';
  } else {
    products.innerHTML = visibleCars.map(card).join('');
  }
  showMore.hidden = state.visible >= state.filtered.length;
  showMore.innerHTML = `Show more vehicles <span>↓</span> <small>${Math.min(state.visible, state.filtered.length)} of ${state.filtered.length}</small>`;
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  state.filtered = state.all.filter((car) => {
    const haystack = [car.title, car.make, car.model, car.year, car.stock_number, car.description_en, car.colour].filter(Boolean).join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (!makeFilter.value || car.make === makeFilter.value) && (!bodyFilter.value || car.body_type === bodyFilter.value);
  });
  const sorters = {
    newest: (a, b) => number(b.year) - number(a.year) || number(b.id) - number(a.id),
    'price-low': (a, b) => adjustedNgn(a) - adjustedNgn(b),
    'price-high': (a, b) => adjustedNgn(b) - adjustedNgn(a),
    'mileage-low': (a, b) => number(a.mileage_km) - number(b.mileage_km)
  };
  state.filtered.sort(sorters[sortFilter.value] || sorters.newest);
  state.visible = PAGE_SIZE;
  render();
}

function spec(label, value) {
  if (!value) return '';
  return `<div class="vehicle-spec"><span>${clean(label)}</span><strong>${clean(value)}</strong></div>`;
}

function renderVehicle(car) {
  const photos = [...(car.local_images || []), ...(car.image_urls_original || [])];
  const activePhoto = photos[state.photoIndex];
  const description = car.description_en || 'No additional condition notes were supplied. DirectBelgium will request verification before quoting.';
  vehicleContent.innerHTML = `<div class="vehicle-layout">
    <section class="vehicle-gallery" aria-label="${clean(car.title)} photo gallery">
      ${activePhoto ? `<img class="vehicle-main-image" src="${clean(photoUrl(activePhoto))}" alt="${clean(car.title)} — supplier photo ${state.photoIndex + 1}" />` : '<div class="vehicle-main-image catalog-loading">Photo unavailable</div>'}
      <p class="gallery-counter">Photo ${photos.length ? state.photoIndex + 1 : 0} of ${photos.length}</p>
      <div class="thumbnail-strip">${photos.map((path, index) => `<button class="thumbnail ${index === state.photoIndex ? 'active' : ''}" type="button" data-photo-index="${index}" aria-label="Show photo ${index + 1}"><img src="${clean(photoUrl(path))}" alt="" loading="lazy" /></button>`).join('')}</div>
    </section>
    <section class="vehicle-details">
      <p class="eyebrow">USED VEHICLE · CANADA</p>
      <h2>${clean(car.title)}</h2>
      <p class="vehicle-price">${ngn(adjustedNgn(car))} <small>Estimated price in naira · exchange rate and supplier availability subject to confirmation</small></p>
      <div class="vehicle-price-note">Prices are estimates in naira. Final pricing is confirmed after supplier availability and vehicle condition are verified. Taxes, shipping, customs and clearing are quoted separately.</div>
      <p class="stock-note">Stock ${clean(car.stock_number || car.id)}</p>
      <div class="availability-notice"><strong>Availability must be confirmed.</strong> This listing comes from an inventory snapshot captured ${clean(car.inventory_checked_at || 'October 4, 2026')} and is not a guaranteed hold. DirectBelgium will verify price, condition and availability before issuing a quotation.</div>
      <div class="vehicle-spec-grid">
        ${spec('Mileage', `${integer(car.mileage_km)} km`)}${spec('Transmission', car.transmission)}${spec('Fuel', car.fuel_type)}${spec('Drivetrain', drivetrain(car.drivetrain))}${spec('Body', car.body_type)}${spec('Colour', car.colour)}${spec('Interior', car.interior_colour)}${spec('Seats', car.seats)}${spec('Doors', car.doors)}
      </div>
      <div class="condition-box"><h3>Vehicle condition description</h3><p>${clean(description)}</p></div>
      <p class="supplier-disclaimer"><strong>Important:</strong> ${clean(car.disclaimer_en || 'Used vehicle details must be independently verified before purchase.')}</p>
      <div class="vehicle-actions"><button class="primary" type="button" data-open="appointment" data-product="${clean(car.title)}">Reserve inquiry &amp; consult <span>→</span></button><button class="secondary" type="button" data-copy-reference="${clean(car.stock_number || car.id)}">Copy stock reference</button></div>
    </section>
  </div>`;
}

function openVehicle(id) {
  const car = state.all.find((item) => item.id === id);
  if (!car) return;
  state.selected = car;
  state.photoIndex = 0;
  renderVehicle(car);
  vehicleModal.showModal();
}

function renderHero() {
  const car = heroCars[heroIndex];
  if (!car) return;
  const image = car.local_images?.[0];
  if (!image) return;
  heroCarImage.style.opacity = '0';
  window.setTimeout(() => {
    heroCarImage.src = photoUrl(image);
    heroCarImage.alt = `${car.title} — supplier photo`;
    heroCarImage.style.opacity = '1';
  }, 120);
  heroCarLink.dataset.heroCar = car.id;
  heroCarLink.setAttribute('aria-label', `View details for ${car.title}`);
  heroCarTitle.textContent = car.title;
  heroCarPrice.textContent = `≈ ${ngn(adjustedNgn(car))}`;
  heroDots.innerHTML = heroCars.map((item, index) => `<button class="hero-carousel-dot ${index === heroIndex ? 'active' : ''}" type="button" data-hero-index="${index}" aria-label="Show ${clean(item.title)}" aria-current="${index === heroIndex ? 'true' : 'false'}"></button>`).join('');
}

function stopHeroRotation() {
  window.clearInterval(heroTimer);
  heroTimer = undefined;
}

function startHeroRotation() {
  stopHeroRotation();
  if (reducedMotion.matches || heroCars.length < 2) return;
  heroTimer = window.setInterval(() => {
    heroIndex = (heroIndex + 1) % heroCars.length;
    renderHero();
  }, 5000);
}

function showHero(index) {
  if (!heroCars.length) return;
  heroIndex = (index + heroCars.length) % heroCars.length;
  renderHero();
  startHeroRotation();
}

function setupHero() {
  heroCars = FEATURED_VEHICLE_TITLES
    .map((title) => state.all.find((car) => car.title === title && car.availability === 'available'))
    .filter((car) => car?.local_images?.[0]);
  renderHero();
  startHeroRotation();
}

async function loadInventory() {
  try {
    const response = await fetch(`${CATALOG_ROOT}inventory.json?v=3`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Inventory request failed with ${response.status}`);
    const payload = await response.json();
    state.all = Array.isArray(payload.cars) ? payload.cars : [];
    state.filtered = [...state.all];
    populateFilters();
    applyFilters();
    setupHero();
  } catch (error) {
    products.innerHTML = '<div class="error-state"><strong>Inventory could not be loaded.</strong><br />Please refresh the page or contact DirectBelgium.</div>';
    resultCount.textContent = 'Inventory temporarily unavailable';
    console.error(error);
  }
}

[searchInput, makeFilter, bodyFilter, sortFilter].forEach((control) => control.addEventListener(control === searchInput ? 'input' : 'change', applyFilters));
document.querySelector('#reset-filters').addEventListener('click', () => { searchInput.value = ''; makeFilter.value = ''; bodyFilter.value = ''; sortFilter.value = 'newest'; applyFilters(); });
showMore.addEventListener('click', () => { state.visible += PAGE_SIZE; render(); });
products.addEventListener('click', (event) => { const trigger = event.target.closest('[data-view-car]'); if (trigger) openVehicle(trigger.dataset.viewCar); });
heroCarLink.addEventListener('click', () => openVehicle(heroCarLink.dataset.heroCar));
document.querySelector('[data-hero-previous]').addEventListener('click', () => showHero(heroIndex - 1));
document.querySelector('[data-hero-next]').addEventListener('click', () => showHero(heroIndex + 1));
heroDots.addEventListener('click', (event) => { const dot = event.target.closest('[data-hero-index]'); if (dot) showHero(number(dot.dataset.heroIndex)); });
['mouseenter', 'focusin'].forEach((eventName) => heroVisual.addEventListener(eventName, stopHeroRotation));
['mouseleave', 'focusout'].forEach((eventName) => heroVisual.addEventListener(eventName, (event) => {
  if (eventName === 'focusout' && heroVisual.contains(event.relatedTarget)) return;
  startHeroRotation();
}));
reducedMotion.addEventListener('change', () => startHeroRotation());
vehicleContent.addEventListener('click', async (event) => {
  const photo = event.target.closest('[data-photo-index]');
  if (photo && state.selected) { state.photoIndex = number(photo.dataset.photoIndex); renderVehicle(state.selected); return; }
  const copy = event.target.closest('[data-copy-reference]');
  if (copy) { await navigator.clipboard.writeText(copy.dataset.copyReference); copy.textContent = 'Reference copied'; }
});
document.querySelector('.vehicle-close').addEventListener('click', () => vehicleModal.close());
vehicleModal.addEventListener('click', (event) => { if (event.target === vehicleModal) vehicleModal.close(); });

const modal = document.querySelector('#modal');
const content = document.querySelector('#modal-content');
function openModal(type, product = '') {
  const template = document.querySelector(`#${type}-template`);
  if (!template) return;
  if (vehicleModal.open) vehicleModal.close();
  content.innerHTML = '';
  content.append(template.content.cloneNode(true));
  if (product && type === 'appointment') {
    content.querySelector('.modal-intro').insertAdjacentHTML('afterend', `<div class="availability-notice">Product of interest: <strong>${clean(product)}</strong></div>`);
  }
  modal.showModal();
  content.querySelectorAll('.option').forEach((button) => button.addEventListener('click', () => { content.querySelectorAll('.option').forEach((item) => item.classList.remove('active')); button.classList.add('active'); }));
  content.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    content.innerHTML = '<p class="eyebrow">REQUEST RECEIVED</p><h2>Thank you.</h2><p class="modal-intro">This preview does not send a live booking. In production, the server will first save and validate your request, then send a secure confirmation.</p><button class="primary submit">Done</button>';
    content.querySelector('button').addEventListener('click', () => modal.close());
  });
}
document.addEventListener('click', (event) => { const trigger = event.target.closest('[data-open]'); if (trigger) { event.preventDefault(); openModal(trigger.dataset.open, trigger.dataset.product || ''); } });
document.querySelector('#modal .close').addEventListener('click', () => modal.close());
const menuButton = document.querySelector('.menu-button');
const mainNav = document.querySelector('nav');
menuButton.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});
mainNav.addEventListener('click', (event) => {
  if (!event.target.closest('a')) return;
  mainNav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
});

loadInventory();
