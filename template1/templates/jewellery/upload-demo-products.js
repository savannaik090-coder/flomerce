/**
 * Script to upload demo product images to Firebase Storage
 * and create product entries for multiple collections
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

// Image files to upload (6 images)
const imageFiles = [
  'IMG_20251030_073227.jpg',
  'IMG_20251030_073243.jpg',
  'IMG_20251030_073301.jpg',
  'IMG_20251030_073331.jpg',
  'IMG_20251030_073348.jpg',
  'IMG_20251030_073417.jpg'
];

// Collections to create products for
const collections = [
  { name: 'new-arrivals', prefix: 'NEW' },
  { name: 'jewellery-collection', prefix: 'JWL' },
  { name: 'fractured-collection', prefix: 'FRC' }
];

// Upload images to Firebase Storage
async function uploadImage(localPath, storagePath) {
  try {
    console.log(`Uploading ${localPath} to ${storagePath}...`);
    
    await bucket.upload(localPath, {
      destination: storagePath,
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=2592000, immutable'
      },
      public: true
    });
    
    console.log(`✓ Successfully uploaded ${localPath}`);
    return storagePath;
  } catch (error) {
    console.error(`✗ Error uploading ${localPath}:`, error.message);
    throw error;
  }
}

// Create product data for a collection
function createProductData(collection, imageIndex, imagePath) {
  const productId = `${collection.prefix}-${String(imageIndex + 1).padStart(3, '0')}`;
  
  return {
    id: productId,
    name: `Demo Jewellery Product ${imageIndex + 1}`,
    price: 25000 + (imageIndex * 5000), // Varying prices
    description: `Beautiful handcrafted jewellery piece showcasing traditional craftsmanship. Made with high-quality materials and attention to detail. Perfect for special occasions and celebrations.`,
    category: collection.name,
    images: [
      {
        url: imagePath,
        isMain: true,
        alt: `${collection.name} product ${imageIndex + 1}`
      }
    ],
    mainImage: imagePath,
    stock: 10,
    createdAt: new Date().toISOString(),
    featured: imageIndex === 0 // Make first product featured
  };
}

// Upload product JSON file to Firebase Storage
async function uploadProductJSON(collection, products) {
  try {
    const fileName = `${collection.name}-products.json`;
    const storagePath = `productData/${fileName}`;
    
    console.log(`\nCreating ${fileName}...`);
    
    // Convert products to JSON
    const jsonContent = JSON.stringify(products, null, 2);
    
    // Upload to Firebase Storage
    const file = bucket.file(storagePath);
    await file.save(jsonContent, {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'public, max-age=2592000'
      }
    });
    
    console.log(`✓ Successfully created ${fileName} with ${products.length} products`);
  } catch (error) {
    console.error(`✗ Error creating product JSON:`, error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting demo product upload to Firebase...\n');
    console.log(`Project: ${serviceAccount.project_id}`);
    console.log(`Bucket: ${bucket.name}\n`);
    
    // Step 1: Upload all images
    console.log('📸 Step 1: Uploading images to Firebase Storage...\n');
    const uploadedImages = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const imageFile = imageFiles[i];
      const localPath = path.join(__dirname, imageFile);
      
      // Check if file exists
      if (!fs.existsSync(localPath)) {
        console.error(`✗ File not found: ${localPath}`);
        continue;
      }
      
      const storagePath = `productImages/${imageFile}`;
      await uploadImage(localPath, storagePath);
      uploadedImages.push(storagePath);
    }
    
    console.log(`\n✓ Uploaded ${uploadedImages.length} images successfully\n`);
    
    // Step 2: Create products for each collection
    console.log('📦 Step 2: Creating product data for collections...\n');
    
    for (const collection of collections) {
      const products = [];
      
      // Create 2 products per collection (using first 2 images)
      // You can adjust this to use all 6 images if you want
      for (let i = 0; i < Math.min(2, uploadedImages.length); i++) {
        const product = createProductData(collection, i, uploadedImages[i]);
        products.push(product);
        console.log(`  Created product: ${product.id} - ${product.name}`);
      }
      
      // Upload product JSON to Firebase Storage
      await uploadProductJSON(collection, products);
    }
    
    console.log('\n✅ All products uploaded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Images uploaded: ${uploadedImages.length}`);
    console.log(`  - Collections created: ${collections.length}`);
    console.log(`  - Products per collection: 2`);
    console.log(`  - Total products: ${collections.length * 2}`);
    
    console.log('\n🎉 Demo products are now live on Firebase!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main();
