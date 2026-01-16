
const fs = require('fs');
const path = require('path');

// Extract navbar HTML from index.html
function extractNavbarFromHomepage() {
    const indexContent = fs.readFileSync('index.html', 'utf-8');
    
    // Extract the entire header section including promo banner and navbar
    const headerStart = indexContent.indexOf('<!-- Header -->');
    const headerEnd = indexContent.indexOf('<!-- Overlay for menu background -->');
    
    if (headerStart === -1 || headerEnd === -1) {
        throw new Error('Could not find header section in index.html');
    }
    
    return indexContent.substring(headerStart, headerEnd).trim();
}

// Replace navbar in a file
function updateNavbarInFile(filePath, navbarHtml) {
    console.log(`Processing ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Find and replace the header section
    const headerStart = content.indexOf('<!-- Header -->');
    const overlayStart = content.indexOf('<!-- Overlay for menu background -->');
    
    if (headerStart === -1 || overlayStart === -1) {
        console.log(`⚠️  Could not find header section in ${filePath}`);
        return false;
    }
    
    // Replace the header section
    const beforeHeader = content.substring(0, headerStart);
    const afterOverlay = content.substring(overlayStart);
    
    const updatedContent = beforeHeader + navbarHtml + '\n\n    ' + afterOverlay;
    
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`✅ Updated ${filePath}`);
    return true;
}

// List of files to update (excluding index.html)
const filesToUpdate = [
    'about-us.html',
    'contact-us.html',
    'book-appointment.html',
    'all-collection.html',
    'featured-collection.html',
    'new-arrivals.html',
    'saree-collection.html',
    'gold-necklace.html',
    'gold-earrings.html',
    'gold-rings.html',
    'gold-bangles.html',
    'silver-necklace.html',
    'silver-earrings.html',
    'silver-rings.html',
    'silver-bangles.html',
    'meenakari-necklace.html',
    'meenakari-earrings.html',
    'meenakari-rings.html',
    'meenakari-bangles.html',
    'login.html',
    'signup.html',
    'profile.html',
    'checkout.html',
    'product-detail.html',
    'terms-conditions.html',
    'privacy-policy.html',
    'order-track.html',
    'track-order.html',
    'verify-email.html',
    'reset-password.html'
];

console.log('🚀 Starting navbar update process...\n');

try {
    // Extract navbar from homepage
    console.log('📖 Extracting navbar from index.html...');
    const navbarHtml = extractNavbarFromHomepage();
    console.log('✅ Navbar extracted successfully\n');
    
    // Update each file
    let successCount = 0;
    let failCount = 0;
    
    filesToUpdate.forEach(file => {
        if (fs.existsSync(file)) {
            if (updateNavbarInFile(file, navbarHtml)) {
                successCount++;
            } else {
                failCount++;
            }
        } else {
            console.log(`⚠️  File not found: ${file}`);
            failCount++;
        }
    });
    
    console.log('\n✨ Navbar update complete!');
    console.log(`📊 Summary: ${successCount} files updated, ${failCount} files skipped/failed`);
    console.log('\nUpdated navbar includes:');
    console.log('  • Promo banner with rotation');
    console.log('  • Royal Meenakari branding');
    console.log('  • Hamburger menu icon');
    console.log('  • Navigation links with dropdowns');
    console.log('  • Mobile menu with close button');
    console.log('  • Search, account, wishlist, and cart icons');
    console.log('  • Mobile account links');
    
} catch (error) {
    console.error('❌ Error updating navbar:', error.message);
    process.exit(1);
}
