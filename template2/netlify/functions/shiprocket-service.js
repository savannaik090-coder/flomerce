
/**
 * Shiprocket API Integration Service for Netlify Functions
 * Handles authentication, order creation, and tracking in test mode
 */

const axios = require('axios');

class ShiprocketService {
    constructor() {
        this.baseURL = 'https://apiv2.shiprocket.in';
        this.token = null;
        this.tokenExpiry = null;
        
        // Get credentials from environment variables
        this.email = process.env.SHIPROCKET_EMAIL;
        this.password = process.env.SHIPROCKET_PASSWORD;
        
        console.log('Shiprocket credentials check:', {
            email: this.email ? 'Set' : 'Missing',
            password: this.password ? 'Set' : 'Missing'
        });
        
        if (!this.email || !this.password) {
            const missingVars = [];
            if (!this.email) missingVars.push('SHIPROCKET_EMAIL');
            if (!this.password) missingVars.push('SHIPROCKET_PASSWORD');
            
            throw new Error(`Shiprocket credentials missing: ${missingVars.join(', ')}. Please set these environment variables in your deployment settings.`);
        }
    }

    /**
     * Authenticate with Shiprocket API
     */
    async authenticate() {
        try {
            console.log('🔐 Authenticating with Shiprocket API...');
            
            const response = await axios.post(`${this.baseURL}/v1/external/auth/login`, {
                email: this.email,
                password: this.password
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                // Set token expiry to 10 hours from now (Shiprocket tokens expire in 10 hours)
                this.tokenExpiry = new Date(Date.now() + 10 * 60 * 60 * 1000);
                console.log('✅ Shiprocket authentication successful');
                return {
                    success: true,
                    token: this.token,
                    message: 'Authentication successful'
                };
            } else {
                throw new Error('Invalid response from Shiprocket API');
            }
        } catch (error) {
            console.error('❌ Shiprocket authentication failed:', error.response?.data || error.message);
            throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Check if token is valid and refresh if needed
     */
    async ensureAuthenticated() {
        if (!this.token || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
            await this.authenticate();
        }
        return true;
    }

    /**
     * Test connection to Shiprocket
     */
    async testConnection() {
        try {
            const authResult = await this.authenticate();
            
            // Test a simple API call
            const response = await axios.get(`${this.baseURL}/v1/external/settings/company/pickup`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            return {
                success: true,
                message: 'Connection successful',
                auth: authResult,
                company_data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                details: error.response?.data
            };
        }
    }

    /**
     * Check serviceability before creating order
     */
    async checkServiceability(pickup_pincode, delivery_pincode, weight = 0.5, cod = 0) {
        try {
            await this.ensureAuthenticated();

            const params = {
                pickup_postcode: pickup_pincode.toString(),
                delivery_postcode: delivery_pincode.toString(),
                weight: parseFloat(weight),
                cod: parseInt(cod)
            };

            console.log('🔍 Checking serviceability with params:', params);

            const response = await axios.get(`${this.baseURL}/v1/external/courier/serviceability`, {
                params: params,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            console.log('✅ Serviceability check successful:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Serviceability check failed:', error.response?.data || error.message);
            throw new Error(`Serviceability check failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get pickup locations from account
     */
    async getPickupLocations() {
        try {
            await this.ensureAuthenticated();

            const response = await axios.get(`${this.baseURL}/v1/external/settings/company/pickup`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            console.log('📍 Pickup locations retrieved:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Failed to get pickup locations:', error.response?.data || error.message);
            throw new Error(`Get pickup locations failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Create a shipment order with comprehensive validation
     */
    async createOrder(orderData) {
        try {
            await this.ensureAuthenticated();

            // Validate required fields
            if (!orderData.order_id) {
                throw new Error('Order ID is required');
            }
            if (!orderData.customer || !orderData.customer.pinCode) {
                throw new Error('Customer pincode is required');
            }
            if (!orderData.items || orderData.items.length === 0) {
                throw new Error('Order items are required');
            }

            // Clean and validate phone number
            const rawPhone = orderData.customer.phone || '';
            const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
            if (cleanPhone.length < 10) {
                throw new Error('Valid 10-digit phone number is required');
            }
            const validPhone = cleanPhone.slice(-10);

            // Get pickup locations first
            console.log('📍 Getting pickup locations...');
            const pickupLocations = await this.getPickupLocations();
            
            let pickupLocationName = "Primary";
            if (pickupLocations && pickupLocations.data && pickupLocations.data.shipping_address && pickupLocations.data.shipping_address.length > 0) {
                pickupLocationName = pickupLocations.data.shipping_address[0].pickup_location;
            }

            // Check serviceability
            console.log('🔍 Checking serviceability...');
            const serviceability = await this.checkServiceability('400001', orderData.customer.pinCode);
            
            if (!serviceability.data || serviceability.data.available_courier_companies.length === 0) {
                throw new Error('No courier services available for this pincode');
            }

            // Prepare shipment data with all required fields
            const shipmentData = {
                order_id: orderData.order_id.toString(),
                order_date: orderData.order_date || new Date().toISOString().split('T')[0],
                pickup_location: pickupLocationName,
                billing_customer_name: orderData.customer.firstName || 'Customer',
                billing_last_name: orderData.customer.lastName || '',
                billing_address: orderData.customer.address || 'Address not provided',
                billing_address_2: orderData.customer.address2 || '',
                billing_city: orderData.customer.city || 'Mumbai',
                billing_pincode: orderData.customer.pinCode.toString(),
                billing_state: orderData.customer.state || 'Maharashtra',
                billing_country: "India",
                billing_email: orderData.customer.email || 'customer@example.com',
                billing_phone: validPhone,
                shipping_is_billing: true,
                order_items: orderData.items.map(item => ({
                    name: item.name || 'Product',
                    sku: item.id || Math.random().toString(36).substr(2, 9),
                    units: parseInt(item.quantity) || 1,
                    selling_price: parseFloat(item.price) || 100,
                    discount: 0,
                    tax: 0,
                    hsn: 411
                })),
                payment_method: orderData.payment_method || "Prepaid",
                shipping_charges: 0,
                giftwrap_charges: 0,
                transaction_charges: 0,
                total_discount: 0,
                sub_total: parseFloat(orderData.total) || 100,
                length: 10,
                breadth: 10,
                height: 10,
                weight: 0.5
            };

            console.log('📦 Creating Shiprocket order with data:', JSON.stringify(shipmentData, null, 2));

            const response = await axios.post(`${this.baseURL}/v1/external/orders/create/adhoc`, shipmentData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            console.log('✅ Shiprocket order created successfully:', response.data);
            
            const orderResult = response.data;
            
            // Automatically complete workflow if shipment was created
            if (orderResult.shipment_id) {
                try {
                    console.log('🚚 Starting automatic workflow completion...');
                    
                    const recommendedCourier = serviceability.data.recommended_courier_company_id;
                    if (recommendedCourier) {
                        console.log('📋 Assigning AWB with courier:', recommendedCourier);
                        const awbResult = await this.generateAWB(orderResult.shipment_id, recommendedCourier);
                        orderResult.awb_data = awbResult;
                        
                        if (awbResult.awb_code) {
                            console.log('✅ AWB assigned successfully:', awbResult.awb_code);
                            
                            // Schedule pickup
                            console.log('📅 Scheduling pickup...');
                            const pickupResult = await this.schedulePickup(orderResult.shipment_id);
                            orderResult.pickup_data = pickupResult;
                            
                            // Generate label
                            console.log('🏷️ Generating shipping label...');
                            const labelResult = await this.generateLabel(orderResult.shipment_id);
                            orderResult.label_data = labelResult;
                            
                            orderResult.workflow_completed = true;
                            console.log('🎉 Complete automated workflow finished successfully!');
                        }
                    }
                } catch (workflowError) {
                    console.error('⚠️ Workflow completion failed (order still created):', workflowError.message);
                    orderResult.workflow_error = workflowError.message;
                    orderResult.workflow_completed = false;
                }
            }
            
            return orderResult;

        } catch (error) {
            console.error('❌ Failed to create Shiprocket order:', error.response?.data || error.message);
            
            // Enhanced error handling for order creation
            let errorMessage = error.message;
            
            if (error.response?.data) {
                const apiError = error.response.data;
                if (apiError.message) {
                    errorMessage = apiError.message;
                } else if (apiError.errors && Array.isArray(apiError.errors)) {
                    errorMessage = apiError.errors.join(', ');
                } else if (typeof apiError === 'string') {
                    errorMessage = apiError;
                }
            }
            
            // Add context for common errors
            if (errorMessage.includes('pickup_postcode')) {
                errorMessage = 'Invalid pickup pincode. Please check your pickup location settings in Shiprocket.';
            } else if (errorMessage.includes('delivery_postcode')) {
                errorMessage = 'Invalid delivery pincode. Please check the customer address.';
            } else if (errorMessage.includes('billing_pincode')) {
                errorMessage = 'Invalid billing pincode in customer address.';
            } else if (errorMessage.includes('required field')) {
                errorMessage = 'Required shipping information is missing. Please check all customer details.';
            }
            
            throw new Error(`Order creation failed: ${errorMessage}`);
        }
    }

    /**
     * Track an order by AWB number or order ID
     */
    async trackOrder(trackingId) {
        try {
            await this.ensureAuthenticated();

            console.log('📍 Tracking order:', trackingId);

            const response = await axios.get(`${this.baseURL}/v1/external/courier/track/awb/${trackingId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            console.log('✅ Tracking successful:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Failed to track order:', error.response?.data || error.message);
            
            // Handle specific error cases
            if (error.response?.status === 404) {
                return {
                    status: 404,
                    message: 'AWB not found',
                    data: null
                };
            }
            
            throw new Error(`Tracking failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Generate AWB (Air Way Bill) for an order
     */
    async generateAWB(shipment_id, courier_id) {
        try {
            await this.ensureAuthenticated();

            const response = await axios.post(`${this.baseURL}/v1/external/courier/assign/awb`, {
                shipment_id: parseInt(shipment_id),
                courier_id: parseInt(courier_id)
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            return response.data;

        } catch (error) {
            console.error('❌ Failed to generate AWB:', error.response?.data || error.message);
            throw new Error(`AWB generation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Schedule pickup for shipment
     */
    async schedulePickup(shipment_id) {
        try {
            await this.ensureAuthenticated();

            const response = await axios.post(`${this.baseURL}/v1/external/courier/generate/pickup`, {
                shipment_id: [parseInt(shipment_id)]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            return response.data;

        } catch (error) {
            console.error('❌ Failed to schedule pickup:', error.response?.data || error.message);
            throw new Error(`Pickup scheduling failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Generate shipping label
     */
    async generateLabel(shipment_id) {
        try {
            await this.ensureAuthenticated();

            const response = await axios.post(`${this.baseURL}/v1/external/courier/generate/label`, {
                shipment_id: [parseInt(shipment_id)]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            return response.data;

        } catch (error) {
            console.error('❌ Failed to generate label:', error.response?.data || error.message);
            throw new Error(`Label generation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get orders from Shiprocket account
     */
    async getOrders(page = 1, per_page = 10) {
        try {
            await this.ensureAuthenticated();

            console.log('📦 Getting orders from Shiprocket...');

            const response = await axios.get(`${this.baseURL}/v1/external/orders`, {
                params: {
                    page,
                    per_page
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                timeout: 30000
            });

            console.log('✅ Orders retrieved successfully:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ Failed to get orders:', error.response?.data || error.message);
            throw new Error(`Get orders failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Run comprehensive diagnostics
     */
    async runDiagnostics() {
        const results = {
            timestamp: new Date().toISOString(),
            tests: []
        };

        try {
            // Test 1: Authentication
            console.log('🔐 Testing authentication...');
            const authResult = await this.authenticate();
            results.tests.push({
                name: 'Authentication',
                status: 'PASS',
                details: authResult
            });

            // Test 2: Pickup locations
            console.log('📍 Testing pickup locations...');
            const pickupResult = await this.getPickupLocations();
            results.tests.push({
                name: 'Pickup Locations',
                status: 'PASS',
                details: pickupResult
            });

            // Test 3: Serviceability check
            console.log('🔍 Testing serviceability...');
            const serviceabilityResult = await this.checkServiceability('400001', '110001');
            results.tests.push({
                name: 'Serviceability Check',
                status: 'PASS',
                details: serviceabilityResult
            });

            results.overall_status = 'PASS';
            results.message = 'All tests passed successfully';

        } catch (error) {
            results.tests.push({
                name: 'Failed Test',
                status: 'FAIL',
                error: error.message
            });
            results.overall_status = 'FAIL';
            results.message = error.message;
        }

        return results;
    }
}

module.exports = ShiprocketService;
