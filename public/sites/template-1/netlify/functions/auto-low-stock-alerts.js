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
    if (!privateKey) throw new Error('Missing FIREBASE_PRIVATE_KEY');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey.replace(/\\n/g, '\n')
        })
    });
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
    
    try {
        initAdmin();
        
        console.log('[auto-low-stock-alerts] Low-stock notification triggered');
        
        const requestData = JSON.parse(event.body || '{}');
        console.log('[auto-low-stock-alerts] Parsed request data:', JSON.stringify(requestData, null, 2));
        
        const { productId, productName, productImage, stockRemaining, threshold } = requestData;
        
        console.log('[auto-low-stock-alerts] Extracted fields:');
        console.log('  - productId:', productId);
        console.log('  - productName:', productName);
        console.log('  - productImage:', productImage);
        console.log('  - stockRemaining:', stockRemaining);
        console.log('  - threshold:', threshold);
        
        // Validate data
        if (!productId || productId.trim() === '') {
            throw new Error('Product ID is required');
        }
        if (!productName || productName.trim() === '') {
            throw new Error('Product name is required');
        }
        if (stockRemaining === null || stockRemaining === undefined) {
            throw new Error('Stock remaining is required');
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
        
        console.log('[auto-low-stock-alerts] Found', tokenList.length, 'unique tokens (users:', userTokenCount, ', guests:', guestTokenCount, ')');
        
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

        console.log('[auto-low-stock-alerts] Building message payload...');
        
        // Build data object
        const dataPayload = {
            title: '⚡ Limited Stock!',
            body: `Only ${stockRemaining} item(s) left of ${String(productName)}. Order now before they're gone!`,
            link: `/product-detail.html?id=${encodeURIComponent(String(productId))}`,
            imageUrl: String(productImage || ''),
            buttonText: 'Order Now',
            icon: '/images/logos/royalmeenakari.png',
            tag: 'royal-meenakari-low-stock',
            timestamp: Date.now().toString()
        };
        
        console.log('[auto-low-stock-alerts] Data payload:', JSON.stringify(dataPayload, null, 2));

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

        console.log('[auto-low-stock-alerts] Message payload:', JSON.stringify(message, null, 2));
        console.log('[auto-low-stock-alerts] Sending to', tokenList.length, 'tokens');

        const response = await messaging.sendEachForMulticast({
            tokens: tokenList,
            ...message
        });

        console.log(`[auto-low-stock-alerts] Notification sent successfully. Success: ${response.successCount}, Failed: ${response.failureCount}`);
        
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[auto-low-stock-alerts] Failed to send to token ${idx}:`, resp.error.message);
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
                message: `Successfully sent low-stock alert to ${response.successCount} devices`,
                details: {
                    successCount: response.successCount,
                    failureCount: response.failureCount
                }
            })
        };
    } catch (error) {
        console.error('[auto-low-stock-alerts] Send error:', error);
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
