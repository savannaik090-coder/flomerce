/**
 * Fix product images by updating them with proper Firebase Storage URLs
 * and adding more products to featured-collection
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID || 'auric-a0c92',
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'auric-a0c92.firebasestorage.app'
});

const bucket = admin.storage().bucket();
const STORAGE_BUCKET = 'auric-a0c92.firebasestorage.app';

// Get public URL for an image
function getPublicImageUrl(imagePath) {
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(imagePath)}?alt=media`;
}

// Image files we uploaded
const imageFiles = [
  'IMG_20251030_073227.jpg',
  'IMG_20251030_073243.jpg',
  'IMG_20251030_073301.jpg',
  'IMG_20251030_073331.jpg',
  'IMG_20251030_073348.jpg',
  'IMG_20251030_073417.jpg'
];

// Create product data with proper image URLs
function createProduct(id, prefix, imageIndex, imageName, category) {
  const imagePath = `productImages/${imageName}`;
  const imageUrl = getPublicImageUrl(imagePath);
  
  return {
    id: `${prefix}-${String(imageIndex + 1).padStart(3, '0')}`,
    name: `Exquisite Jewellery Piece ${imageIndex + 1}`,
    price: 25000 + (imageIndex * 5000),
    description: `Beautiful handcrafted jewellery showcasing traditional craftsmanship with modern elegance. Made with high-quality materials and meticulous attention to detail. Perfect for special occasions, weddings, and celebrations.`,
    category: category,
    images: [
      {
        url: imageUrl,
        isMain: true,
        alt: `${category} product ${imageIndex + 1}`
      }
    ],
    mainImage: imageUrl,
    stock: 10,
    createdAt: new Date().toISOString(),
    featured: imageIndex < 2
  };
}

async function fetchExistingProducts(category) {
  try {
    const fileName = `${category}-products.json`;
    const file = bucket.file(`productData/${fileName}`);
    
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`No existing ${fileName} found`);
      return [];
    }
    
    const [contents] = await file.download();
    const products = JSON.parse(contents.toString());
    console.log(`Found ${products.length} existing products in ${fileName}`);
    return products;
  } catch (error) {
    console.log(`Error fetching ${category} products:`, error.message);
    return [];
  }
}

async function uploadProductJSON(category, products) {
  try {
    const fileName = `${category}-products.json`;
    const storagePath = `productData/${fileName}`;
    
    console.log(`\nUpdating ${fileName}...`);
    
    const jsonContent = JSON.stringify(products, null, 2);
    
    const file = bucket.file(storagePath);
    await file.save(jsonContent, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000'
      }
    });
    
    console.log(`✓ Successfully updated ${fileName} with ${products.length} products`);
  } catch (error) {
    console.error(`✗ Error updating product JSON:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Fixing product images and adding to collections...\n');
    
    // 1. Fix New Arrivals products
    console.log('📦 Updating New Arrivals collection...');
    const newArrivalsProducts = [];
    for (let i = 0; i < Math.min(2, imageFiles.length); i++) {
      const product = createProduct(i, 'NEW', i, imageFiles[i], 'new-arrivals');
      newArrivalsProducts.push(product);
      console.log(`  ✓ Created: ${product.id} - ${product.name}`);
    }
    await uploadProductJSON('new-arrivals', newArrivalsProducts);
    
    // 2. Update Featured Collection (add new products to existing ones)
    console.log('\n📦 Updating Featured Collection...');
    const existingFeatured = await fetchExistingProducts('featured-collection');
    
    // Add 4 new products using remaining images
    const newFeaturedProducts = [];
    for (let i = 2; i < 6; i++) {
      const product = createProduct(i, 'FEA', i, imageFiles[i], 'featured-collection');
      newFeaturedProducts.push(product);
      console.log(`  ✓ Created: ${product.id} - ${product.name}`);
    }
    
    // Combine with existing products
    const allFeaturedProducts = [...existingFeatured, ...newFeaturedProducts];
    await uploadProductJSON('featured-collection', allFeaturedProducts);
    
    console.log('\n✅ All products updated successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - New Arrivals: ${newArrivalsProducts.length} products`);
    console.log(`  - Featured Collection: ${allFeaturedProducts.length} products (${existingFeatured.length} existing + ${newFeaturedProducts.length} new)`);
    console.log('\n🎉 Products are now live with proper image URLs!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
