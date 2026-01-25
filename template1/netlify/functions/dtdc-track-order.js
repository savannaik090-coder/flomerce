
/**
 * Netlify Function to track DTDC orders using AfterShip API
 * Endpoint: /.netlify/functions/dtdc-track-order
 * AfterShip API Documentation: https://docs.aftership.com/api/4/overview
 */

const axios = require('axios');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        const { awbNumber } = JSON.parse(event.body || '{}');

        if (!awbNumber) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'AWB number is required'
                })
            };
        }

        console.log('📦 Starting DTDC tracking via AfterShip for:', awbNumber);

        // AfterShip API configuration for DTDC India
        const AFTERSHIP_API_KEY = process.env.AFTERSHIP_API_KEY;
        const AFTERSHIP_BASE_URL = 'https://api.aftership.com/tracking/2025-07';
        
        if (!AFTERSHIP_API_KEY || AFTERSHIP_API_KEY === 'your_aftership_api_key') {
            throw new Error('AfterShip API key not configured. Please add AFTERSHIP_API_KEY to environment variables to enable DTDC tracking.');
        }

        console.log('🔄 Using AfterShip API for real DTDC tracking...');
            
        // Step 1: Create tracking in AfterShip (if not exists)
        console.log('🔄 Step 1: Adding DTDC tracking to AfterShip...');
        const createResult = await createTracking(awbNumber, AFTERSHIP_API_KEY, AFTERSHIP_BASE_URL);

        // Step 2: Get tracking information using the ID from create operation
        console.log('🔄 Step 2: Fetching DTDC tracking data...');
        let trackingData = null;
        
        if (createResult && createResult.data && createResult.data.id) {
            // Use the ID returned from create operation
            trackingData = await getTrackingById(createResult.data.id, AFTERSHIP_API_KEY, AFTERSHIP_BASE_URL);
        } else {
            // Fallback: try to find existing tracking
            trackingData = await findExistingTracking(awbNumber, AFTERSHIP_API_KEY, AFTERSHIP_BASE_URL);
        }

        if (trackingData) {
            console.log('✅ AfterShip DTDC tracking successful');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'DTDC tracking data retrieved successfully via AfterShip',
                    data: trackingData,
                    source: 'AfterShip API - DTDC India'
                })
            };
        } else {
            throw new Error('No tracking data available for this AWB number. Please verify the AWB number or try again later.');
        }

    } catch (error) {
        console.error('❌ Error in DTDC AfterShip tracking:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Failed to track DTDC shipment',
                message: 'Unable to retrieve tracking information. Please check the AWB number and try again.',
                timestamp: new Date().toISOString(),
                troubleshooting: {
                    suggestion: 'Make sure the AWB number is correct and try again in a few minutes',
                    customerCare: '1860-123-1011'
                }
            })
        };
    }
};

/**
 * Create tracking in AfterShip system - FIXED IMPLEMENTATION
 */
async function createTracking(awbNumber, apiKey, baseUrl) {
    try {
        console.log('🔄 Creating DTDC tracking with AfterShip API...');
        
        const response = await axios.post(`${baseUrl}/trackings`, {
            tracking_number: awbNumber,
            slug: 'dtdc' // Correct DTDC India courier slug
        }, {
            headers: {
                'Content-Type': 'application/json',
                'as-api-key': apiKey,
                'User-Agent': 'DTDC-Tracker/1.0'
            },
            timeout: 15000
        });

        console.log('✅ Tracking created in AfterShip:', response.data?.meta?.code);
        return { data: response.data, meta: response.data?.meta || { code: 201 } };
    } catch (error) {
        console.error('❌ Create tracking error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });

        // Handle "tracking already exists" error (code 4003)
        if (error.response?.status === 400 && error.response?.data?.meta?.code === 4003) {
            console.log('ℹ️ Tracking already exists in AfterShip - retrieving existing tracking...');
            // Return the existing tracking data from the error response
            return { 
                data: error.response?.data?.data || { id: null }, 
                meta: { code: 200 } // Treat as success since we have the tracking ID
            };
        }

        // If tracking already exists (409) or rate limited (429), that's acceptable
        if (error.response?.status === 409) {
            console.log('ℹ️ Tracking already exists in AfterShip - continuing...');
            return { 
                data: error.response?.data?.data || { id: null }, 
                meta: { code: 409 } 
            };
        }

        if (error.response?.status === 429) {
            console.log('⚠️ Rate limited - waiting before continuing...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            return { meta: { code: 429 } };
        }

        // For other errors, log but continue to try getting tracking
        console.log('⚠️ Create tracking failed, but continuing to get tracking...');
        return false;
    }
}

/**
 * Get tracking information from AfterShip - FIXED IMPLEMENTATION
 */
async function getTrackingById(trackingId, apiKey, baseUrl) {
    try {
        console.log('🔄 Getting tracking by ID from AfterShip:', trackingId);
        
        const response = await axios.get(`${baseUrl}/trackings/${trackingId}`, {
            headers: {
                'Content-Type': 'application/json',
                'as-api-key': apiKey,
                'User-Agent': 'DTDC-Tracker/1.0'
            },
            timeout: 15000
        });

        console.log('📊 Get tracking response details:', {
            status: response.status,
            metaCode: response.data?.meta?.code,
            hasData: !!response.data?.data
        });

        if (response.data && response.data.data) {
            return formatAfterShipData(response.data.data.tracking_number, response.data.data);
        }

        console.log('⚠️ No tracking data in response:', response.data);
        return null;

    } catch (error) {
        console.error('❌ AfterShip get tracking error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        throw new Error(`AfterShip API error: ${error.response?.data?.meta?.message || error.message}`);
    }
}

async function findExistingTracking(awbNumber, apiKey, baseUrl) {
    try {
        console.log('🔍 Searching for existing tracking:', awbNumber);
        
        const response = await axios.get(`${baseUrl}/trackings`, {
            params: {
                tracking_numbers: awbNumber,
                slug: 'dtdc'
            },
            headers: {
                'Content-Type': 'application/json',
                'as-api-key': apiKey,
                'User-Agent': 'DTDC-Tracker/1.0'
            },
            timeout: 15000
        });

        if (response.data && response.data.data && response.data.data.trackings && response.data.data.trackings.length > 0) {
            const tracking = response.data.data.trackings[0];
            return formatAfterShipData(tracking.tracking_number, tracking);
        }

        console.log('⚠️ No existing tracking found');
        return null;
    } catch (error) {
        console.error('❌ Error finding existing tracking:', error.message);
        throw new Error(`Failed to find existing tracking: ${error.message}`);
    }
}

/**
 * Format AfterShip tracking data into our standard format - CORRECTED PARSING
 */
function formatAfterShipData(awbNumber, tracking) {
    console.log('🔄 Formatting AfterShip data:', {
        tag: tracking.tag,
        slug: tracking.slug,
        checkpointsCount: tracking.checkpoints?.length || 0
    });

    // Map AfterShip status to readable status
    const statusMapping = {
        'Pending': 'Shipment Booked',
        'InfoReceived': 'Information Received',
        'InTransit': 'In Transit',
        'OutForDelivery': 'Out for Delivery',
        'AttemptFail': 'Delivery Attempted',
        'Delivered': 'Delivered',
        'AvailableForPickup': 'Available for Pickup',
        'Exception': 'Exception',
        'Expired': 'Expired'
    };

    const currentStatus = statusMapping[tracking.tag] || tracking.tag || 'In Transit';

    // Format tracking events from checkpoints
    const trackingEvents = [];

    if (tracking.checkpoints && tracking.checkpoints.length > 0) {
        // Sort checkpoints by date (newest first to show current status at top)
        const sortedCheckpoints = tracking.checkpoints.sort((a, b) =>
            new Date(b.checkpoint_time) - new Date(a.checkpoint_time)
        );

        // Add all events in chronological order
        trackingEvents.push(...sortedCheckpoints.map((checkpoint, index) => ({
            status: statusMapping[checkpoint.tag] || checkpoint.tag || 'Update',
            description: checkpoint.message || 'Shipment update',
            date: new Date(checkpoint.checkpoint_time).toLocaleString('en-IN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Kolkata'
            }),
            location: checkpoint.location || checkpoint.city || 'DTDC Hub',
            activity: (checkpoint.tag || 'UPDATE').toUpperCase()
        })));
    }

    // If no events, add a default one
    if (trackingEvents.length === 0) {
        trackingEvents.push({
            status: currentStatus,
            description: 'Shipment information received and being tracked',
            date: new Date().toLocaleString('en-IN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Kolkata'
            }),
            location: 'DTDC Network',
            activity: 'TRACKING'
        });
    }

    return {
        awbNumber: awbNumber,
        serviceType: 'DTDC Express',
        origin: tracking.origin_city || tracking.origin_country_region || 'Origin Location',
        destination: tracking.destination_city || tracking.destination_country_region || 'Destination Location',
        currentStatus: currentStatus,
        courierName: 'DTDC Professional Courier & Cargo Ltd.',
        estimatedDelivery: tracking.aftership_estimated_delivery_date?.estimated_delivery_date ?
            new Date(tracking.aftership_estimated_delivery_date.estimated_delivery_date).toLocaleDateString('en-IN') : null,
        trackingEvents: trackingEvents,
        source: 'AfterShip API',
        lastUpdated: tracking.updated_at ?
            new Date(tracking.updated_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN'),
        transitTime: tracking.transit_time || null,
        shipmentWeight: tracking.shipment_weight?.value || null,
        shipmentWeightUnit: tracking.shipment_weight?.unit || null,
        trackingUrl: tracking.aftership_tracking_url || null
    };
}


