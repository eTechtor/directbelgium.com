import React, { useEffect, useMemo, useRef, useState } from 'react';

const PAGE_SIZE = 12;
const CAD_ADDITION = 1600;
const NGN_PER_CAD = 953.055;
const FEATURED_TITLES = [
  '2015 Nissan Altima 2.5',
  '2015 Chevrolet Equinox 1LT',
  '2015 Volkswagen Tiguan S',
  '2017 Mitsubishi i-MiEV ES',
  '2016 Hyundai Elantra GT',
  '2020 Tesla Model 3 Standard Range Plus',
  '2017 Chevrolet Volt LT',
];

const cleanNumber = (value) => Number.parseInt(value, 10) || 0;
const formatInteger = (value) => new Intl.NumberFormat('en-CA').format(cleanNumber(value));
const formatNaira = (value) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
}).format(Math.round(value));
const adjustedNaira = (car) => (cleanNumber(car.price_cad) + CAD_ADDITION) * NGN_PER_CAD;
const vehiclePhotos = (car) => [...(car.local_images || []), ...(car.image_urls_original || [])];
const imageUrl = (path) => /^https?:\/\//.test(path || '') ? path : `/catalog/${path || ''}`;
const optionsFor = (cars, key) => [...new Set(cars.map((car) => car[key]).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b));
const drivetrainNames = {
  AllWheelDriveConfiguration: 'All-wheel drive',
  FrontWheelDriveConfiguration: 'Front-wheel drive',
  RearWheelDriveConfiguration: 'Rear-wheel drive',
  FourWheelDriveConfiguration: 'Four-wheel drive',
};

function Brand() {
  return <a className="brand" href="#top" aria-label="DirectBelgium home">
    <img className="brand-mark" src="/directbelgium-mark.png" alt="" />
    <span className="brand-name">directbelgium.com</span>
  </a>;
}

function VehicleCard({ car, onOpen }) {
  const photos = vehiclePhotos(car);
  const image = photos[0] ? imageUrl(photos[0]) : car.source_card_image_url;
  const specs = [car.transmission, cleanNumber(car.mileage_km) > 0 ? `${formatInteger(car.mileage_km)} km` : '', car.body_type || car.fuel_type].filter(Boolean);
  return <article className="product-card catalog-card">
    <button className="product-image" type="button" onClick={() => onOpen(car)} aria-label={`View ${car.title} details`}>
      {image ? <img src={image} alt={`${car.title} — supplier photo 1`} loading="lazy" /> : <div className="catalog-loading">Photo unavailable</div>}
      {car.availability === 'sold' ? <span className="sold-badge" aria-label="Sold">SOLD</span> : <span className="badge">VERIFY AVAILABILITY</span>}
      <span className="photo-count">▧ {photos.length} photos</span>
    </button>
    <div className="product-info">
      <h3>{car.title}</h3>
      <p className="meta">Stock {car.stock_number || car.id}</p>
      <div className="specs">{specs.length ? specs.map((item) => <span key={item}>{item}</span>) : <span>Specifications available during verification</span>}</div>
      <p className="description-preview">{car.description_en || 'Condition details available during verification.'}</p>
      <div className="price-row"><div><small>Estimated price in naira</small><b>{formatNaira(adjustedNaira(car))}</b></div><button type="button" onClick={() => onOpen(car)}>View details →</button></div>
    </div>
  </article>;
}

function VehicleDialog({ car, onClose, onAppointment }) {
  const dialogRef = useRef(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = car ? vehiclePhotos(car) : [];
  useEffect(() => {
    if (car && !dialogRef.current.open) dialogRef.current.showModal();
    if (!car && dialogRef.current.open) dialogRef.current.close();
  }, [car]);
  useEffect(() => setPhotoIndex(0), [car]);
  if (!car) return <dialog ref={dialogRef} className="vehicle-modal" />;
  const specRows = [
    ['Mileage', `${formatInteger(car.mileage_km)} km`], ['Transmission', car.transmission],
    ['Fuel', car.fuel_type], ['Drivetrain', drivetrainNames[car.drivetrain] || car.drivetrain],
    ['Body', car.body_type], ['Colour', car.colour], ['Interior', car.interior_colour],
    ['Seats', car.seats], ['Doors', car.doors],
  ].filter(([, value]) => value);
  const description = car.description_en || 'No additional condition notes were supplied. DirectBelgium will request verification before quoting.';
  return <dialog ref={dialogRef} className="vehicle-modal" onClose={onClose} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
    <button className="close vehicle-close" aria-label="Close vehicle details" onClick={onClose}>×</button>
    <div className="vehicle-layout">
      <section className="vehicle-gallery" aria-label={`${car.title} photo gallery`}>
        {photos[photoIndex] ? <img className="vehicle-main-image" src={imageUrl(photos[photoIndex])} alt={`${car.title} — supplier photo ${photoIndex + 1}`} /> : <div className="vehicle-main-image catalog-loading">Photo unavailable</div>}
        <p className="gallery-counter">Photo {photos.length ? photoIndex + 1 : 0} of {photos.length}</p>
        <div className="thumbnail-strip">{photos.map((path, index) => <button className={`thumbnail ${index === photoIndex ? 'active' : ''}`} key={`${path}-${index}`} type="button" onClick={() => setPhotoIndex(index)} aria-label={`Show photo ${index + 1}`}><img src={imageUrl(path)} alt="" loading="lazy" /></button>)}</div>
      </section>
      <section className="vehicle-details">
        <p className="eyebrow">USED VEHICLE · CANADA</p>
        <h2>{car.title}</h2>
        <p className="vehicle-price">{formatNaira(adjustedNaira(car))} <small>Estimated price in naira · exchange rate and supplier availability subject to confirmation</small></p>
        <div className="vehicle-price-note">Prices are estimates in naira. Final pricing is confirmed after supplier availability and vehicle condition are verified. Taxes, shipping, customs and clearing are quoted separately.</div>
        <p className="stock-note">Stock {car.stock_number || car.id}</p>
        <div className="availability-notice"><strong>Availability must be confirmed.</strong> This listing comes from an inventory snapshot {car.inventory_checked_at ? `captured ${car.inventory_checked_at}` : 'and is not a guaranteed hold'}. DirectBelgium will verify price, condition and availability before issuing a quotation.</div>
        <div className="vehicle-spec-grid">{specRows.map(([label, value]) => <div className="vehicle-spec" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="condition-box"><h3>Vehicle condition description</h3><p>{description}</p></div>
        <p className="supplier-disclaimer"><strong>Important:</strong> {car.disclaimer_en || 'Used vehicle details must be independently verified before purchase.'}</p>
        <div className="vehicle-actions"><button className="primary" type="button" onClick={() => onAppointment(car.title)}>Reserve inquiry &amp; consult <span>→</span></button><button className="secondary" type="button" onClick={(event) => { navigator.clipboard?.writeText(String(car.stock_number || car.id)); event.currentTarget.textContent = 'Reference copied'; }}>Copy stock reference</button></div>
      </section>
    </div>
  </dialog>;
}

function RequestDialog({ type, product, onClose }) {
  const dialogRef = useRef(null);
  const [meetingType, setMeetingType] = useState('Video call');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (type && !dialogRef.current.open) dialogRef.current.showModal();
    if (!type && dialogRef.current.open) dialogRef.current.close();
    setSubmitted(false);
  }, [type]);
  const appointment = type === 'appointment';
  return <dialog ref={dialogRef} id="modal" onClose={onClose} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
    <button className="close" aria-label="Close" onClick={onClose}>×</button>
    {submitted ? <><p className="eyebrow">{appointment ? 'ONLINE BOOKING' : 'ORDER TRACKING'}</p><h2>{appointment ? 'No appointment was sent.' : 'Tracking is not available yet.'}</h2><p className="modal-intro">{appointment ? 'Online booking is not available yet. Your details were not submitted.' : 'Online order tracking is not available yet. Your details were not submitted.'}</p><button className="primary submit" onClick={onClose}>Done</button></> : appointment ? <>
      <p className="eyebrow">BOOK A CONSULTATION</p><h2>Let's talk about it.</h2>
      <p className="modal-intro">Online booking is not available yet. You can review the form, but submitting it will not send your details or reserve a time.</p>
      {product && <div className="availability-notice">Product of interest: <strong>{product}</strong></div>}
      <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
        <label>Full name<input required placeholder="Your full name" /></label><label>Email address<input type="email" required placeholder="you@example.com" /></label>
        <div className="option-row">{['Video call', 'Phone call', 'In person'].map((option) => <button key={option} type="button" className={`option ${meetingType === option ? 'active' : ''}`} onClick={() => setMeetingType(option)}>{option}</button>)}</div>
        <label>Preferred date<input type="date" required /></label><button className="primary submit" type="submit">Request appointment <span>→</span></button>
      </form>
    </> : <>
      <p className="eyebrow">TRACK YOUR ORDER</p><h2>Find your order.</h2><p className="modal-intro">Online order lookup is not available yet. Submitting this form will not retrieve or send your details.</p>
      <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><label>Order reference<input required placeholder="Enter your order reference" /></label><label>Email address<input type="email" required placeholder="you@example.com" /></label><button className="primary submit" type="submit">Check status <span>→</span></button></form>
    </>}
  </dialog>;
}

export default function App() {
  const [cars, setCars] = useState([]);
  const [inventoryError, setInventoryError] = useState(false);
  const [query, setQuery] = useState('');
  const [make, setMake] = useState('');
  const [bodyStyle, setBodyStyle] = useState('');
  const [sort, setSort] = useState('newest');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedCar, setSelectedCar] = useState(null);
  const [dialogType, setDialogType] = useState('');
  const [dialogProduct, setDialogProduct] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const heroVisualRef = useRef(null);
  const [rotationPaused, setRotationPaused] = useState(false);

  useEffect(() => {
    fetch('/catalog/inventory.json?v=3', { cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(`Inventory request failed with ${response.status}`); return response.json(); })
      .then((payload) => setCars(Array.isArray(payload.cars) ? payload.cars : []))
      .catch(() => setInventoryError(true));
  }, []);

  const featured = useMemo(() => FEATURED_TITLES.map((title) => cars.find((car) => car.title === title && car.availability === 'available' && car.local_images?.[0])).filter(Boolean), [cars]);
  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const results = cars.filter((car) => {
      const text = [car.title, car.make, car.model, car.year, car.stock_number, car.description_en, car.colour].filter(Boolean).join(' ').toLowerCase();
      return (!lowered || text.includes(lowered)) && (!make || car.make === make) && (!bodyStyle || car.body_type === bodyStyle);
    });
    const sorters = {
      newest: (a, b) => cleanNumber(b.year) - cleanNumber(a.year) || cleanNumber(b.id) - cleanNumber(a.id),
      'price-low': (a, b) => adjustedNaira(a) - adjustedNaira(b),
      'price-high': (a, b) => adjustedNaira(b) - adjustedNaira(a),
      'mileage-low': (a, b) => cleanNumber(a.mileage_km) - cleanNumber(b.mileage_km),
    };
    return results.sort(sorters[sort] || sorters.newest);
  }, [cars, query, make, bodyStyle, sort]);
  const currentHero = featured.length ? featured[heroIndex % featured.length] : null;
  const openRequest = (type, product = '') => { setSelectedCar(null); setDialogProduct(product); setDialogType(type); };
  const openVehicle = (car) => { setDialogType(''); setSelectedCar(car); };
  const moveHero = (direction) => { if (featured.length) setHeroIndex((index) => (index + direction + featured.length) % featured.length); };

  useEffect(() => {
    if (featured.length < 2 || rotationPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setHeroIndex((index) => (index + 1) % featured.length), 5000);
    return () => window.clearInterval(timer);
  }, [featured.length, rotationPaused]);

  const resetFilters = () => { setQuery(''); setMake(''); setBodyStyle(''); setSort('newest'); setVisible(PAGE_SIZE); };
  const navClick = () => setMenuOpen(false);
  const photosTotal = cars.reduce((total, car) => total + (car.local_images?.length || 0), 0);

  return <>
    <div className="announcement"><span>Canada Direct. Nigeria Ready.</span><span className="announcement-note">Availability is confirmed before any payment is requested.</span></div>
    <header className="site-header">
      <Brand />
      <button className="menu-button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><i></i><i></i></button>
      <nav className={menuOpen ? 'is-open' : ''} aria-label="Primary navigation" onClick={navClick}><a href="#inventory">Inventory</a><a href="#process">How it works</a><a href="#shipping">Shipping</a><a href="#shipping" onClick={(event) => { event.preventDefault(); openRequest('track'); }}>Track order</a></nav>
      <div className="header-actions"><button className="primary small" onClick={() => openRequest('appointment')}><span className="label-long">Book a consultation</span><span className="label-short">Book consult</span><span aria-hidden="true">→</span></button></div>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">CANADA-TO-NIGERIA SOURCING</p><h1>Shop Canada.<br /><em>Ship to Nigeria.</em></h1>
          <p className="hero-text">Browse used vehicles from recent Canadian inventory snapshots. Choose a car, review available photos and condition notes, then confirm details before purchase.</p>
          <div className="hero-actions"><a className="primary" href="#inventory">Explore products <span>→</span></a><a className="secondary" href="#process">See how it works <span>↗</span></a></div>
          <div className="hero-assurance"><span className="dot"></span><span><strong>Clear before you commit.</strong> Listings are not a guaranteed hold; confirm details before purchase.</span></div>
        </div>
        <div className="hero-visual" aria-label="Featured vehicle carousel" ref={heroVisualRef} onMouseEnter={() => setRotationPaused(true)} onMouseLeave={() => setRotationPaused(false)} onFocus={() => setRotationPaused(true)} onBlur={(event) => { if (!heroVisualRef.current?.contains(event.relatedTarget)) setRotationPaused(false); }}>
          <button className="hero-car-link" type="button" onClick={() => currentHero && openVehicle(currentHero)} aria-label={currentHero ? `View details for ${currentHero.title}` : 'Featured vehicle'}>
            <img id="hero-car-image" src={currentHero?.local_images?.[0] ? imageUrl(currentHero.local_images[0]) : '/catalog/assets/407440-2015-nissan-altima-2-5/01.jpg'} alt={currentHero ? `${currentHero.title} — supplier photo` : 'Featured vehicle photographed at the Canadian supplier lot'} fetchpriority="high" />
            <b className="hero-price-tag" id="hero-car-price">{currentHero ? `≈ ${formatNaira(adjustedNaira(currentHero))}` : ''}</b>
            <span className="hero-photo-label"><strong id="hero-car-title">{currentHero?.title || 'Browse actual vehicles and condition notes'}</strong></span>
          </button>
          <div className="hero-carousel-controls"><button type="button" className="hero-carousel-button" onClick={() => moveHero(-1)} aria-label="Show previous featured vehicle">←</button>
            <div className="hero-carousel-dots" id="hero-carousel-dots" aria-label="Choose featured vehicle">{featured.map((car, index) => <button key={car.id} className={`hero-carousel-dot ${index === heroIndex ? 'active' : ''}`} type="button" onClick={() => setHeroIndex(index)} aria-label={`Show ${car.title}`} aria-current={index === heroIndex ? 'true' : 'false'} />)}</div>
            <button type="button" className="hero-carousel-button" onClick={() => moveHero(1)} aria-label="Show next featured vehicle">→</button></div>
        </div>
      </section>

      <section className="trust-strip"><div><span className="strip-icon">✓</span><b>Verified before payment</b><small>Every quote follows availability checks</small></div><div><span className="strip-icon">◎</span><b>One team, end to end</b><small>From sourcing through shipping</small></div><div><span className="strip-icon">⌁</span><b>Clear cost breakdowns</b><small>Shipping and exclusions explained</small></div></section>

      <section className="section inventory-section" id="inventory">
        <div className="section-heading"><div><p className="eyebrow">CANADIAN VEHICLE INVENTORY</p><h2>Find your next<br />great purchase.</h2></div><p>Browse vehicle listings, photos and available condition notes. Listings are for reference; price, condition and availability must be confirmed before purchase.</p></div>
        <div className="inventory-toolbar">
          <label className="search-field"><span>Search inventory</span><input type="search" placeholder="Search make, model, year or stock number" autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setVisible(PAGE_SIZE); }} /></label>
          <label><span>Make</span><select value={make} onChange={(event) => { setMake(event.target.value); setVisible(PAGE_SIZE); }}><option value="">All makes</option>{optionsFor(cars, 'make').map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Body style</span><select value={bodyStyle} onChange={(event) => { setBodyStyle(event.target.value); setVisible(PAGE_SIZE); }}><option value="">All body styles</option>{optionsFor(cars, 'body_type').map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => { setSort(event.target.value); setVisible(PAGE_SIZE); }}><option value="newest">Year: newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="mileage-low">Mileage: low to high</option></select></label>
        </div>
        <div className="inventory-meta"><p aria-live="polite">{inventoryError ? 'Inventory temporarily unavailable' : cars.length ? <><strong>{filtered.length}</strong> {filtered.length === 1 ? 'vehicle matches' : 'vehicles match'} your search · {photosTotal.toLocaleString()} photos</> : 'Loading Canadian inventory…'}</p><button type="button" onClick={resetFilters}>Reset filters</button></div>
        <p className="fx-note">Prices are estimates in naira. Final pricing is confirmed after supplier availability and vehicle condition are verified. Taxes, shipping, customs and clearing are quoted separately.</p>
        <div className="product-grid" id="products" aria-live="polite">{inventoryError ? <div className="error-state"><strong>Inventory could not be loaded.</strong><br />Please refresh the page and try again.</div> : !cars.length ? <div className="catalog-loading">Loading vehicles and photos…</div> : !filtered.length ? <div className="empty-catalog"><h3>No vehicles found</h3><p>Try another make, body style or search term.</p></div> : filtered.slice(0, visible).map((car) => <VehicleCard key={car.id} car={car} onOpen={openVehicle} />)}</div>
        {visible < filtered.length && <button className="secondary wide" type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Show more vehicles <span>↓</span> <small>{Math.min(visible, filtered.length)} of {filtered.length}</small></button>}
      </section>

      <section className="section process" id="process"><div className="process-intro"><p className="eyebrow">A CLEARER WAY TO BUY</p><h2>We take the<br /><em>uncertainty</em> out.</h2><p>We’re a sourcing and shipping service — not an open marketplace. Our team coordinates the important checks before you make a purchase decision.</p><a className="text-link" href="#appointment" onClick={(event) => { event.preventDefault(); openRequest('appointment'); }}>Start with a consultation <span>→</span></a></div><ol className="steps"><li><span>01</span><div><h3>Choose what you want</h3><p>Browse available and sourceable products from Canada.</p></div></li><li><span>02</span><div><h3>Talk it through</h3><p>Book a call, video meeting, or in-person consultation.</p></div></li><li><span>03</span><div><h3>Receive your quote</h3><p>We verify availability and give you an itemised quote with clear terms.</p></div></li><li><span>04</span><div><h3>Purchase &amp; ship</h3><p>After verified payment, we procure, ship and keep you informed.</p></div></li></ol></section>

      <section className="quote-section"><div className="quote-visual"><div className="quote-card"><p>YOUR QUOTATION</p><h3>Itemised costs</h3><div><span>Vehicle price</span><b>Confirmed individually</b></div><div><span>Shipping</span><b>Quoted separately</b></div><div><span>Taxes &amp; clearing</span><b>Itemised where applicable</b></div><hr /><small>Final figures depend on verified vehicle details and shipping arrangements.</small></div></div><div className="quote-copy"><p className="eyebrow">CLEAR COSTS</p><h2>See the numbers<br />before you decide.</h2><p>Your quotation separates vehicle price, shipping and any applicable service fees. Customs and clearing estimates are explained before you decide.</p><ul><li><span>✓</span> Clear acceptance terms</li><li><span>✓</span> Itemised costs in NGN</li><li><span>✓</span> No purchase before your approval</li></ul></div></section>

      <section className="shipping section" id="shipping"><div><p className="eyebrow">SHIPPING &amp; DELIVERY</p><h2>From Canada<br />to your hands.</h2><p>Shipping method, costs, timing and delivery options depend on the vehicle and destination. These details are confirmed as part of your quotation before a purchase moves forward.</p><button className="secondary" onClick={() => openRequest('track')}>Track an order <span>→</span></button></div><div className="timeline"><p className="timeline-note">Typical order milestones · not a live order status</p><div><b>1</b><span><strong>Purchase confirmed</strong><small>After your approval</small></span></div><div><b>2</b><span><strong>Preparing shipment</strong><small>Documents and handling</small></span></div><div><b>3</b><span><strong>Departed Canada</strong><small>Carrier milestone</small></span></div><div><b>4</b><span><strong>Arrived in Nigeria</strong><small>Then customs clearance</small></span></div><div><b>5</b><span><strong>Ready for delivery</strong><small>Final handover</small></span></div></div></section>

      <section className="section faq" id="faq"><p className="eyebrow">GOOD TO KNOW</p><h2>Questions, answered clearly.</h2><details open><summary>When do I pay for a product?<span>+</span></summary><p>Only after availability is confirmed and you have reviewed an itemised quotation. An inquiry does not reserve supplier inventory.</p></details><details><summary>Are customs and clearing charges included?<span>+</span></summary><p>They depend on product classification, valuation and current regulations. Your quotation explains which estimates are included or excluded.</p></details><details><summary>Are the listed prices final?<span>+</span></summary><p>No. Displayed prices are estimates in naira. Final pricing depends on confirmed availability, condition, exchange rates and shipping costs.</p></details></section>

      <section className="booking" id="appointment"><div><p className="eyebrow">LET'S GET STARTED</p><h2>Want a hand<br />choosing?</h2><p>Book a conversation with our team. We’ll walk through the product, pricing and what comes next.</p></div><button className="light-button" onClick={() => openRequest('appointment')}>Book a consultation <span>→</span></button></section>
    </main>

    <footer><div className="footer-brand"><Brand /><p>Canada Direct. Nigeria Ready.</p></div><div><b>Explore</b><a href="#inventory">Used cars</a><a href="#inventory">Browse all vehicles</a><a href="#process">How sourcing works</a></div><div><b>Company</b><a href="#process">How it works</a><a href="#shipping">Shipping &amp; delivery</a><a href="#faq">Frequently asked questions</a></div><div><b>Support</b><a href="#shipping" onClick={(event) => { event.preventDefault(); openRequest('track'); }}>Track an order</a><a href="#shipping">Customs &amp; clearing</a><a href="#faq">Pricing &amp; availability</a></div><small className="copyright">© {new Date().getFullYear()} DirectBelgium. Prices and availability must be confirmed before purchase.</small></footer>
    <VehicleDialog car={selectedCar} onClose={() => setSelectedCar(null)} onAppointment={(product) => openRequest('appointment', product)} />
    <RequestDialog type={dialogType} product={dialogProduct} onClose={() => setDialogType('')} />
  </>;
}
