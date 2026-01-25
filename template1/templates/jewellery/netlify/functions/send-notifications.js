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
        
        // Log the raw request
        console.log('[send-notifications] Raw event.body:', event.body);
        
        const requestData = JSON.parse(event.body);
        console.log('[send-notifications] Parsed request data:', JSON.stringify(requestData, null, 2));
        
        const { title, body, link, imageUrl, buttonText, sendToUsers, sendToGuests, category } = requestData;
        
        console.log('[send-notifications] Extracted fields:');
        console.log('  - title:', title);
        console.log('  - body:', body);
        console.log('  - link:', link);
        console.log('  - imageUrl:', imageUrl, '(length:', imageUrl ? imageUrl.length : 0, ')');
        console.log('  - buttonText:', buttonText);
        console.log('  - sendToUsers:', sendToUsers);
        console.log('  - sendToGuests:', sendToGuests);
        console.log('  - category:', category);
        
        const db = admin.firestore();
        const messaging = admin.messaging();

        // Collect tokens based on selected audience
        const tokens = new Set();
        let userTokenCount = 0;
        let guestTokenCount = 0;

        // Collect guest tokens if sendToGuests is true
        if (sendToGuests) {
            const guestSnap = await db.collection('guest_tokens').get();
            guestSnap.forEach(doc => {
                const token = doc.data().token;
                if (token) {
                    tokens.add(token);
                    guestTokenCount++;
                }
            });
        }
        
        // Collect user tokens if sendToUsers is true
        if (sendToUsers) {
            const userSnap = await db.collection('users').get();
            userSnap.forEach(doc => {
                (doc.data().pushTokens || []).forEach(t => {
                    if (t) {
                        tokens.add(t);
                        userTokenCount++;
                    }
                });
            });
        }

        const tokenList = Array.from(tokens).filter(t => typeof t === 'string' && t.length > 100);
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

        // Validate data
        if (!title || title.trim() === '') {
            throw new Error('Title is required');
        }
        if (!body || body.trim() === '') {
            throw new Error('Body is required');
        }

        console.log('[send-notifications] Building message payload...');
        
        // Build data object - must be stringified for Firebase Admin SDK
        // We use a "data-only" payload for standard Web Push compliance
        const dataPayload = {
            title: String(title),
            body: String(body),
            link: String(link || '/'),
            imageUrl: String(imageUrl || ''),
            buttonText: String(buttonText || 'View'),
            icon: '/images/logos/royalmeenakari.png',
            tag: 'royal-meenakari-notification',
            timestamp: Date.now().toString()
        };
        
        console.log('[send-notifications] Data payload:', JSON.stringify(dataPayload, null, 2));

        const message = {
            data: dataPayload,
            webpush: {
                headers: {
                    'TTL': '86400',
                    'Urgency': 'high'
                },
                fcm_options: {
                    link: String(link || '/')
                }
            }
        };

        console.log('[send-notifications] Message payload:', JSON.stringify(message, null, 2));
        console.log('[send-notifications] Sending to', tokenList.length, 'tokens');

        const response = await messaging.sendEachForMulticast({
            tokens: tokenList,
            ...message
        });

        console.log(`[send-notifications] Notification sent successfully. Success: ${response.successCount}, Failed: ${response.failureCount}`);
        
        // Log failures for debugging
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[send-notifications] Failed to send to token ${idx}:`, resp.error.message);
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
                message: `Successfully sent to ${response.successCount} devices`,
                details: {
                    successCount: response.successCount,
                    failureCount: response.failureCount
                }
            })
        };
    } catch (error) {
        console.error('Send error:', error);
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
