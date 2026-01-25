/**
 * Debug function to test Shiprocket credentials and connection
 * Endpoint: /.netlify/functions/debug-shiprocket
 */

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Check environment variables
        const email = process.env.SHIPROCKET_EMAIL;
        const password = process.env.SHIPROCKET_PASSWORD;
        
        const response = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            credentials: {
                email: email ? 'SET' : 'MISSING',
                password: password ? 'SET' : 'MISSING'
            },
            message: 'Debug information retrieved'
        };

        // If credentials exist, test authentication
        if (email && password) {
            try {
                const ShiprocketService = require('./shiprocket-service');
                const service = new ShiprocketService();
                const authResult = await service.authenticate();
                response.authTest = {
                    success: true,
                    message: 'Authentication successful'
                };
            } catch (authError) {
                response.authTest = {
                    success: false,
                    error: authError.message
                };
            }
        } else {
            response.authTest = {
                success: false,
                error: 'Credentials not available for testing'
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response, null, 2)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};