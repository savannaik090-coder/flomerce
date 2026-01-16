/**
 * Shiprocket API Integration Service
 * Handles authentication, order creation, and tracking in test mode
 */

const axios = require('axios');

class ShiprocketService {
    constructor() {
        this.baseURL = 'https://apiv2.shiprocket.in'; // Production URL - test mode is controlled by credentials
        this.token = null;
        this.tokenExpiry = null;
        
        // Test mode credentials from environment variables
        this.email = process.env.SHIPROCKET_EMAIL;
        this.password = process.env.SHIPROCKET_PASSWORD;
        
        if (!this.email || !this.password) {
            throw new Error('Shiprocket credentials not found in environment variables');
        }
    }

    /**
     * Authenticate with Shiprocket API
     */
    async authenticate() {
        try {
            console.log('Authenticating with Shiprocket API...');
            
            const response = await axios.post(`${this.baseURL}/v1/external/auth/login`, {
                email: this.email,
                password: this.password
            });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                // Set token expiry to 24 hours from now
                this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
                console.log('Shiprocket authentication successful');
                return true;
            } else {
                throw new Error('Invalid response from Shiprocket API');
            }
        } catch (error) {
            console.error('Shiprocket authentication failed:', error.response?.data || error.message);
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
    }

    /**
     * Check serviceability before creating order
     */
    async checkServiceability(pickup_pincode, delivery_pincode, weight = 0.5, cod = 0) {
        try {
            await this.ensureAuthenticated();

            const params = new URLSearchParams({
                pickup_postcode: pickup_pincode,
                delivery_postcode: delivery_pincode,
                weight,
                cod
            });

            const response = await axios.get(`${this.baseURL}/v1/external/courier/serviceability?${params}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('Serviceability check failed:', error.response?.data || error.message);
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
                }
            });

            return response.data;

        } catch (error) {
            console.error('Failed to get pickup locations:', error.response?.data || error.message);
            throw new Error(`Get pickup locations failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Create a shipment order
     */
    async createOrder(orderData) {
        try {
            await this.ensureAuthenticated();

            // First check serviceability
            console.log('Checking serviceability...');
            const serviceability = await this.checkServiceability('400001', orderData.customer.pinCode);
            console.log('Serviceability result:', serviceability);

            // Get pickup locations to use correct pickup location name
            console.log('Getting pickup locations...');
            const pickupLocations = await this.getPickupLocations();
            console.log('Pickup locations:', pickupLocations);

            // Use the first available pickup location or Primary
            let pickupLocationName = "Primary";
            if (pickupLocations && pickupLocations.data && pickupLocations.data.shipping_address && pickupLocations.data.shipping_address.length > 0) {
                pickupLocationName = pickupLocations.data.shipping_address[0].pickup_location;
            }

            // Clean phone number - remove spaces, dashes, and ensure 10 digits
            const cleanPhone = orderData.customer.phone.replace(/[^0-9]/g, '').slice(-10);
            
            const shipmentData = {
                order_id: orderData.order_id,
                order_date: orderData.order_date || new Date().toISOString().split('T')[0],
                pickup_location: pickupLocationName,
                billing_customer_name: orderData.customer.firstName,
                billing_last_name: orderData.customer.lastName,
                billing_address: orderData.customer.address,
                billing_city: orderData.customer.city,
                billing_pincode: orderData.customer.pinCode,
                billing_state: orderData.customer.state,
                billing_country: "India",
                billing_email: orderData.customer.email,
                billing_phone: cleanPhone,
                shipping_is_billing: true, // Use billing address for shipping
                order_items: orderData.items.map(item => ({
                    name: item.name,
                    sku: item.id,
                    units: item.quantity,
                    selling_price: item.price,
                    discount: 0,
                    tax: 0,
                    hsn: 411 // Default HSN code for jewelry
                })),
                payment_method: orderData.payment_method || "Prepaid",
                shipping_charges: 0,
                giftwrap_charges: 0,
                transaction_charges: 0,
                total_discount: 0,
                sub_total: orderData.total,
                length: 10,
                breadth: 10,
                height: 10,
                weight: 0.5
            };

            console.log('Creating Shiprocket order:', shipmentData);

            const response = await axios.post(`${this.baseURL}/v1/external/orders/create/adhoc`, shipmentData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            console.log('Shiprocket order created successfully:', response.data);
            
            // Automatically complete the workflow: AWB → Pickup → Labels
            const orderResult = response.data;
            
            if (orderResult.shipment_id) {
                try {
                    console.log('🚚 Starting automatic workflow completion...');
                    
                    // Step 1: Get recommended courier and assign AWB
                    const recommendedCourier = serviceability?.data?.recommended_courier_company_id;
                    if (recommendedCourier) {
                        console.log('📋 Assigning AWB with courier:', recommendedCourier);
                        const awbResult = await this.generateAWB(orderResult.shipment_id, recommendedCourier);
                        orderResult.awb_data = awbResult;
                        console.log('✅ AWB assigned successfully:', awbResult.awb_code);
                        
                        // Step 2: Schedule pickup automatically
                        console.log('📅 Scheduling pickup...');
                        const pickupResult = await this.schedulePickup(orderResult.shipment_id);
                        orderResult.pickup_data = pickupResult;
                        console.log('✅ Pickup scheduled successfully');
                        
                        // Step 3: Generate shipping label
                        console.log('🏷️ Generating shipping label...');
                        const labelResult = await this.generateLabel(orderResult.shipment_id);
                        orderResult.label_data = labelResult;
                        console.log('✅ Shipping label generated successfully');
                        
                        orderResult.workflow_completed = true;
                        console.log('🎉 Complete automated workflow finished successfully!');
                    } else {
                        console.log('⚠️ No recommended courier found, manual AWB assignment required');
                        orderResult.workflow_completed = false;
                    }
                } catch (workflowError) {
                    console.error('⚠️ Workflow completion failed (order still created):', workflowError.message);
                    orderResult.workflow_error = workflowError.message;
                    orderResult.workflow_completed = false;
                }
            }
            
            return orderResult;

        } catch (error) {
            console.error('Failed to create Shiprocket order:', error.response?.data || error.message);
            throw new Error(`Order creation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Track an order by AWB number or order ID
     */
    async trackOrder(trackingId) {
        try {
            await this.ensureAuthenticated();

            const response = await axios.get(`${this.baseURL}/v1/external/courier/track/awb/${trackingId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('Failed to track order:', error.response?.data || error.message);
            throw new Error(`Tracking failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get available courier companies for a pincode
     */
    async getCourierServices(pickup_postcode, delivery_postcode, weight = 0.5, cod = 0) {
        try {
            await this.ensureAuthenticated();

            const params = new URLSearchParams({
                pickup_postcode,
                delivery_postcode,
                weight,
                cod
            });

            const response = await axios.get(`${this.baseURL}/v1/external/courier/serviceability?${params}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('Failed to get courier services:', error.response?.data || error.message);
            throw new Error(`Courier services fetch failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Generate AWB (Air Way Bill) for an order
     */
    async generateAWB(shipment_id, courier_id) {
        try {
            await this.ensureAuthenticated();

            const response = await axios.post(`${this.baseURL}/v1/external/courier/assign/awb`, {
                shipment_id,
                courier_id
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('Failed to generate AWB:', error.response?.data || error.message);
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
                shipment_id: [shipment_id]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('Failed to schedule pickup:', error.response?.data || error.message);
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
                shipment_id: [shipment_id]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('Failed to generate label:', error.response?.data || error.message);
            throw new Error(`Label generation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Generate manifest for multiple shipments
     */
    async generateManifest(shipment_ids) {
        try {
            await this.ensureAuthenticated();

            const response = await axios.post(`${this.baseURL}/v1/external/manifests/generate`, {
                shipment_id: shipment_ids
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('Failed to generate manifest:', error.response?.data || error.message);
            throw new Error(`Manifest generation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get orders from Shiprocket
     */
    async getOrders(page = 1, per_page = 10) {
        try {
            await this.ensureAuthenticated();

            const response = await axios.get(`${this.baseURL}/v1/external/orders?page=${page}&per_page=${per_page}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('Failed to get orders:', error.response?.data || error.message);
            throw new Error(`Get orders failed: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = ShiprocketService;