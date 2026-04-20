export const policies = {
  shippingRegions: 'We ship across India and select international destinations',
  shippingCharges: 'Free shipping on orders above ₹2,000. Standard shipping ₹99 for orders below ₹2,000',
  shippingDeliveryTime: '5-7 business days for domestic orders. 10-15 business days for international orders',
  shippingTracking: 'Real-time tracking via SMS and email once your order is dispatched',
  returnPolicy: '7-day return policy for unused and undamaged items in original packaging. Custom or personalized jewellery is non-returnable',
  returnReplacements: 'Replacements available for damaged or defective items within 48 hours of delivery',
  returnMandatory: 'Original invoice, undamaged packaging, and all product tags must be intact for returns',
  careGuideWashing: 'Avoid contact with water, perfumes, and chemicals. Remove jewellery before bathing or swimming',
  careGuideCleaning: 'Gently wipe with a soft dry cloth after each use. Use a jewellery polishing cloth for shine',
  careGuideMaintenance: 'Store in the provided jewellery box or a soft pouch. Keep pieces separated to avoid scratches',
};

export const policyPlaceholders = {
  shippingRegions: 'e.g., Pan-India and select international destinations',
  shippingCharges: 'e.g., Free above ₹2,000, ₹99 for smaller orders',
  shippingDeliveryTime: 'e.g., 5-7 business days domestic, 10-15 international',
  shippingTracking: 'e.g., Real-time SMS and email tracking',
  returnPolicy: 'e.g., 7-day return for unused items. Custom pieces non-returnable',
  returnReplacements: 'e.g., Replacements for damaged items within 48 hours',
  returnMandatory: 'e.g., Original invoice and undamaged packaging required',
  careGuideCleaning: 'e.g., Wipe with soft dry cloth after each use',
  careGuideWashing: 'e.g., Avoid water, perfumes, and chemicals',
  careGuideMaintenance: 'e.g., Store in jewellery box, keep pieces separated',
};

export const aboutPage = {
  heroSubtitle: 'Discover our story, heritage, and the passion behind every exquisite piece we create',
  storyText: 'Welcome to {brandName}. We are dedicated to bringing you the finest jewellery with unmatched quality and craftsmanship that speaks for itself.\n\nOur commitment to authentic craftsmanship and traditional artistry has made us one of the most trusted names in the jewellery industry. Every piece in our collection reflects expertise, artistic brilliance, and timeless beauty.\n\nWe believe in creating experiences, not just jewellery. Each item is carefully curated and crafted to perfection for discerning customers worldwide.',
  sections: [
    { heading: 'Our Mission', text: '{brandName} is more than just a brand – it is a commitment to excellence, quality, and customer satisfaction that drives everything we do.\n\nWe aim to preserve and promote the finest traditions of craftsmanship, creating masterpieces that blend timeless elegance with contemporary appeal.\n\nOur commitment extends beyond creating beautiful products – we are dedicated to supporting artisans, preserving techniques, and ensuring that this heritage continues to shine for generations to come.', visible: true },
  ],
};

export const heroSliderDefaults = [
  { title: 'BRIDAL', subtitle: 'Jewellery', description: 'WEDDING COLLECTION', buttonText: 'SHOP NOW', buttonLink: '/category/new-arrivals', visible: true },
  { title: 'TIMELESS', subtitle: 'Elegance', description: 'GOLD & DIAMOND', buttonText: 'EXPLORE', buttonLink: '/category/featured', visible: true },
  { title: 'HERITAGE', subtitle: 'Collection', description: 'TEMPLE JEWELLERY', buttonText: 'SHOP NOW', buttonLink: '/category/all', visible: true },
];

export const featuredVideo = {
  title: "Let's Create Your Perfect Bridal Jewelry",
  description: "Dreaming of something truly elegant? Discover our exquisite jewelry collection. Connect with our designers and create your perfect bridal ensemble",
};

export const featuredVideoPlaceholders = {
  title: "e.g., Let's Create Your Perfect Bridal Jewelry",
  description: "e.g., Dreaming of something truly elegant? Discover our exquisite jewelry collection. Connect with our designers and create your perfect bridal ensemble",
};

export const watchAndBuyDefaults = [
  { id: 'default-1', title: 'Bridal Collection', productSku: '', videoUrl: '' },
  { id: 'default-2', title: 'Gold Necklace Set', productSku: '', videoUrl: '' },
  { id: 'default-3', title: 'Diamond Earrings', productSku: '', videoUrl: '' },
  { id: 'default-4', title: 'Temple Jewellery', productSku: '', videoUrl: '' },
  { id: 'default-5', title: 'Kundan Collection', productSku: '', videoUrl: '' },
  { id: 'default-6', title: 'Bangles & Kadas', productSku: '', videoUrl: '' },
];

export const shopTheLookDefaults = {
  title: 'Shop the Look',
  image: 'https://placehold.co/600x800/faf5ef/5a3f2a?text=Upload+Your+Look+Image',
  dots: [
    { x: 50, y: 25, sku: '' },
    { x: 35, y: 45, sku: '' },
    { x: 65, y: 70, sku: '' },
  ],
};

export const trendingProductsDefaults = [
  { id: 'demo-j-1', name: 'Gold Necklace Set', slug: 'demo', price: 24999, compare_at_price: 29999, images: ['https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&auto=format&fit=crop&q=75'], _isDemo: true },
  { id: 'demo-j-2', name: 'Diamond Earrings', slug: 'demo', price: 18999, compare_at_price: 22999, images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=75'], _isDemo: true },
  { id: 'demo-j-3', name: 'Bridal Choker', slug: 'demo', price: 34999, compare_at_price: 39999, images: ['https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&auto=format&fit=crop&q=75'], _isDemo: true },
  { id: 'demo-j-4', name: 'Temple Bangles', slug: 'demo', price: 9999, compare_at_price: 12999, images: ['https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&auto=format&fit=crop&q=75'], _isDemo: true },
  { id: 'demo-j-5', name: 'Solitaire Ring', slug: 'demo', price: 15999, compare_at_price: 19999, images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=75'], _isDemo: true },
  { id: 'demo-j-6', name: 'Pearl Pendant', slug: 'demo', price: 4999, compare_at_price: 6999, images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=75'], _isDemo: true },
  { id: 'demo-j-7', name: 'Kundan Set', slug: 'demo', price: 28999, compare_at_price: 34999, images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&auto=format&fit=crop&q=75'], _isDemo: true },
  { id: 'demo-j-8', name: 'Gold Bracelet', slug: 'demo', price: 12999, compare_at_price: 15999, images: ['https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=600&auto=format&fit=crop&q=75'], _isDemo: true },
];

export const demoCategoriesDefaults = [
  { id: 'demo-cat-j-1', name: 'Necklaces', slug: 'demo', subtitle: 'Statement neckpieces', image_url: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=900&auto=format&fit=crop&q=75', browseImage: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=900&auto=format&fit=crop&q=75', _isDemo: true },
  { id: 'demo-cat-j-2', name: 'Earrings', slug: 'demo', subtitle: 'Studs to chandeliers', image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&auto=format&fit=crop&q=75', browseImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&auto=format&fit=crop&q=75', _isDemo: true },
  { id: 'demo-cat-j-3', name: 'Rings', slug: 'demo', subtitle: 'Timeless rings', image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&auto=format&fit=crop&q=75', browseImage: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&auto=format&fit=crop&q=75', _isDemo: true },
  { id: 'demo-cat-j-4', name: 'Bridal', slug: 'demo', subtitle: 'For your big day', image_url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=900&auto=format&fit=crop&q=75', browseImage: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=900&auto=format&fit=crop&q=75', _isDemo: true },
  { id: 'demo-cat-j-5', name: 'Bangles', slug: 'demo', subtitle: 'Tradition reimagined', image_url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=900&auto=format&fit=crop&q=75', browseImage: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=900&auto=format&fit=crop&q=75', _isDemo: true },
  { id: 'demo-cat-j-6', name: 'Temple Jewellery', slug: 'demo', subtitle: 'Heritage craft', image_url: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=900&auto=format&fit=crop&q=75', browseImage: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=900&auto=format&fit=crop&q=75', _isDemo: true },
];

export const defaultReviews = [
  { text: '"Received parcel. Jewelry quality is excellent. Thank you so much!"', rating: 5, image: 'https://placehold.co/400x400/fff5f5/d4a574?text=Customer+Review' },
  { text: '"Loved my purchase. You have a great collection... will definitely add more!"', rating: 5, image: 'https://placehold.co/400x400/fdf2f8/c084a0?text=Happy+Customer' },
  { text: '"Thanks dear I received my parcel. It\'s amazing, very beautiful set"', rating: 5, image: 'https://placehold.co/400x400/fef3c7/b8860b?text=Beautiful+Set' },
  { text: '"The craftsmanship is amazing. Jewelry is exactly same as shown in image"', rating: 5, image: 'https://placehold.co/400x400/f0fdf4/6b8e5a?text=Great+Quality' },
  { text: '"Got this. Good quality and good response fast delivery"', rating: 5, image: 'https://placehold.co/400x400/eff6ff/6b8fb5?text=Fast+Delivery' },
];
