/* ShopHub app – hash-routed SPA. Data lives in data.js. */
'use strict';

/* ---------- Helpers & state ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('sh_' + k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('sh_' + k, JSON.stringify(v)); } catch { /* storage full/blocked */ } }
};
let cart = store.get('cart', []), wish = store.get('wish', []), user = store.get('user', null);
let orders = store.get('orders', []), recent = store.get('recent', []), searches = store.get('searches', []);
const app = $('#app');
const money = n => '$' + n.toFixed(2);
const byId = id => PRODUCTS.find(p => p.id === +id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stars = r => `<span class="stars" aria-label="${r} out of 5 stars">${[1, 2, 3, 4, 5].map(i =>
  `<i class="${r >= i ? 'fa-solid fa-star' : r >= i - .5 ? 'fa-solid fa-star-half-stroke' : 'fa-regular fa-star'}"></i>`).join('')}</span>`;

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Reusable templates ---------- */
const card = p => `<article class="card">
  <a class="img" href="#/product/${p.id}"><img src="${p.image}" alt="${esc(p.name)}" loading="lazy"><span class="badge">${p.badge}</span></a>
  <button class="heart ${wish.includes(p.id) ? 'on' : ''}" data-act="wish" data-id="${p.id}" aria-label="Toggle wishlist"><i class="fa-solid fa-heart"></i></button>
  <button class="qv" data-act="qv" data-id="${p.id}">Quick view</button>
  <div class="body">
    <a href="#/product/${p.id}" class="title">${esc(p.name)}</a>
    <div>${stars(p.rating)} <small>(${p.reviews.toLocaleString()})</small></div>
    <div class="price"><b>${money(p.price)}</b><s>${money(p.oldPrice)}</s></div>
    <div class="fast"><i class="fa-solid fa-truck-fast"></i> Fast Delivery</div>
    <div class="btns"><button class="btn" data-act="add" data-id="${p.id}" ${p.stock ? '' : 'disabled'}>Add to Cart</button><button class="btn dark" data-act="buy" data-id="${p.id}" ${p.stock ? '' : 'disabled'}>Buy Now</button></div>
  </div></article>`;
const grid = list => list.length ? `<div class="grid">${list.map(card).join('')}</div>`
  : `<div class="empty"><i class="fa-solid fa-magnifying-glass"></i><h2>No products found.</h2><p>Try another search.</p><a class="btn" href="#/products">Browse all products</a></div>`;
const section = (title, inner, extra = '') => `<section class="wrap sec"><div class="sec-h"><h2>${title}</h2>${extra}</div>${inner}</section>`;
const emptyBox = (icon, title, sub, link = '') => `<div class="empty wrap" style="margin:20px auto"><i class="fa-solid ${icon}"></i><h2>${title}</h2><p>${sub}</p>${link}</div>`;

/* ---------- Header / side menu ---------- */
function refresh() {
  $('#cc').textContent = cart.reduce((s, i) => s + i.qty, 0);
  const name = user ? user.name.split(' ')[0] : 'sign in';
  $('#acct').innerHTML = `<small>Hello, ${esc(name)}</small>Account &amp; Lists`;
  $('#acct').href = user ? '#/account' : '#/login';
  $('#sideUser').textContent = 'Hello, ' + name;
}
function buildSide() {
  $('#sideList').innerHTML = Object.entries(MENU).map(([c, subs]) => `<div class="mi">
    <button data-act="sub" aria-expanded="false">${c}<i class="fa-solid fa-chevron-down"></i></button>
    <div class="sub"><a href="#/products?cat=${encodeURIComponent(c)}"><b>All ${c}</b></a>${subs.map(s => `<a href="#/products?q=${encodeURIComponent(s)}">${s}</a>`).join('')}</div></div>`).join('');
  $('#scat').innerHTML = '<option value="">All</option>' + CATS.map(c => `<option>${c.name}</option>`).join('');
}
function toggleMenu(force) {
  const open = force ?? !$('#side').classList.contains('open');
  $('#side').classList.toggle('open', open); $('#scrim').hidden = !open;
  $('#side').setAttribute('aria-hidden', !open);
}

/* ---------- Cart logic ---------- */
const saveCart = () => { store.set('cart', cart); refresh(); };
function addCart(id, qty = 1, silent) {
  const p = byId(id); if (!p || !p.stock) return toast('Out of stock');
  const it = cart.find(i => i.id === p.id);
  if (it) it.qty = Math.min(p.stock, it.qty + qty); else cart.push({ id: p.id, qty });
  saveCart(); if (!silent) toast('Product added to cart!');
}
function toggleWish(id) {
  const i = wish.indexOf(id);
  i > -1 ? wish.splice(i, 1) : wish.push(id);
  store.set('wish', wish); toast(i > -1 ? 'Removed from wishlist' : 'Added to wishlist!');
  $$(`.heart[data-id="${id}"]`).forEach(b => b.classList.toggle('on', i === -1));
  if (location.hash.startsWith('#/wishlist')) wishlist();
}
function totals(express = false) {
  const sub = cart.reduce((s, i) => s + byId(i.id).price * i.qty, 0);
  const save = cart.reduce((s, i) => s + (byId(i.id).oldPrice - byId(i.id).price) * i.qty, 0);
  const del = !sub ? 0 : (sub >= 50 ? 0 : 4.99) + (express ? 9.99 : 0);
  const tax = sub * .08;
  return { sub, save, del, tax, total: sub + del + tax };
}
const summary = (t, btn) => `<aside class="box sum" aria-label="Order summary"><h3>Order Summary</h3>
  <div><span>Subtotal</span><span>${money(t.sub)}</span></div><div><span>Delivery</span><span>${t.del ? money(t.del) : 'FREE'}</span></div>
  <div><span>Discount (applied)</span><span>-${money(t.save)}</span></div><div><span>Tax (8%)</span><span>${money(t.tax)}</span></div>
  <div class="tot"><span>Total</span><span>${money(t.total)}</span></div>${btn}</aside>`;

/* ---------- Router ---------- */
const routes = { '/': home, '/products': products, '/cart': cartPage, '/checkout': checkout, '/login': () => auth('login'), '/signup': () => auth('signup'), '/account': account, '/wishlist': wishlist, '/service': service };
function route() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const q = new URLSearchParams(qs || '');
  toggleMenu(false); clearInterval(heroT);
  const m = path.match(/^\/product\/(\d+)$/);
  m && byId(m[1]) ? productPage(byId(m[1])) : (routes[path] || home)(q);
  refresh(); scrollTo(0, 0);
}
addEventListener('hashchange', route);

/* ---------- Home ---------- */
const SLIDES = [
  ['Summer Sale', 'Up to 50% Off', 'Big Deals. Better Prices.', '🛍️', 20, '#/products?deals=1'],
  ['New Electronics', 'Latest technology at great prices', 'Discover products you\'ll love.', '🎧', 215, '#/products?cat=Electronics'],
  ['Fashion Collection', 'Upgrade your style', 'Fresh looks for every season.', '👟', 340, '#/products?cat=Fashion'],
  ['Home Essentials', 'Everything for your home', 'Make every room better.', '🍳', 150, '#/products?cat=Home%20%26%20Kitchen']
];
let heroT, heroI = 0;
function hero() {
  return `<section class="hero" aria-roledescription="carousel" aria-label="Promotions">${SLIDES.map((s, i) => `
    <div class="slide ${i ? '' : 'on'}" style="background-image:linear-gradient(90deg,rgba(15,23,42,.92),rgba(15,23,42,.35)),url('${svgImg(s[3], s[4], 500)}'),linear-gradient(#222,#222)">
      <div><h3>${s[2]}</h3><h1>${s[0]}</h1><p>${s[1]}</p>
      <a class="btn big" href="${s[5]}">Shop Now</a> <a class="btn big ghost" href="#/products?deals=1">Explore Deals</a></div></div>`).join('')}
    <button class="hbtn hprev" data-act="slide" data-d="-1" aria-label="Previous slide"><i class="fa-solid fa-chevron-left"></i></button>
    <button class="hbtn hnext" data-act="slide" data-d="1" aria-label="Next slide"><i class="fa-solid fa-chevron-right"></i></button>
    <div class="dots">${SLIDES.map((_, i) => `<button class="${i ? '' : 'on'}" data-act="slide" data-i="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}</div></section>`;
}
function showSlide(i) {
  heroI = (i + SLIDES.length) % SLIDES.length;
  $$('.slide').forEach((s, k) => s.classList.toggle('on', k === heroI));
  $$('.dots button').forEach((s, k) => s.classList.toggle('on', k === heroI));
}
let dealEnd = Date.now() + (5 * 3600 + 32 * 60 + 18) * 1000;
setInterval(() => {
  const el = $('#cd'); if (!el) return;
  if (dealEnd < Date.now()) dealEnd = Date.now() + 6 * 3600e3;
  const s = Math.floor((dealEnd - Date.now()) / 1000), p = n => String(n).padStart(2, '0');
  el.textContent = `${p(Math.floor(s / 3600))}h ${p(Math.floor(s / 60) % 60)}m ${p(s % 60)}s`;
}, 1000);

function home() {
  const deals = [...PRODUCTS].sort((a, b) => b.discount - a.discount).slice(0, 10);
  const pop = [...PRODUCTS].sort((a, b) => b.reviews - a.reviews).slice(0, 8);
  const rec = [...PRODUCTS].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const more = PRODUCTS.filter(p => !pop.includes(p)).slice(0, 8);
  app.innerHTML = hero() +
    section('Shop by Category', `<div class="cats">${CATS.map(c => `<a class="cat" href="#/products?cat=${encodeURIComponent(c.name)}">
      <img src="${svgImg(c.emoji, c.hue, 300)}" alt="${c.name}" loading="lazy"><h3>${c.name}</h3><span>Shop Now</span></a>`).join('')}</div>`) +
    section("Today's Deals", `<div class="hrow">${deals.map(card).join('')}</div>`, `<div class="timer">Deals end in: <b id="cd">05h 32m 18s</b></div>`) +
    section('Popular Products', grid(pop), '<a class="btn ghost" href="#/products">See all</a>') +
    section('Recommended for You', grid(rec)) +
    `<div class="wrap"><div class="promo"><div><h2>Free delivery on orders over $50</h2><p>Join ShopHub today and unlock member-only deals.</p></div><a class="btn big" href="#/signup">Create your account</a></div></div>` +
    section('More Products', grid(more));
  heroT = setInterval(() => showSlide(heroI + 1), 5000);
}

/* ---------- Product listing, filters, search ---------- */
let F = {};
const brands = ['ShopHub', 'Apple', 'Samsung', 'Sony', 'Nike', 'Adidas', 'HP', 'Dell'];
function filtered() {
  const words = F.q.toLowerCase().split(/\s+/).filter(Boolean);
  const [lo, hi] = F.price ? F.price.split('-').map(Number) : [0, 1e9];
  const list = PRODUCTS.filter(p => {
    const hay = [p.name, p.category, p.brand, p.description].join(' ').toLowerCase();
    return words.every(w => hay.includes(w)) && (!F.cat || p.category === F.cat) && p.price >= lo && p.price < hi &&
      p.rating >= F.rating && (!F.brands.length || F.brands.includes(p.brand)) && (!F.stock || p.stock) && p.discount >= F.disc;
  });
  const sorts = { low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating, new: (a, b) => b.id - a.id };
  return F.sort in sorts ? list.sort(sorts[F.sort]) : list;
}
function products(q) {
  F = { q: q.get('q') || '', cat: q.get('cat') || '', price: '', rating: 0, brands: [], stock: false, disc: q.get('deals') ? 30 : 0, sort: 'featured' };
  const radio = (name, items) => items.map(([v, l], i) => `<label><input type="radio" name="${name}" data-f="${name}" value="${v}" ${String(F[name]) === String(v) ? 'checked' : ''}> ${l}</label>`).join('');
  app.innerHTML = `<div class="lay"><div><button class="btn dark ftog" data-act="ftog"><i class="fa-solid fa-filter"></i> Filters</button>
    <form class="filters" id="filters" aria-label="Filters"><h4>Category</h4>${radio('cat', [['', 'All'], ...CATS.map(c => [c.name, c.name])])}
    <h4>Price</h4>${radio('price', [['', 'Any'], ['0-50', '$0 – $50'], ['50-100', '$50 – $100'], ['100-250', '$100 – $250'], ['250-1000000', '$250+']])}
    <h4>Customer Reviews</h4>${radio('rating', [[0, 'Any'], [5, '★★★★★ &amp; Up'], [4, '★★★★☆ &amp; Up'], [3, '★★★☆☆ &amp; Up']]).replace('value="5"', 'value="4.9"')}
    <h4>Brand</h4>${brands.map(b => `<label><input type="checkbox" data-f="brand" value="${b}"> ${b}</label>`).join('')}
    <h4>Availability</h4><label><input type="checkbox" data-f="stock"> In stock only</label>
    <h4>Discount</h4>${radio('disc', [[0, 'Any'], [20, '20% off or more'], [30, '30% off or more'], [40, '40% off or more']])}
    <button type="button" class="btn ghost" style="margin-top:14px;width:100%" data-act="fclr">Clear filters</button></form></div>
    <section><div class="bar"><h2 id="res" aria-live="polite">Results</h2><label>Sort by: <select data-f="sort"><option value="featured">Featured</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="rating">Customer Rating</option><option value="new">Newest</option></select></label></div>
    <div id="pgrid"></div></section></div>`;
  drawGrid();
}
function drawGrid() {
  const list = filtered();
  $('#res').textContent = F.q ? `${list.length} results for '${F.q}'` : F.cat ? `${list.length} results in ${F.cat}` : `${list.length} Results`;
  $('#pgrid').innerHTML = grid(list);
}

/* Search bar with suggestions + recent searches */
function runSearch(term, cat) {
  term = term.trim();
  if (term) { searches = [term, ...searches.filter(s => s !== term)].slice(0, 5); store.set('searches', searches); }
  $('#suggest').hidden = true;
  location.hash = `#/products?q=${encodeURIComponent(term)}${cat ? '&cat=' + encodeURIComponent(cat) : ''}`;
}
function suggest() {
  const v = $('#sq').value.trim().toLowerCase(), box = $('#suggest');
  $('#sclr').hidden = !v;
  let h = '';
  if (!v) h = searches.length ? '<h6>Recent searches</h6>' + searches.map(s => `<a href="#/products?q=${encodeURIComponent(s)}" data-s="${esc(s)}"><i class="fa-solid fa-clock-rotate-left"></i>${esc(s)}</a>`).join('') : '';
  else {
    const m = PRODUCTS.filter(p => (p.name + p.brand + p.category).toLowerCase().includes(v)).slice(0, 5);
    h = m.map(p => `<a href="#/product/${p.id}"><i class="fa-solid fa-magnifying-glass"></i>${esc(p.name)}</a>`).join('') ||
      '<a href="#/products?q=' + encodeURIComponent(v) + '">Search for "' + esc(v) + '"</a>';
  }
  box.innerHTML = h; box.hidden = !h;
}

/* ---------- Product details & quick view ---------- */
function productPage(p) {
  recent = [p.id, ...recent.filter(i => i !== p.id)].slice(0, 8); store.set('recent', recent);
  const opts = (name, arr) => arr.length ? `<b>${name}:</b><div class="opt">${arr.map((v, i) => `<label><input type="radio" name="${name}" value="${v}" ${i ? '' : 'checked'}>${v}</label>`).join('')}</div>` : '';
  app.innerHTML = `<div class="wrap"><nav aria-label="Breadcrumb" style="padding-top:14px"><a href="#/">Home</a> › <a href="#/products?cat=${encodeURIComponent(p.category)}">${p.category}</a> › ${esc(p.name)}</nav>
  <div class="pd"><div><div class="zoom"><img id="mainImg" src="${p.gallery[0]}" alt="${esc(p.name)}"></div>
    <div class="thumbs">${p.gallery.map((g, i) => `<button class="${i ? '' : 'on'}" data-act="thumb" data-src="${g}" aria-label="Image ${i + 1}"><img src="${g}" alt=""></button>`).join('')}</div></div>
  <div><h1>${esc(p.name)}</h1><div>${stars(p.rating)} <a href="#reviews" data-act="tab" data-t="reviews">${p.reviews.toLocaleString()} reviews</a> · Brand: ${p.brand}</div>
    <div class="pr">${money(p.price)} <s style="font-size:16px;color:var(--mut)">${money(p.oldPrice)}</s> <span class="badge" style="position:static">${p.discount}% OFF</span></div>
    <p>${p.description}</p>${opts('Color', p.colors)}${opts('Size', p.sizes)}
    <p><b>Quantity:</b> <span class="qty"><button data-act="q" data-d="-1" aria-label="Decrease">−</button><input id="qty" value="1" readonly aria-label="Quantity"><button data-act="q" data-d="1" aria-label="Increase">+</button></span></p>
    <p class="${p.stock ? 'in' : 'out'}">${p.stock ? (p.stock < 10 ? `Only ${p.stock} left in stock` : 'In Stock') : 'Out of Stock'}</p>
    <p class="fast"><i class="fa-solid fa-truck-fast"></i> Fast Delivery to Pakistan · Arrives in 3–5 days · 30-day returns</p>
    <div class="acts"><button class="btn big" data-act="addp" data-id="${p.id}" ${p.stock ? '' : 'disabled'}>Add to Cart</button><button class="btn big dark" data-act="buyp" data-id="${p.id}" ${p.stock ? '' : 'disabled'}>Buy Now</button><button class="btn big ghost" data-act="wish" data-id="${p.id}"><i class="fa-solid fa-heart"></i> Add to Wishlist</button></div></div></div>
  <div class="tabs"><div class="tabh" role="tablist">${[['details', 'Product Details'], ['specs', 'Specifications'], ['reviews', 'Customer Reviews'], ['qa', 'Questions & Answers']].map(([k, l], i) => `<button role="tab" class="${i ? '' : 'on'}" data-act="tab" data-t="${k}">${l}</button>`).join('')}</div>
    <div class="tabc" id="tabc"></div></div>
  ${section('Customers also viewed', grid(PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4)))}</div>`;
  showTab('details', p);
}
function showTab(t, p = byId(location.hash.split('/')[2])) {
  $$('.tabh button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  const c = {
    details: `<p>${p.description}</p><ul><li>Authentic ${p.brand} quality</li><li>1-year ShopHub warranty</li><li>Free returns within 30 days</li></ul>`,
    specs: `<table>${[['Brand', p.brand], ['Category', p.category], ['Model', 'SH-' + String(p.id).padStart(4, '0')], ['Colors', p.colors.join(', ') || 'N/A'], ['Rating', p.rating + ' / 5'], ['Warranty', '1 year']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`,
    reviews: [['Ayesha K.', 5, 'Excellent quality and fast delivery. Highly recommended!'], ['Bilal R.', 4, 'Good value for the price. Packaging could be better.'], ['Sara M.', 5, 'Exactly as described. Will buy again.']].map(r => `<p><b>${r[0]}</b> ${stars(r[1])}<br>${r[2]}</p>`).join(''),
    qa: '<p><b>Q:</b> Does it come with a warranty?<br><b>A:</b> Yes, a 1-year ShopHub warranty is included.</p><p><b>Q:</b> Is cash on delivery available?<br><b>A:</b> Yes, at checkout.</p>'
  };
  $('#tabc').innerHTML = c[t];
}
function quickView(id) {
  const p = byId(id), m = $('#modal');
  m.innerHTML = `<div><button class="ib x" data-act="close" aria-label="Close">✕</button><img src="${p.image}" alt="${esc(p.name)}" style="border-radius:10px">
    <div><h2>${esc(p.name)}</h2><p>${stars(p.rating)} (${p.reviews.toLocaleString()})</p><p class="price"><b>${money(p.price)}</b> <s>${money(p.oldPrice)}</s></p><p>${p.description}</p>
    <div class="acts"><button class="btn" data-act="add" data-id="${p.id}">Add to Cart</button><a class="btn dark" href="#/product/${p.id}" data-act="close">Full details</a></div></div></div>`;
  m.hidden = false; $('.x', m).focus();
}

/* ---------- Cart & wishlist pages ---------- */
function cartPage() {
  if (!cart.length) return app.innerHTML = emptyBox('fa-cart-shopping', 'Your cart is empty.', 'Add something you love.', '<a class="btn" href="#/products">Start shopping</a>');
  app.innerHTML = `<div class="wrap two"><section class="box"><h1>Shopping Cart</h1>${cart.map(i => { const p = byId(i.id); return `<div class="crow">
    <a href="#/product/${p.id}"><img src="${p.image}" alt="${esc(p.name)}"></a>
    <div><a class="title" href="#/product/${p.id}">${esc(p.name)}</a><div class="in">In Stock</div><div class="qty"><button data-act="dec" data-id="${p.id}" aria-label="Decrease">−</button><span>${i.qty}</span><button data-act="inc" data-id="${p.id}" aria-label="Increase">+</button></div><p>
      <button class="lnk" data-act="rm" data-id="${p.id}">Remove</button><button class="lnk" data-act="save" data-id="${p.id}">Save for later</button></p></div>
    <b>${money(p.price * i.qty)}</b></div>`; }).join('')}</section>
    ${summary(totals(), '<a class="btn big" style="width:100%;margin-top:12px" href="#/checkout">Proceed to Checkout</a>')}</div>`;
}
function wishlist() {
  app.innerHTML = `<div class="wrap sec"><h1>Your Wishlist</h1>${wish.length ? '<br><div class="grid">' + wish.map(id => { const p = byId(id); return card(p).replace('Add to Cart', 'Move to Cart').replace('data-act="add"', 'data-act="mv"'); }).join('') + '</div>' : emptyBox('fa-heart', 'Your wishlist is empty.', 'Tap the heart on any product to save it.', '<a class="btn" href="#/products">Start shopping</a>')}</div>`;
}

/* ---------- Checkout ---------- */
let ck = { step: 1, addr: store.get('addr', {}), ship: 'std', pay: 'card', done: null };
const field = (id, label, type = 'text', extra = '', cls = '') => `<div class="f ${cls}"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" required placeholder=" " value="${esc(ck.addr[id] || '')}" ${extra}></div>`;
function checkout() {
  if (ck.done) { const o = ck.done; ck = { ...ck, step: 1, done: null };
    return app.innerHTML = `<div class="wrap"><div class="box ok" style="margin:20px 0"><i class="fa-solid fa-circle-check"></i><h1>Order Successfully Placed!</h1><p>Your order number is <b>${o.id}</b>. A confirmation has been sent to you.</p><a class="btn" href="#/account?tab=orders">View orders</a> <a class="btn ghost" href="#/">Continue shopping</a></div></div>`; }
  if (!cart.length) return app.innerHTML = emptyBox('fa-cart-shopping', 'Your cart is empty.', 'Add items before checking out.', '<a class="btn" href="#/products">Start shopping</a>');
  const t = totals(ck.ship === 'exp'), s = ck.step;
  const radio = (n, v, l, sub = '') => `<label><input type="radio" name="${n}" value="${v}" ${ck[n] === v ? 'checked' : ''}><span><b>${l}</b><br><small style="color:var(--mut)">${sub}</small></span></label>`;
  const steps = ['Shipping Address', 'Delivery Method', 'Payment Method', 'Order Review'];
  const body = [`<div class="fg">${field('name', 'Full Name', 'text', 'autocomplete="name"')}${field('phone', 'Phone Number', 'tel', 'pattern="[0-9+ \\-]{7,15}" autocomplete="tel"')}
      <div class="f"><label for="country">Country</label><select id="country"><option>Pakistan</option><option>United States</option><option>United Kingdom</option><option>UAE</option></select></div>${field('city', 'City')}${field('address', 'Address', 'text', '', 'full')}${field('zip', 'Postal Code', 'text', 'pattern="[A-Za-z0-9 \\-]{3,10}"')}</div>`,
    `<div class="opts">${radio('ship', 'std', 'Standard Delivery', '3–5 business days · Free over $50')}${radio('ship', 'exp', 'Express Delivery', '1–2 business days · +$9.99')}</div>`,
    `<div class="opts">${radio('pay', 'card', 'Credit / Debit Card', 'Demo only – no card details are collected')}${radio('pay', 'cod', 'Cash on Delivery')}${radio('pay', 'paypal', 'PayPal')}${radio('pay', 'other', 'Other (bank transfer / wallet)')}</div>`,
    `<p><b>Ship to:</b> ${esc(ck.addr.name)}, ${esc(ck.addr.address)}, ${esc(ck.addr.city)} ${esc(ck.addr.zip)}, ${esc(ck.addr.country)}</p><p><b>Delivery:</b> ${ck.ship === 'exp' ? 'Express' : 'Standard'} · <b>Payment:</b> ${ck.pay.toUpperCase()}</p>
     ${cart.map(i => `<div class="ln" style="display:flex;justify-content:space-between;padding:6px 0"><span>${esc(byId(i.id).name)} × ${i.qty}</span><b>${money(byId(i.id).price * i.qty)}</b></div>`).join('')}`][s - 1];
  app.innerHTML = `<div class="wrap two"><form class="box" id="ckform" novalidate><div class="steps">${steps.map((l, i) => `<span class="${i + 1 <= s ? 'on' : ''}">${i + 1}. ${l}</span>`).join('')}</div>
    <h2 style="margin-bottom:14px">${steps[s - 1]}</h2>${body}<div class="acts">${s > 1 ? '<button type="button" class="btn ghost" data-act="back">Back</button>' : ''}<button class="btn big">${s === 4 ? 'Place Order' : 'Continue'}</button></div></form>${summary(t, '')}</div>`;
  if (s === 1) $('#country').value = ck.addr.country || 'Pakistan';
}

/* ---------- Auth & account ---------- */
function auth(mode) {
  const login = mode === 'login';
  app.innerHTML = `<div class="wrap"><form class="box auth" id="${mode}Form" novalidate><h1>${login ? 'Sign in' : 'Create your ShopHub account'}</h1>
    ${login ? '' : '<div class="f"><label for="an">Full Name</label><input id="an" required autocomplete="name"></div>'}
    <div class="f"><label for="ae">Email</label><input id="ae" type="email" required autocomplete="email"></div>
    <div class="f"><label for="ap">Password</label><input id="ap" type="password" required minlength="6" autocomplete="${login ? 'current' : 'new'}-password"></div>
    ${login ? '<label><input type="checkbox" id="rm"> Remember me</label> · <a href="#" data-act="forgot">Forgot password?</a>' : '<div class="f"><label for="ac">Confirm Password</label><input id="ac" type="password" required></div>'}
    <p class="err" id="err" role="alert"></p><button class="btn big" style="width:100%">${login ? 'Sign In' : 'Create account'}</button>
    <p style="margin-top:14px">${login ? 'New to ShopHub? <a href="#/signup"><b>Create your account</b></a>' : 'Already a member? <a href="#/login"><b>Sign in</b></a>'}</p></form></div>`;
}
function seedOrders(email) {
  if (orders.some(o => o.email === email)) return;
  const mk = (n, d, st, ids) => ({ id: 'SH-' + n, email, date: new Date(Date.now() - d * 864e5).toISOString(), status: st, items: ids.map(id => ({ id, qty: 1, price: byId(id).price })), total: ids.reduce((s, id) => s + byId(id).price, 0) * 1.08 });
  orders.push(mk(482913, 20, 'Delivered', [1, 14]), mk(551207, 6, 'Shipped', [17]), mk(603318, 40, 'Cancelled', [4]));
  store.set('orders', orders);
}
function account(q) {
  if (!user) return location.hash = '#/login';
  seedOrders(user.email);
  const tab = q.get('tab') || 'orders';
  const tabs = [['orders', 'Your Orders'], ['wishlist', 'Your Wishlist'], ['addresses', 'Your Addresses'], ['payments', 'Payment Methods'], ['settings', 'Account Settings'], ['recent', 'Recently Viewed Products']];
  const mine = orders.filter(o => o.email === user.email).sort((a, b) => b.date.localeCompare(a.date));
  const views = {
    orders: mine.length ? mine.map(o => `<div class="ord"><header><span>Order <b>${o.id}</b></span><span>${new Date(o.date).toLocaleDateString()}</span><span>Total <b>${money(o.total)}</b></span><span class="st ${o.status}">${o.status}</span></header>
      ${o.items.map(i => `<div class="ln"><img src="${byId(i.id).image}" alt=""><a href="#/product/${i.id}">${esc(byId(i.id).name)}</a> × ${i.qty}</div>`).join('')}</div>`).join('') : '<p>No orders yet.</p>',
    wishlist: `<p>${wish.length} item(s) saved.</p><a class="btn" href="#/wishlist">Open wishlist</a>`,
    addresses: ck.addr.address ? `<p><b>${esc(ck.addr.name)}</b><br>${esc(ck.addr.address)}, ${esc(ck.addr.city)} ${esc(ck.addr.zip)}<br>${esc(ck.addr.country)} · ${esc(ck.addr.phone)}</p>` : '<p>No saved addresses. One is saved when you check out.</p>',
    payments: '<p>For your security, this demo never collects or stores card details.</p>',
    settings: `<form id="setForm" class="f" style="max-width:380px"><label for="sn">Full Name</label><input id="sn" value="${esc(user.name)}" required><br><br><button class="btn">Save changes</button></form>`,
    recent: recent.length ? grid(recent.map(byId)) : '<p>No recently viewed products.</p>'
  };
  app.innerHTML = `<div class="wrap acc"><nav aria-label="Account"><h2 style="margin:0 0 10px">Hello, ${esc(user.name)}</h2>${tabs.map(([k, l]) => `<a class="${k === tab ? 'on' : ''}" href="#/account?tab=${k}">${l}</a>`).join('')}<a href="#" data-act="logout">Logout</a></nav>
    <section class="box"><h1 style="margin-bottom:14px">${tabs.find(t => t[0] === tab)?.[1]}</h1>${views[tab] || views.orders}</section></div>`;
}

/* ---------- Customer service / info pages ---------- */
function service(q) {
  const t = q.get('t') || 'Customer Service';
  const items = [['fa-box', 'Your Orders', '#/account?tab=orders', 'Track, return or buy again'], ['fa-rotate-left', 'Returns', '#/service?t=Returns', '30-day easy returns'], ['fa-truck', 'Shipping Information', '#/service?t=Shipping%20Information', 'Rates and delivery times'], ['fa-user-shield', 'Account Settings', '#/account?tab=settings', 'Manage your profile'], ['fa-headset', 'Contact Us', '#/service?t=Contact%20Us', 'We are here 24/7'], ['fa-circle-question', 'Help Center', '#/service?t=Help%20Center', 'Answers to common questions']];
  app.innerHTML = `<div class="wrap sec"><h1 style="margin-bottom:6px">${esc(t)}</h1><p style="color:var(--mut)">${t === 'Customer Service' ? 'How can we help you today?' : 'This is a demo page for ShopHub – content coming soon.'}</p><br>
    <div class="svc">${items.map(i => `<a href="${i[2]}"><i class="fa-solid ${i[0]}"></i><h3>${i[1]}</h3><p>${i[3]}</p></a>`).join('')}</div><br>
    <form class="box f" id="contactForm" style="max-width:520px"><h3 style="margin-bottom:10px">Contact us</h3><label for="cm">Your message</label><textarea id="cm" rows="4" required></textarea><br><br><button class="btn">Send message</button></form></div>`;
}

/* ---------- Event delegation ---------- */
const actions = {
  menu: () => toggleMenu(),
  sub: t => { const m = t.parentElement; m.classList.toggle('open'); t.setAttribute('aria-expanded', m.classList.contains('open')); },
  add: (t, id) => addCart(id),
  mv: (t, id) => { wish = wish.filter(i => i !== id); store.set('wish', wish); addCart(id); wishlist(); },
  buy: (t, id) => { addCart(id, 1, true); location.hash = '#/checkout'; },
  addp: (t, id) => addCart(id, +$('#qty').value),
  buyp: (t, id) => { addCart(id, +$('#qty').value, true); location.hash = '#/checkout'; },
  wish: (t, id) => toggleWish(id),
  qv: (t, id) => quickView(id),
  close: () => { $('#modal').hidden = true; },
  q: t => { const i = $('#qty'); i.value = Math.max(1, Math.min(10, +i.value + +t.dataset.d)); },
  thumb: t => { $('#mainImg').src = t.dataset.src; $$('.thumbs button').forEach(b => b.classList.toggle('on', b === t)); },
  tab: (t, id, e) => { e.preventDefault(); showTab(t.dataset.t); },
  slide: t => { clearInterval(heroT); showSlide(t.dataset.i !== undefined ? +t.dataset.i : heroI + +t.dataset.d); },
  inc: (t, id) => { const i = cart.find(c => c.id === id); i.qty = Math.min(byId(id).stock, i.qty + 1); saveCart(); cartPage(); },
  dec: (t, id) => { const i = cart.find(c => c.id === id); i.qty = Math.max(1, i.qty - 1); saveCart(); cartPage(); },
  rm: (t, id) => { cart = cart.filter(c => c.id !== id); saveCart(); toast('Removed from cart'); cartPage(); },
  save: (t, id) => { cart = cart.filter(c => c.id !== id); if (!wish.includes(id)) wish.push(id); store.set('wish', wish); saveCart(); toast('Saved for later (in your wishlist)'); cartPage(); },
  back: () => { ck.step--; checkout(); },
  ftog: () => $('#filters').classList.toggle('show'),
  fclr: () => products(new URLSearchParams()),
  forgot: (t, id, e) => { e.preventDefault(); toast('Demo: password reset link sent!'); },
  logout: (t, id, e) => { e.preventDefault(); user = null; store.set('user', null); toast('Signed out'); location.hash = '#/'; refresh(); }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (t) { const id = +t.dataset.id || t.dataset.id; actions[t.dataset.act]?.(t, id, e); }
  const s = e.target.closest('[data-s]'); if (s) runSearch(s.dataset.s);
  if (!e.target.closest('.search')) $('#suggest').hidden = true;
  if (e.target.id === 'modal') $('#modal').hidden = true;
  if (e.target.closest('#suggest a')) $('#suggest').hidden = true;
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#modal').hidden = true; toggleMenu(false); $('#suggest').hidden = true; } });

/* Filters (change events) */
document.addEventListener('change', e => {
  const f = e.target.dataset.f; if (!f) return;
  if (f === 'brand') F.brands = $$('[data-f=brand]:checked').map(i => i.value);
  else if (f === 'stock') F.stock = e.target.checked;
  else if (f === 'rating' || f === 'disc') F[f] = +e.target.value;
  else F[f] = e.target.value;
  drawGrid();
});
/* Checkout radios persist */
document.addEventListener('change', e => { if (e.target.name === 'ship' || e.target.name === 'pay') ck[e.target.name] = e.target.value; if (e.target.name === 'ship') { const t = totals(ck.ship === 'exp'); $('.sum').outerHTML = summary(t, ''); } });

/* Search bar events */
$('#sf').addEventListener('submit', e => { e.preventDefault(); runSearch($('#sq').value, $('#scat').value); });
$('#sq').addEventListener('input', suggest); $('#sq').addEventListener('focus', suggest);
$('#sclr').addEventListener('click', () => { $('#sq').value = ''; suggest(); $('#sq').focus(); if (location.hash.includes('q=')) location.hash = '#/products'; });
$('#lang').addEventListener('change', () => toast('Language preview only in this demo'));

/* Forms (login, signup, checkout, settings, contact) */
document.addEventListener('submit', e => {
  const f = e.target, id = f.id; if (!id || id === 'sf') return;
  e.preventDefault();
  const err = m => { const el = $('#err'); if (el) el.textContent = m; return false; };
  const users = store.get('users', []);
  if (id === 'signupForm') {
    const [n, em, pw, cf] = ['an', 'ae', 'ap', 'ac'].map(i => $('#' + i).value.trim());
    if (n.length < 2) return err('Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(em)) return err('Enter a valid email address.');
    if (pw.length < 6) return err('Password must be at least 6 characters.');
    if (pw !== cf) return err('Passwords do not match.');
    if (users.some(u => u.email === em.toLowerCase())) return err('An account with this email already exists.');
    users.push({ name: n, email: em.toLowerCase(), pw }); store.set('users', users);
    user = { name: n, email: em.toLowerCase() }; store.set('user', user); toast('Welcome to ShopHub!'); location.hash = '#/account';
  } else if (id === 'loginForm') {
    const em = $('#ae').value.trim().toLowerCase(), pw = $('#ap').value;
    if (!/^\S+@\S+\.\S+$/.test(em)) return err('Enter a valid email address.');
    const u = users.find(x => x.email === em && x.pw === pw);
    if (!u) return err('Incorrect email or password. (Demo: sign up first.)');
    user = { name: u.name, email: u.email }; store.set('user', user); toast('Signed in!'); location.hash = '#/account';
  } else if (id === 'ckform') {
    if (!f.reportValidity()) return;
    if (ck.step === 1) { ck.addr = Object.fromEntries(['name', 'phone', 'country', 'city', 'address', 'zip'].map(k => [k, $('#' + k).value.trim()])); store.set('addr', ck.addr); }
    if (ck.step < 4) { ck.step++; return checkout(); }
    const t = totals(ck.ship === 'exp');
    const o = { id: 'SH-' + Math.floor(100000 + Math.random() * 900000), email: user?.email || 'guest', date: new Date().toISOString(), status: 'Processing', items: cart.map(i => ({ id: i.id, qty: i.qty, price: byId(i.id).price })), total: t.total };
    orders.push(o); store.set('orders', orders); cart = []; saveCart(); ck.done = o; checkout();
  } else if (id === 'setForm') { user.name = $('#sn').value.trim() || user.name; store.set('user', user); const us = users.map(u => u.email === user.email ? { ...u, name: user.name } : u); store.set('users', us); toast('Account updated'); refresh(); account(new URLSearchParams('tab=settings')); }
  else if (id === 'contactForm') { f.reset(); toast('Message sent. We will reply soon!'); }
});

/* ---------- Init ---------- */
buildSide(); route();
