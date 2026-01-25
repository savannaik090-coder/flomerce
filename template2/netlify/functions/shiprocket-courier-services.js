
/**
 * Netlify Function to get Shiprocket courier services
 * Endpoint: /.netlify/functions/shiprocket-courier-services
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
        const { pickup_postcode, delivery_postcode, weight, cod } = JSON.parse(event.body);
        
        if (!pickup_postcode || !delivery_postcode) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'pickup_postcode and delivery_postcode are required' 
                })
            };
        }

        console.log('Getting courier services for:', pickup_postcode, 'to', delivery_postcode);

        const shiprocketService = new ShiprocketService();
        const result = await shiprocketService.getCourierServices(pickup_postcode, delivery_postcode, weight, cod);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                data: result,
                message: 'Courier services retrieved successfully'
            })
        };

    } catch (error) {
        console.error('Error in shiprocket-courier-services function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                message: 'Failed to get courier services'
            })
        };
    }
};
