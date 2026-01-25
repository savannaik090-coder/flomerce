/**
 * Add all 6 products to all three collections
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

// All 6 image files
const imageFiles = [
  'IMG_20251030_073227.jpg',
  'IMG_20251030_073243.jpg',
  'IMG_20251030_073301.jpg',
  'IMG_20251030_073331.jpg',
  'IMG_20251030_073348.jpg',
  'IMG_20251030_073417.jpg'
];

// Collections to update
const collections = [
  { name: 'new-arrivals', prefix: 'NEW', displayName: 'New Arrivals' },
  { name: 'featured-collection', prefix: 'FEA', displayName: 'Featured Collection' },
  { name: 'saree-collection', prefix: 'SAR', displayName: 'Saree/Jewellery Collection' }
];

// Create product with proper image URL
function createProduct(collectionPrefix, imageIndex, imageName, categoryName) {
  const imagePath = `productImages/${imageName}`;
  const imageUrl = getPublicImageUrl(imagePath);
  
  return {
    id: `${collectionPrefix}-${String(imageIndex + 1).padStart(3, '0')}`,
    name: `Exquisite Jewellery Piece ${imageIndex + 1}`,
    price: 25000 + (imageIndex * 5000),
    description: `Beautiful handcrafted jewellery showcasing traditional craftsmanship with modern elegance. Made with high-quality materials and meticulous attention to detail. Perfect for special occasions, weddings, and celebrations.`,
    category: categoryName,
    images: [
      {
        url: imageUrl,
        isMain: true,
        alt: `${categoryName} product ${imageIndex + 1}`
      }
    ],
    mainImage: imageUrl,
    stock: 10,
    createdAt: new Date().toISOString(),
    featured: imageIndex < 2
  };
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
    console.log('🚀 Adding all 6 products to all collections...\n');
    
    for (const collection of collections) {
      console.log(`\n📦 Processing ${collection.displayName}...`);
      const products = [];
      
      // Add all 6 products to this collection
      for (let i = 0; i < imageFiles.length; i++) {
        const product = createProduct(collection.prefix, i, imageFiles[i], collection.name);
        products.push(product);
        console.log(`  ✓ Created: ${product.id} - ${product.name}`);
      }
      
      // Upload to Firebase
      await uploadProductJSON(collection.name, products);
    }
    
    console.log('\n✅ All collections updated successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Collections updated: ${collections.length}`);
    console.log(`  - Products per collection: 6`);
    console.log(`  - Total products across all collections: ${collections.length * 6}`);
    console.log('\n🎉 All products are now live on Firebase!');
    console.log('\nNote: Clear your browser cache to see the new products!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
