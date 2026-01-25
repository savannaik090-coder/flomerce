
/**
 * Netlify Function to get orders from Shiprocket
 * Endpoint: /.netlify/functions/shiprocket-get-orders
 */

const ShiprocketService = require('./shiprocket-service');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        const shiprocketService = new ShiprocketService();
        
        // Get query parameters for pagination
        const page = event.queryStringParameters?.page || 1;
        const per_page = event.queryStringParameters?.per_page || 10;
        
        console.log('📦 Getting orders from Shiprocket...');
        
        const result = await shiprocketService.getOrders(page, per_page);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result,
                message: 'Orders retrieved successfully'
            })
        };

    } catch (error) {
        console.error('❌ Error getting orders:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message || 'Failed to get orders',
                timestamp: new Date().toISOString()
            })
        };
    }
};
