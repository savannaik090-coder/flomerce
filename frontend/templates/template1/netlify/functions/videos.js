const admin = require('firebase-admin');
const Busboy = require('busboy');

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

function parseMultipartForm(event) {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({
            headers: {
                'content-type': event.headers['content-type'] || event.headers['Content-Type']
            }
        });
        
        const fields = {};
        const files = [];
        
        busboy.on('field', (name, value) => {
            fields[name] = value;
        });
        
        busboy.on('file', (name, file, info) => {
            const { filename, encoding, mimeType } = info;
            const chunks = [];
            
            file.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            file.on('end', () => {
                files.push({
                    fieldname: name,
                    filename,
                    encoding,
                    mimeType,
                    buffer: Buffer.concat(chunks)
                });
            });
        });
        
        busboy.on('finish', () => {
            resolve({ fields, files });
        });
        
        busboy.on('error', reject);
        
        const body = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64')
            : Buffer.from(event.body);
        
        busboy.end(body);
    });
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }
    
    try {
        initAdmin();
        
        // Comprehensive path parsing for all environments
        const rawPath = event.path || '';
        const videoId = rawPath.split('/').pop();
        
        console.log(`[Videos Function] Method: ${event.httpMethod}, Path: ${rawPath}, ID: ${videoId}`);
        
        const db = admin.firestore();
        const bucket = admin.storage().bucket();
        
        // Handle GET request to list all videos
        if (event.httpMethod === 'GET') {
            const videosSnapshot = await db.collection('watchBuyVideos').orderBy('uploadedAt', 'desc').get();
            const videos = [];
            videosSnapshot.forEach(doc => {
                videos.push({ id: doc.id, ...doc.data() });
            });
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, videos })
            };
        }
        
        // Handle POST for new uploads
        if (event.httpMethod === 'POST') {
            const { fields, files } = await parseMultipartForm(event);
            
            if (!files.length) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ success: false, error: 'No video file provided' })
                };
            }
            
            const videoFile = files[0];
            const title = fields.title || 'Untitled Video';
            const productSKU = fields.productSKU || '';
            const description = fields.description || '';
            
            const timestamp = Date.now();
            const safeFilename = videoFile.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `videos/${timestamp}_${safeFilename}`;
            
            const file = bucket.file(storagePath);
            await file.save(videoFile.buffer, {
                metadata: {
                    contentType: videoFile.mimeType,
                    metadata: {
                        originalFilename: videoFile.filename,
                        uploadedAt: new Date().toISOString()
                    }
                }
            });
            
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
            
            const videoDoc = await db.collection('watchBuyVideos').add({
                title,
                productSKU,
                description,
                videoUrl: publicUrl,
                storagePath,
                uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            });
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    video: {
                        id: videoDoc.id,
                        title,
                        productSKU,
                        description,
                        videoUrl: publicUrl
                    }
                })
            };
        }
        
        // Handle PUT (update) and DELETE operations that require a video ID
        if (!videoId || videoId === 'videos' || videoId === 'functions') {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: 'Valid Video ID required' })
            };
        }

        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            const updateData = {};
            if (body.title) updateData.title = body.title;
            if (body.productSKU !== undefined) updateData.productSKU = body.productSKU;
            if (body.description !== undefined) updateData.description = body.description;
            updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            
            await db.collection('watchBuyVideos').doc(videoId).update(updateData);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, message: 'Video updated successfully' })
            };
        }
        
        if (event.httpMethod === 'DELETE') {
            console.log(`[DELETE] Targeting video ID: ${videoId}`);
            const videoDoc = await db.collection('watchBuyVideos').doc(videoId).get();
            
            if (videoDoc.exists) {
                const videoData = videoDoc.data();
                if (videoData.storagePath) {
                    try {
                        await bucket.file(videoData.storagePath).delete();
                        console.log(`[DELETE] Deleted storage file: ${videoData.storagePath}`);
                    } catch (e) {
                        console.log('[DELETE] Storage deletion warning:', e.message);
                    }
                }
                
                await db.collection('watchBuyVideos').doc(videoId).delete();
                console.log(`[DELETE] Deleted Firestore document: ${videoId}`);
                
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({ success: true, message: 'Video deleted successfully' })
                };
            } else {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ success: false, error: 'Video not found in database' })
                };
            }
        }
        
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Endpoint not found' })
        };
        
    } catch (error) {
        console.error('Videos function error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};
