/* ShopHub product data – kept separate from UI logic. */

// Generates an inline SVG placeholder image (no external requests needed)
function svgImg(emoji, hue = 30, w = 600) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,92%)"/><stop offset="1" stop-color="hsl(${hue + 30},60%,80%)"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><text x="100" y="125" font-size="90" text-anchor="middle">${emoji}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(s);
}

const CATS = [
  { name: 'Electronics', emoji: '🎧', hue: 215 }, { name: 'Fashion', emoji: '👟', hue: 340 },
  { name: 'Home & Kitchen', emoji: '🍳', hue: 30 }, { name: 'Beauty', emoji: '💄', hue: 310 },
  { name: 'Mobile Phones', emoji: '📱', hue: 170 }, { name: 'Computers', emoji: '💻', hue: 250 },
  { name: 'Sports', emoji: '⚽', hue: 120 }, { name: 'Books', emoji: '📚', hue: 45 }
];

// name, category, brand, price, oldPrice, rating, reviews, emoji
const RAW = [
  ['Wireless Noise-Cancelling Headphones', 'Electronics', 'Sony', 129.99, 249.99, 4.7, 12450, '🎧'],
  ['Fitness Smart Watch', 'Electronics', 'Apple', 199, 299, 4.6, 8210, '⌚'],
  ['Portable Bluetooth Speaker', 'Electronics', 'Sony', 49.99, 79.99, 4.5, 5320, '🔊'],
  ['43" 4K Smart TV', 'Electronics', 'Samsung', 329, 499, 4.4, 3987, '📺'],
  ['True Wireless Earbuds', 'Electronics', 'Samsung', 59, 99, 4.3, 9120, '🎵'],
  ['20000mAh Power Bank', 'Electronics', 'ShopHub', 24.99, 39.99, 4.5, 2210, '🔋'],
  ['Smartphone Pro 128GB', 'Mobile Phones', 'Apple', 799, 899, 4.8, 20112, '📱'],
  ['5G Smartphone 256GB', 'Mobile Phones', 'Samsung', 599, 799, 4.6, 11876, '📲'],
  ['ShopHub Lite Phone 64GB', 'Mobile Phones', 'ShopHub', 149, 199, 4.1, 1980, '📱'],
  ['Phone Case & Fast Charger Bundle', 'Mobile Phones', 'ShopHub', 19.99, 34.99, 4.2, 4410, '🔌'],
  ['15.6" Everyday Laptop', 'Computers', 'HP', 549, 749, 4.4, 6540, '💻'],
  ['14" Ultra-Slim Laptop', 'Computers', 'Dell', 699, 899, 4.5, 4120, '🖥️'],
  ['10.9" Tablet 64GB', 'Computers', 'Apple', 449, 549, 4.7, 7733, '📟'],
  ['Wireless Ergonomic Mouse', 'Computers', 'HP', 19.99, 29.99, 4.4, 15220, '🖱️'],
  ['Mechanical Gaming Keyboard', 'Computers', 'Dell', 49.99, 79.99, 4.5, 6050, '⌨️'],
  ['27" Full HD Monitor', 'Computers', 'Dell', 179, 249, 4.6, 5301, '🖥️'],
  ['Men\'s Running Shoes', 'Fashion', 'Nike', 69.99, 119.99, 4.6, 18400, '👟'],
  ['Comfort Fleece Hoodie', 'Fashion', 'Adidas', 39.99, 64.99, 4.4, 7210, '🧥'],
  ['Classic Denim Jacket', 'Fashion', 'ShopHub', 49, 89, 4.3, 2890, '🧥'],
  ['Leather Travel Backpack', 'Fashion', 'ShopHub', 59, 99, 4.5, 3640, '🎒'],
  ['5L Digital Air Fryer', 'Home & Kitchen', 'ShopHub', 69.99, 129.99, 4.6, 22100, '🍟'],
  ['Programmable Coffee Maker', 'Home & Kitchen', 'ShopHub', 44.99, 79.99, 4.4, 8420, '☕'],
  ['10-Piece Non-Stick Cookware Set', 'Home & Kitchen', 'ShopHub', 79, 149, 4.5, 6130, '🍳'],
  ['Smart Robot Vacuum', 'Home & Kitchen', 'Samsung', 199, 349, 4.3, 4980, '🤖'],
  ['Vitamin C Brightening Serum', 'Beauty', 'ShopHub', 14.99, 24.99, 4.5, 13200, '🧴'],
  ['Ionic Hair Dryer', 'Beauty', 'ShopHub', 34.99, 59.99, 4.4, 5870, '💇'],
  ['Luxury Perfume Gift Set', 'Beauty', 'ShopHub', 39, 69, 4.2, 2310, '🌸'],
  ['Non-Slip Yoga Mat', 'Sports', 'Nike', 24.99, 39.99, 4.6, 9340, '🧘'],
  ['Adjustable Dumbbell Set', 'Sports', 'ShopHub', 89, 149, 4.7, 4210, '🏋️'],
  ['Match Training Football', 'Sports', 'Adidas', 19.99, 29.99, 4.5, 3120, '⚽'],
  ['The Midnight Library – Bestselling Novel', 'Books', 'ShopHub', 9.99, 17.99, 4.7, 31500, '📖'],
  ['Clean Code Programming Handbook', 'Books', 'ShopHub', 29.99, 49.99, 4.8, 8900, '📘'],
  ['Kids Illustrated Story Collection', 'Books', 'ShopHub', 12.99, 19.99, 4.6, 2760, '📚']
];

const PRODUCTS = RAW.map((r, i) => {
  const [name, category, brand, price, oldPrice, rating, reviews, emoji] = r;
  const discount = Math.round(100 - (price / oldPrice) * 100);
  const hue = (CATS.find(c => c.name === category)?.hue || 30) + (i % 5) * 6;
  return {
    id: i + 1, name, category, brand, price, oldPrice, discount, rating, reviews, emoji,
    description: `${name} by ${brand}. Premium quality, reliable performance and great value – backed by the ShopHub 30-day return guarantee.`,
    image: svgImg(emoji, hue),
    gallery: [0, 40, 80, 120].map((d, k) => svgImg(k === 0 ? emoji : emoji, hue + d)),
    stock: i % 9 === 4 ? 0 : 5 + ((i * 7) % 40),
    colors: ['Fashion', 'Electronics', 'Mobile Phones'].includes(category) ? ['Black', 'Silver', 'Blue'] : [],
    sizes: category === 'Fashion' ? ['S', 'M', 'L', 'XL'] : [],
    badge: i % 4 === 0 ? 'Best Seller' : i % 5 === 0 ? 'New' : discount + '% OFF'
  };
});

// Side-menu structure with sub-categories
const MENU = {
  'Electronics': ['Headphones', 'Speakers', 'Smart Watch', 'TV'],
  'Computers': ['Laptop', 'Monitor', 'Keyboard', 'Tablet'],
  'Mobile Phones': ['Smartphone', 'Chargers', 'Cases'],
  'Fashion': ['Shoes', 'Jacket', 'Backpack'],
  'Beauty': ['Skincare', 'Hair', 'Perfume'],
  'Home & Kitchen': ['Cookware', 'Appliances', 'Vacuum'],
  'Grocery': ['Snacks', 'Beverages'],
  'Sports': ['Fitness', 'Football', 'Yoga'],
  'Books': ['Novel', 'Programming', 'Kids'],
  'Toys': ['Puzzles', 'Dolls'],
  'Automotive': ['Car Care', 'Accessories']
};
