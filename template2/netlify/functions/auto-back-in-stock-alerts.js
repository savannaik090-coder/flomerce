const admin = require('firebase-admin');

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function initAdmin() {
    if (admin.apps.length > 0) return;
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('FIREBASE_PRIVATE_KEY environment variable is required');
    }
    
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: formattedPrivateKey,
            privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
            client_x509_cert_url: process.env.FIREBASE_CERT_URL
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
    
    try {
        initAdmin();
        
        console.log('[auto-back-in-stock-alerts] Back-in-stock notification triggered');
        
        const requestData = JSON.parse(event.body || '{}');
        console.log('[auto-back-in-stock-alerts] Parsed request data:', JSON.stringify(requestData, null, 2));
        
        const { productId, productName, productImage } = requestData;
        
        console.log('[auto-back-in-stock-alerts] Extracted fields:');
        console.log('  - productId:', productId);
        console.log('  - productName:', productName);
        console.log('  - productImage:', productImage);
        
        // Validate data
        if (!productId || productId.trim() === '') {
            throw new Error('Product ID is required');
        }
        if (!productName || productName.trim() === '') {
            throw new Error('Product name is required');
        }

        const db = admin.firestore();
        const messaging = admin.messaging();

        // Collect tokens based on audience
        const tokens = new Set();
        let userTokenCount = 0;
        let guestTokenCount = 0;

        // Collect guest tokens
        const guestSnap = await db.collection('guest_tokens').get();
        guestSnap.forEach(doc => {
            const token = doc.data().token;
            if (token) {
                tokens.add(token);
                guestTokenCount++;
            }
        });
        
        // Collect user tokens
        const userSnap = await db.collection('users').get();
        userSnap.forEach(doc => {
            (doc.data().pushTokens || []).forEach(t => {
                if (t) {
                    tokens.add(t);
                    userTokenCount++;
                }
            });
        });

        const tokenList = Array.from(tokens).filter(t => typeof t === 'string' && t.length > 100);
        
        console.log('[auto-back-in-stock-alerts] Found', tokenList.length, 'unique tokens (users:', userTokenCount, ', guests:', guestTokenCount, ')');
        
        if (tokenList.length === 0) {
            return { 
                statusCode: 200, 
                headers: corsHeaders, 
                body: JSON.stringify({ 
                    success: true, 
                    stats: { userTokenCount: 0, guestTokenCount: 0, totalSent: 0 },
                    message: 'No tokens found to send notifications' 
                }) 
            };
        }

        console.log('[auto-back-in-stock-alerts] Building message payload...');
        
        // Build data object
        const dataPayload = {
            title: '📦 Back in Stock!',
            body: `${String(productName)} is available again. Don't miss out!`,
            link: `/product-detail.html?id=${encodeURIComponent(String(productId))}`,
            imageUrl: String(productImage || ''),
            buttonText: 'Shop Now',
            icon: '/images/logos/royalmeenakari.png',
            tag: 'royal-meenakari-back-in-stock',
            timestamp: Date.now().toString()
        };
        
        console.log('[auto-back-in-stock-alerts] Data payload:', JSON.stringify(dataPayload, null, 2));

        const message = {
            data: dataPayload,
            webpush: {
                headers: {
                    'TTL': '86400',
                    'Urgency': 'high'
                },
                fcm_options: {
                    link: dataPayload.link
                }
            }
        };

        console.log('[auto-back-in-stock-alerts] Message payload:', JSON.stringify(message, null, 2));
        console.log('[auto-back-in-stock-alerts] Sending to', tokenList.length, 'tokens');

        const response = await messaging.sendEachForMulticast({
            tokens: tokenList,
            ...message
        });

        console.log(`[auto-back-in-stock-alerts] Notification sent successfully. Success: ${response.successCount}, Failed: ${response.failureCount}`);
        
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[auto-back-in-stock-alerts] Failed to send to token ${idx}:`, resp.error.message);
                }
            });
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                stats: {
                    userTokenCount: userTokenCount,
                    guestTokenCount: guestTokenCount,
                    totalSent: response.successCount
                },
                message: `Successfully sent back-in-stock alert to ${response.successCount} devices`,
                details: {
                    successCount: response.successCount,
                    failureCount: response.failureCount
                }
            })
        };
    } catch (error) {
        console.error('[auto-back-in-stock-alerts] Send error:', error);
        return { 
            statusCode: 500, 
            headers: corsHeaders, 
            body: JSON.stringify({ 
                success: false,
                error: error.message 
            }) 
        };
    }
};
