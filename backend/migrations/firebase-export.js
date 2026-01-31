/**
 * Firebase to Cloudflare D1 Data Migration Script
 * 
 * This script exports data from Firebase Firestore and imports it into Cloudflare D1.
 * 
 * Prerequisites:
 * 1. Firebase Admin SDK credentials (service account JSON)
 * 2. Cloudflare D1 database created
 * 3. D1 schema already applied
 * 
 * Usage:
 * 1. Set environment variables:
 *    - FIREBASE_SERVICE_ACCOUNT: Path to Firebase service account JSON
 *    - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
 *    - CLOUDFLARE_API_TOKEN: Your Cloudflare API token
 *    - D1_DATABASE_ID: Your D1 database ID
 * 
 * 2. Run: node firebase-export.js
 */

const COLLECTIONS_TO_MIGRATE = [
  { 
    name: 'users',
    transform: (doc) => ({
      id: doc.id,
      email: doc.data.email?.toLowerCase() || '',
      password_hash: 'NEEDS_RESET', // Users will need to reset passwords
      name: doc.data.displayName || doc.data.name || 'User',
      phone: doc.data.phone || null,
      email_verified: doc.data.emailVerified ? 1 : 0,
      created_at: doc.data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })
  },
  {
    name: 'sites',
    firestoreName: 'websites',
    transform: (doc) => ({
      id: doc.id,
      user_id: doc.data.ownerId || doc.data.userId,
      subdomain: doc.data.subdomain,
      brand_name: doc.data.brandName || doc.data.siteName || 'My Store',
      category: doc.data.category || 'jewellery',
      template_id: doc.data.templateId || 'template1',
      logo_url: doc.data.logoUrl || null,
      primary_color: doc.data.primaryColor || '#000000',
      secondary_color: doc.data.secondaryColor || '#ffffff',
      phone: doc.data.phone || null,
      email: doc.data.email || null,
      address: doc.data.address || null,
      social_links: JSON.stringify(doc.data.socialLinks || {}),
      settings: JSON.stringify(doc.data.settings || {}),
      is_active: 1,
      subscription_plan: doc.data.subscriptionPlan || 'free',
      created_at: doc.data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })
  },
  {
    name: 'orders',
    subcollection: true,
    parentCollection: 'users',
    transform: (doc, parentId) => ({
      id: doc.id,
      site_id: doc.data.siteId,
      user_id: parentId,
      order_number: doc.data.orderNumber || `ORD-${doc.id.substring(0, 8).toUpperCase()}`,
      status: doc.data.status || 'pending',
      items: JSON.stringify(doc.data.products || doc.data.items || []),
      subtotal: doc.data.subtotal || doc.data.total || 0,
      discount: doc.data.discount || 0,
      shipping_cost: doc.data.shippingCost || 0,
      tax: doc.data.tax || 0,
      total: doc.data.total || 0,
      payment_method: doc.data.paymentMethod || 'cod',
      payment_status: doc.data.paymentStatus || 'pending',
      shipping_address: JSON.stringify(doc.data.shippingAddress || doc.data.address || {}),
      customer_name: doc.data.customerName || 'Customer',
      customer_email: doc.data.customerEmail || null,
      customer_phone: doc.data.customerPhone || '',
      tracking_number: doc.data.trackingNumber || null,
      carrier: doc.data.carrier || null,
      created_at: doc.data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })
  },
  {
    name: 'guest_orders',
    firestoreName: 'guest-orders',
    transform: (doc) => ({
      id: doc.id,
      site_id: doc.data.siteId,
      order_number: doc.data.orderNumber || `ORD-${doc.id.substring(0, 8).toUpperCase()}`,
      status: doc.data.status || 'pending',
      items: JSON.stringify(doc.data.products || doc.data.items || []),
      subtotal: doc.data.subtotal || doc.data.total || 0,
      total: doc.data.total || 0,
      payment_method: doc.data.paymentMethod || 'cod',
      payment_status: doc.data.paymentStatus || 'pending',
      shipping_address: JSON.stringify(doc.data.shippingAddress || doc.data.address || {}),
      customer_name: doc.data.customerName || 'Customer',
      customer_email: doc.data.customerEmail || null,
      customer_phone: doc.data.customerPhone || '',
      created_at: doc.data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    })
  },
];

async function exportFirestoreToJSON() {
  console.log('=== Firebase to D1 Migration ===\n');
  console.log('This is a template script. To run the actual migration:\n');
  console.log('1. Install dependencies:');
  console.log('   npm install firebase-admin\n');
  console.log('2. Set up Firebase Admin SDK with your service account\n');
  console.log('3. Uncomment and customize the migration code below\n');
  console.log('4. Run with: node firebase-export.js\n');
  
  console.log('Collections to migrate:');
  COLLECTIONS_TO_MIGRATE.forEach(col => {
    console.log(`  - ${col.firestoreName || col.name} -> ${col.name}`);
  });
  
  console.log('\n=== Migration Template ===\n');
  
  const sampleMigrationCode = `
// Uncomment this code and add your Firebase credentials to run migration

/*
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  for (const collection of COLLECTIONS_TO_MIGRATE) {
    console.log(\`Migrating \${collection.firestoreName || collection.name}...\`);
    
    const snapshot = await db.collection(collection.firestoreName || collection.name).get();
    const records = [];
    
    snapshot.forEach(doc => {
      const transformed = collection.transform({ id: doc.id, data: doc.data() });
      records.push(transformed);
    });
    
    // Write to JSON file for D1 import
    const fs = require('fs');
    fs.writeFileSync(
      \`./exports/\${collection.name}.json\`,
      JSON.stringify(records, null, 2)
    );
    
    console.log(\`  Exported \${records.length} records\`);
  }
  
  console.log('\\nExport complete! Import to D1 using:');
  console.log('  wrangler d1 execute <database-name> --file=./schema/d1-schema.sql');
  console.log('  Then use D1 bulk import or individual INSERT statements');
}

migrate().catch(console.error);
*/
`;

  console.log(sampleMigrationCode);
}

async function generateD1ImportSQL(collection, records) {
  if (records.length === 0) return '';
  
  const columns = Object.keys(records[0]);
  const values = records.map(record => {
    const vals = columns.map(col => {
      const val = record[col];
      if (val === null) return 'NULL';
      if (typeof val === 'number') return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    return `(${vals.join(', ')})`;
  });
  
  return `INSERT INTO ${collection} (${columns.join(', ')}) VALUES\n${values.join(',\n')};\n`;
}

async function migrateR2Files() {
  console.log('\n=== R2 File Migration ===\n');
  console.log('To migrate files from Firebase Storage to Cloudflare R2:\n');
  console.log('1. Download files from Firebase Storage using gsutil or Firebase console\n');
  console.log('2. Upload to R2 using wrangler:');
  console.log('   wrangler r2 object put <bucket-name>/<path> --file=<local-file>\n');
  console.log('3. Or use the R2 API for bulk uploads\n');
  
  console.log('File structure migration:');
  console.log('  Firebase: products/{category}/products.json');
  console.log('       -> R2: products/{site_id}/{category}/products.json\n');
  console.log('  Firebase: images/products/{productId}/*');
  console.log('       -> R2: images/{site_id}/products/{productId}/*\n');
  console.log('  Firebase: logos/{siteId}/*');
  console.log('       -> R2: logos/{site_id}/*\n');
}

exportFirestoreToJSON();
migrateR2Files();

module.exports = {
  COLLECTIONS_TO_MIGRATE,
  generateD1ImportSQL,
};
