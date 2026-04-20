export const policies = {
  shippingRegions: 'We deliver across India with express and standard shipping options',
  shippingCharges: 'Free shipping on orders above ₹999. Standard shipping ₹79 for orders below ₹999',
  shippingDeliveryTime: '3-5 business days for metro cities. 5-7 business days for other locations',
  shippingTracking: 'Track your order in real-time via SMS, email, and WhatsApp updates',
  returnPolicy: '15-day easy return and exchange policy for unused items with original tags attached',
  returnReplacements: 'Size exchanges available subject to stock. Replacements for manufacturing defects',
  returnMandatory: 'Items must be unworn, unwashed, with all original tags and packaging intact',
  careGuideWashing: 'Follow the care label instructions on each garment. Use mild detergent and cold water for delicate fabrics',
  careGuideCleaning: 'Dry clean recommended for embroidered and embellished pieces. Spot clean minor stains gently',
  careGuideMaintenance: 'Store in a cool, dry place away from direct sunlight. Use padded hangers for structured garments',
};

export const policyPlaceholders = {
  shippingRegions: 'e.g., All India delivery with express options',
  shippingCharges: 'e.g., Free above ₹999, ₹79 for smaller orders',
  shippingDeliveryTime: 'e.g., 3-5 days metro, 5-7 days other areas',
  shippingTracking: 'e.g., SMS, email, and WhatsApp tracking',
  returnPolicy: 'e.g., 15-day easy return with original tags',
  returnReplacements: 'e.g., Size exchanges subject to stock',
  returnMandatory: 'e.g., Unworn, unwashed, with original tags',
  careGuideCleaning: 'e.g., Dry clean for embroidered pieces',
  careGuideWashing: 'e.g., Follow care label, mild detergent, cold water',
  careGuideMaintenance: 'e.g., Store away from sunlight, use padded hangers',
};

export const aboutPage = {
  heroSubtitle: 'Discover our story and the passion behind every collection we design',
  storyText: 'Welcome to {brandName}. We are passionate about fashion and dedicated to bringing you stylish, high-quality clothing for every occasion.\n\nOur team of designers draws inspiration from global trends while staying true to timeless style. Every garment in our collection is thoughtfully designed and crafted with attention to detail.\n\nWe believe fashion should be accessible, comfortable, and expressive. That\'s why we create versatile pieces that help you look and feel your best.',
  sections: [
    { heading: 'Our Mission', text: '{brandName} is more than just a clothing brand – it is about empowering you to express yourself through style.\n\nWe aim to make fashion accessible and sustainable, creating collections that are as kind to the planet as they are to your wardrobe.\n\nOur commitment goes beyond great clothing – we are building a community of fashion lovers who believe in quality, creativity, and individuality.', visible: true },
  ],
};

export const heroSliderDefaults = [
  { title: 'NEW', subtitle: 'Season', description: 'SUMMER COLLECTION', buttonText: 'SHOP NOW', buttonLink: '/category/new-arrivals', visible: true },
  { title: 'ETHNIC', subtitle: 'Elegance', description: 'FESTIVE WEAR', buttonText: 'EXPLORE', buttonLink: '/category/featured', visible: true },
  { title: 'TRENDING', subtitle: 'Styles', description: 'LATEST FASHION', buttonText: 'SHOP NOW', buttonLink: '/category/all', visible: true },
];

export const featuredVideo = {
  title: "Discover Your Perfect Style",
  description: "Explore our latest fashion collection crafted for every occasion. Connect with our stylists and find the perfect outfit that defines you",
};

export const featuredVideoPlaceholders = {
  title: "e.g., Discover Your Perfect Style",
  description: "e.g., Explore our latest fashion collection crafted for every occasion. Connect with our stylists and find the perfect outfit that defines you",
};

export const watchAndBuyDefaults = [
  { id: 'default-1', title: 'Summer Collection', productSku: '', videoUrl: '' },
  { id: 'default-2', title: 'Ethnic Wear', productSku: '', videoUrl: '' },
  { id: 'default-3', title: 'Party Outfits', productSku: '', videoUrl: '' },
  { id: 'default-4', title: 'Casual Essentials', productSku: '', videoUrl: '' },
  { id: 'default-5', title: 'New Arrivals', productSku: '', videoUrl: '' },
  { id: 'default-6', title: 'Trending Styles', productSku: '', videoUrl: '' },
];

export const shopTheLookDefaults = {
  title: 'Shop the Look',
  image: 'https://placehold.co/600x800/f5f0fa/5b4a8a?text=Upload+Your+Look+Image',
  dots: [
    { x: 50, y: 20, sku: '' },
    { x: 40, y: 50, sku: '' },
    { x: 55, y: 75, sku: '' },
  ],
};

export const trendingProductsDefaults = [
  { id: 'demo-c-1', name: 'Floral Maxi Dress', slug: 'demo', price: 1499, compare_at_price: 2499, images: [], _isDemo: true },
  { id: 'demo-c-2', name: 'Embroidered Kurti', slug: 'demo', price: 999, compare_at_price: 1799, images: [], _isDemo: true },
  { id: 'demo-c-3', name: 'Silk Saree', slug: 'demo', price: 3499, compare_at_price: 4999, images: [], _isDemo: true },
  { id: 'demo-c-4', name: 'Designer Lehenga', slug: 'demo', price: 6999, compare_at_price: 9999, images: [], _isDemo: true },
  { id: 'demo-c-5', name: 'Casual Top', slug: 'demo', price: 799, compare_at_price: 1299, images: [], _isDemo: true },
  { id: 'demo-c-6', name: 'Anarkali Suit', slug: 'demo', price: 2299, compare_at_price: 3499, images: [], _isDemo: true },
  { id: 'demo-c-7', name: 'Denim Jacket', slug: 'demo', price: 1899, compare_at_price: 2999, images: [], _isDemo: true },
  { id: 'demo-c-8', name: 'Co-ord Set', slug: 'demo', price: 1799, compare_at_price: 2799, images: [], _isDemo: true },
];

export const demoCategoriesDefaults = [
  { id: 'demo-cat-c-1', name: 'New Arrivals', slug: 'demo', subtitle: 'Fresh styles this season', image_url: '', browseImage: '', _isDemo: true },
  { id: 'demo-cat-c-2', name: 'Ethnic Wear', slug: 'demo', subtitle: 'Traditional elegance', image_url: '', browseImage: '', _isDemo: true },
  { id: 'demo-cat-c-3', name: 'Western Wear', slug: 'demo', subtitle: 'Everyday chic', image_url: '', browseImage: '', _isDemo: true },
  { id: 'demo-cat-c-4', name: 'Bridal Collection', slug: 'demo', subtitle: 'Wedding statements', image_url: '', browseImage: '', _isDemo: true },
  { id: 'demo-cat-c-5', name: 'Casual Tops', slug: 'demo', subtitle: 'Light & comfy', image_url: '', browseImage: '', _isDemo: true },
  { id: 'demo-cat-c-6', name: 'Accessories', slug: 'demo', subtitle: 'Complete the look', image_url: '', browseImage: '', _isDemo: true },
];

export const defaultReviews = [
  { text: '"The fabric quality is amazing and the fit is perfect. Exactly as shown in the pictures!"', rating: 5, image: 'https://placehold.co/400x400/f0f4ff/5b6abf?text=Perfect+Fit' },
  { text: '"Loved the outfit! Great stitching, comfortable material, and fast delivery"', rating: 5, image: 'https://placehold.co/400x400/fdf2f8/a855a0?text=Loved+It' },
  { text: '"Beautiful collection and excellent quality. Will definitely order again!"', rating: 5, image: 'https://placehold.co/400x400/fef3c7/b8860b?text=Great+Quality' },
  { text: '"The dress fits perfectly and the color is exactly as shown. Very happy with my purchase"', rating: 5, image: 'https://placehold.co/400x400/f0fdf4/6b8e5a?text=Happy+Customer' },
  { text: '"Super soft fabric and trendy designs. Got so many compliments wearing this!"', rating: 5, image: 'https://placehold.co/400x400/fff5f5/d4746a?text=Trendy+Style' },
];
