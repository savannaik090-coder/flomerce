const admin = require('firebase-admin');

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function initAdmin() {
    if (admin.apps.length > 0) return;
    
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCW1inMXQEJA7c1\nzhYaXL6CIKmSpDcftI6l/tQ33Z0eIPCqACgb3X0uNOm0G8Bquz9Y5n13FLBOU4oH\n+J/BD0kt16VcYG5oxLQVa9xZVVujDM1C7KzFw4ZQztMkYhjjJo5gPrNKpSsT85rx\n8LjU1doGvk/5K1sWS83jeobGtR35PTtQwAG/aOxzm0c48fj4l5/f618UbTpHyUsZ\nG9tklU7RYTTFYELss+PEcGKTQTSrh/RSMug4GaLqbWsOu+AkJaCZGAsTwMc3yLcC\nTAUZCjR104W+WdR3sc5EVh3Dd54pXGeHIWlgyJhiqPWw09lyQ8rJBWfSKYlzJkpe\nbvb879J7AgMBAAECggEAPBpGOXptqSvj2vqtb/+4oZ1mNFpe5LFLjfVGlqQlsRWr\nD/JUCRZuhPTskqnkOCM4kLH3GHYT8oHzJE37SjBPFocxCugZ1oFayJZcDPSoOQYm\n3B32ki7g3F4tX/f+trRsUwlo47uAuMh+2xzyaUx1Pe6ja0PNXcsC1TvDbHZK5T7W\nO+SBvh9RNmmFsqL5eeRdr4t3NPKDHgQ+P49gevkpAzNHcUm4oQt+orniXYcWfAwl\nJtcCla7LSFrAsW89pITcbnTQSadqUXF6LP68NY5xVfZxWBuO+ajVRvpGofZMlkuo\nz8p1JIt7KLnhBdwkQutI4Zll1wZCBcPydX4EC0wd8QKBgQDIbkgjHzSkvHJHLe1X\nY6LxRJmnvXXvP2RKsRDDtHPq0u/JTjHVfeH7Y4546MQX+9/11XEzMX85JUBa/kza\nfCBuT88SYZeEJknpLhUl5IEKg5K9QkRlLimi1saSN/WGBzk7ZP4tslXD632JkDZS\n6ASYYTe8TDXuF8If/CBjhHdU/wKBgQDAp+WXHYR/BxGCvMM5K2qZRqDNACvlcnia\n9xNEmkrgtNGBEPFGrulwP4vtodkBwWnUiipzKUr6eS520baxO9jgdMJ7+bUnTB7L\peUuGSixIMf0wBvf5OT6FKZ9A6qTc49jd8QD/Vaei8kKS1iCkbOkEwrd7VC1BX8G\nKDBoDJ1WhQKBgQC6aifZ0rpJxaOcJFEtCFSShbVL1+EKhjEnbwwimYF+lHXFC186\nK3y1LWFjf0py7CbfJIfGj3C+m7EBcKfWRcB8GOqFNBOSK3Ju2Bd/SMnkF3+xWyL1\n4DuFYrEJadaHs8w9O69UnRs7v5jhCyobbgRoHXOTRGacbah1yy/sn1XFzQKBgAPX\nlVmVKh5Kasv7rb0HI6IY6X4NIdL6nHMiuEym8xVWJdN4Hge110v4yHadwrEpRU4K\nz1vql+c04XtXJViVg/a9/V7xlO5Ks1aGYXKw58HYkIRODIBDlVlzbfqSRyWXqWVn\nbw5RUBfrW8ALzqET/Mwp4Q6Z/AEQMf9Sb9yzW7PtAoGAJilwi+vA0pNGNlOuKYLj\n8XPYZqktbxs99N0LFPbSIVsVeHwVhoi+KPKgMHuFrQZA22IYJ01acD/LYim3Fi+X\nUD//owCkNu22xWl2SNoBVO3htsGuwokolPBt/MA8mGG+SDR7JJbeDxesfzUWTxHb\nPNWi5ETLiI2OCy1JSmPGq9k=\n-----END PRIVATE KEY-----\n`).replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'auric-a0c92',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@auric-a0c92.iam.gserviceaccount.com',
            privateKey: privateKey,
            privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || '067bc566a907eeca7ae57d98ec6ba463385b2617',
            client_x509_cert_url: process.env.FIREBASE_CERT_URL || 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40auric-a0c92.iam.gserviceaccount.com'
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'auric-a0c92.firebasestorage.app'
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
