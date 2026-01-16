
/**
 * Netlify Function to track Shiprocket orders
 * Endpoint: /.netlify/functions/shiprocket-track-order
 */

const ShiprocketService = require('./shiprocket-service');

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

    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        let trackingId;
        
        // Handle both GET and POST requests
        if (event.httpMethod === 'GET') {
            // Extract tracking ID from path or query params
            const pathParts = event.path.split('/');
            trackingId = pathParts[pathParts.length - 1];
            
            // If not in path, check query params
            if (!trackingId || trackingId === 'shiprocket-track-order') {
                trackingId = event.queryStringParameters?.trackingId;
            }
        } else if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            trackingId = body.trackingId;
        }

        if (!trackingId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Tracking ID is required' 
                })
            };
        }

        console.log('📍 Tracking request for ID:', trackingId);

        // Demo AWB numbers that simulate real tracking scenarios
        const demoAWBData = {
            // Recently shipped - shows complete tracking flow
            '141123858510862': {
                track_status: 6,
                shipment_status: 'DELIVERED',
                awb_code: '141123858510862',
                courier_name: 'XpressBees',
                courier_company_id: 24,
                current_status: 'Delivered',
                edd: '2025-08-20',
                origin: 'Mumbai',
                destination: 'Delhi',
                weight: '0.5',
                packages: 1,
                shipment_track: [
                    {
                        id: 1,
                        current_status: 'Order Created',
                        activity: 'Order created and pickup scheduled',
                        date: '2025-08-15 10:30:00',
                        location: 'Mumbai Warehouse',
                        sr_status_label: 'Order Processed'
                    },
                    {
                        id: 2,
                        current_status: 'Picked Up',
                        activity: 'Package picked up from sender',
                        date: '2025-08-15 14:20:00',
                        location: 'Mumbai Hub',
                        sr_status_label: 'In Transit'
                    },
                    {
                        id: 3,
                        current_status: 'In Transit',
                        activity: 'Package in transit to destination city',
                        date: '2025-08-16 08:15:00',
                        location: 'Delhi Sorting Center',
                        sr_status_label: 'In Transit'
                    },
                    {
                        id: 4,
                        current_status: 'Out for Delivery',
                        activity: 'Package out for delivery',
                        date: '2025-08-17 09:00:00',
                        location: 'Delhi Local Hub',
                        sr_status_label: 'Out for Delivery'
                    },
                    {
                        id: 5,
                        current_status: 'Delivered',
                        activity: 'Package delivered successfully',
                        date: '2025-08-17 15:30:00',
                        location: 'Customer Address, Delhi',
                        sr_status_label: 'Delivered'
                    }
                ]
            },
            // Currently in transit
            '789456123654987': {
                track_status: 3,
                shipment_status: 'IN_TRANSIT',
                awb_code: '789456123654987',
                courier_name: 'Delhivery',
                courier_company_id: 12,
                current_status: 'In Transit',
                edd: '2025-08-19',
                origin: 'Bangalore',
                destination: 'Chennai',
                weight: '1.2',
                packages: 1,
                shipment_track: [
                    {
                        id: 1,
                        current_status: 'Order Created',
                        activity: 'Order created and pickup scheduled',
                        date: '2025-08-16 11:00:00',
                        location: 'Bangalore Warehouse',
                        sr_status_label: 'Order Processed'
                    },
                    {
                        id: 2,
                        current_status: 'Picked Up',
                        activity: 'Package picked up from sender',
                        date: '2025-08-16 16:45:00',
                        location: 'Bangalore Hub',
                        sr_status_label: 'In Transit'
                    },
                    {
                        id: 3,
                        current_status: 'In Transit',
                        activity: 'Package in transit to destination city',
                        date: '2025-08-17 07:30:00',
                        location: 'Chennai Sorting Center',
                        sr_status_label: 'In Transit'
                    }
                ]
            },
            // Just created order
            '555666777888999': {
                track_status: 1,
                shipment_status: 'NEW',
                awb_code: '555666777888999',
                courier_name: 'Blue Dart',
                courier_company_id: 8,
                current_status: 'Order Created',
                edd: '2025-08-20',
                origin: 'Pune',
                destination: 'Mumbai',
                weight: '0.8',
                packages: 1,
                shipment_track: [
                    {
                        id: 1,
                        current_status: 'Order Created',
                        activity: 'Order created and pickup scheduled',
                        date: '2025-08-17 12:00:00',
                        location: 'Pune Warehouse',
                        sr_status_label: 'Order Processed'
                    }
                ]
            }
        };

        // Check if it's a demo AWB number
        if (demoAWBData[trackingId]) {
            const demoData = demoAWBData[trackingId];
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Demo tracking data retrieved successfully',
                    data: {
                        tracking_data: {
                            ...demoData,
                            qc_response: '',
                            is_return: false,
                            error: null,
                            order_tag: 'DEMO',
                            // Enhanced tracking information
                            estimated_delivery_date: demoData.edd,
                            pickup_location: 'Mumbai Warehouse',
                            destination_location: demoData.destination,
                            total_distance: '1500 km',
                            courier_contact: '+91-9876543210',
                            delivery_instructions: 'Please call before delivery',
                            package_dimensions: '10x10x10 cm',
                            insurance_value: '₹5000',
                            cod_amount: demoData.cod_amount || '₹0',
                            delivery_attempt_count: demoData.track_status >= 4 ? 1 : 0,
                            last_location_update: new Date().toISOString()
                        }
                    },
                    isTestData: false, // Show as real data for demo purposes
                    isDemoAWB: true,
                    comprehensiveData: true
                })
            };
        }

        // Handle simple test IDs
        if (trackingId === 'TEST123' || trackingId === 'DEMO123' || trackingId === 'SAMPLE123') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Test tracking ID - no real tracking data available',
                    data: {
                        tracking_data: {
                            track_status: 1,
                            shipment_status: 'Test Status',
                            shipment_track: [{
                                timestamp: new Date().toISOString(),
                                activity: 'Test tracking activity',
                                location: 'Test Location'
                            }]
                        }
                    },
                    isTestData: true
                })
            };
        }

        const shiprocketService = new ShiprocketService();
        const result = await shiprocketService.trackOrder(trackingId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result
            })
        };

    } catch (error) {
        console.error('❌ Error in shiprocket-track-order function:', error);
        
        // Handle specific error cases
        if (error.message.includes('AWB not found')) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'AWB not found',
                    message: 'The tracking number was not found in Shiprocket system'
                })
            };
        }
        
        // Handle authentication errors
        if (error.message.includes('Authentication failed') || error.message.includes('credentials not found') || error.message.includes('credentials missing')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Authentication failed',
                    message: 'Shiprocket credentials are not properly configured. Please check your environment variables.',
                    requiresSetup: true
                })
            };
        }
        
        // Handle network errors
        if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Service unavailable',
                    message: 'Unable to connect to Shiprocket API. Please try again later.'
                })
            };
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message || 'Internal server error',
                details: 'Check server logs for more information',
                timestamp: new Date().toISOString()
            })
        };
    }
};
