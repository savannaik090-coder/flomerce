const axios = require('axios');

class ShiprocketService {
    constructor() {
        this.baseUrl = 'https://apiv2.shiprocket.in/v1/external';
        this.email = process.env.SHIPROCKET_EMAIL;
        this.password = process.env.SHIPROCKET_PASSWORD;
        this.token = null;
        this.tokenExpiry = null;
    }

    async authenticate() {
        try {
            const response = await axios.post(`${this.baseUrl}/auth/login`, {
                email: this.email,
                password: this.password
            });
            
            this.token = response.data.token;
            this.tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
            console.log('Shiprocket authentication successful');
            return this.token;
        } catch (error) {
            console.error('Shiprocket authentication failed:', error.message);
            throw new Error('Failed to authenticate with Shiprocket');
        }
    }

    async ensureAuthenticated() {
        if (!this.token || Date.now() >= this.tokenExpiry) {
            await this.authenticate();
        }
        return this.token;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    async createOrder(orderData) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.post(
                `${this.baseUrl}/orders/create/adhoc`,
                orderData,
                { headers: this.getHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error creating order:', error.response?.data || error.message);
            throw error;
        }
    }

    async trackOrder(trackingId) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.get(
                `${this.baseUrl}/courier/track/awb/${trackingId}`,
                { headers: this.getHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error tracking order:', error.response?.data || error.message);
            throw error;
        }
    }

    async getCourierServices(pickup_postcode, delivery_postcode, weight, cod = 0) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.get(
                `${this.baseUrl}/courier/serviceability`,
                {
                    headers: this.getHeaders(),
                    params: { pickup_postcode, delivery_postcode, weight, cod }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error getting courier services:', error.response?.data || error.message);
            throw error;
        }
    }

    async generateAWB(shipment_id, courier_id) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.post(
                `${this.baseUrl}/courier/assign/awb`,
                { shipment_id, courier_id },
                { headers: this.getHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error generating AWB:', error.response?.data || error.message);
            throw error;
        }
    }

    async getOrders(page = 1, per_page = 10) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.get(
                `${this.baseUrl}/orders`,
                {
                    headers: this.getHeaders(),
                    params: { page, per_page }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error getting orders:', error.response?.data || error.message);
            throw error;
        }
    }

    async schedulePickup(shipment_id) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.post(
                `${this.baseUrl}/courier/generate/pickup`,
                { shipment_id: [shipment_id] },
                { headers: this.getHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error scheduling pickup:', error.response?.data || error.message);
            throw error;
        }
    }

    async generateLabel(shipment_id) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.post(
                `${this.baseUrl}/courier/generate/label`,
                { shipment_id: [shipment_id] },
                { headers: this.getHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error generating label:', error.response?.data || error.message);
            throw error;
        }
    }

    async generateManifest(shipment_ids) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.post(
                `${this.baseUrl}/manifests/generate`,
                { shipment_id: shipment_ids },
                { headers: this.getHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error generating manifest:', error.response?.data || error.message);
            throw error;
        }
    }

    async getPickupLocations() {
        await this.ensureAuthenticated();
        try {
            const response = await axios.get(
                `${this.baseUrl}/settings/company/pickup`,
                { headers: this.getHeaders() }
            );
            return response.data;
        } catch (error) {
            console.error('Error getting pickup locations:', error.response?.data || error.message);
            throw error;
        }
    }

    async checkServiceability(pickup_postcode, delivery_postcode, weight = 0.5) {
        await this.ensureAuthenticated();
        try {
            const response = await axios.get(
                `${this.baseUrl}/courier/serviceability`,
                {
                    headers: this.getHeaders(),
                    params: { pickup_postcode, delivery_postcode, weight, cod: 0 }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error checking serviceability:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = ShiprocketService;
