
/**
 * Netlify Function to schedule Shiprocket pickup
 * Endpoint: /.netlify/functions/shiprocket-schedule-pickup
 */

const ShiprocketService = require('./shiprocket-service');

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
        const { shipment_id } = JSON.parse(event.body);
        
        if (!shipment_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'shipment_id is required' 
                })
            };
        }

        console.log('Scheduling pickup for shipment:', shipment_id);

        const shiprocketService = new ShiprocketService();
        const result = await shiprocketService.schedulePickup(shipment_id);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                data: result,
                message: 'Pickup scheduled successfully'
            })
        };

    } catch (error) {
        console.error('Error in shiprocket-schedule-pickup function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                message: 'Failed to schedule pickup'
            })
        };
    }
};
