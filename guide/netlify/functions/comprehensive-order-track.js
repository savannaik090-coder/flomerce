
/**
 * Comprehensive Order Tracking Netlify Function
 * Combines Firebase order data with Shiprocket tracking for complete order information
 * Endpoint: /.netlify/functions/comprehensive-order-track
 */

const axios = require('axios');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        const { trackingId, userToken } = JSON.parse(event.body || '{}');
        
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

        console.log('🔍 Comprehensive tracking for ID:', trackingId);

        const result = {
            trackingId,
            timestamp: new Date().toISOString(),
            sources: {
                firebase: null,
                shiprocket: null
            },
            combined: null
        };

        // Step 1: Try Shiprocket tracking (works for AWB numbers)
        try {
            console.log('🚚 Checking Shiprocket...');
            const shiprocketResponse = await axios.get(
                `${process.env.URL || 'https://your-site.netlify.app'}/.netlify/functions/shiprocket-track-order/${trackingId}`,
                { timeout: 10000 }
            );

            if (shiprocketResponse.data.success) {
                result.sources.shiprocket = shiprocketResponse.data;
                console.log('✅ Shiprocket data found');
            }
        } catch (shiprocketError) {
            console.log('❌ Shiprocket lookup failed:', shiprocketError.message);
            result.sources.shiprocket = { error: shiprocketError.message };
        }

        // Step 2: Enhanced order analysis
        if (result.sources.shiprocket?.data) {
            const trackingData = result.sources.shiprocket.data.tracking_data;
            
            // Analyze delivery status and provide insights
            const insights = analyzeDeliveryStatus(trackingData);
            
            result.combined = {
                currentStatus: trackingData.current_status || 'Unknown',
                statusCode: trackingData.track_status || 0,
                courierName: trackingData.courier_name || 'Unknown',
                awbCode: trackingData.awb_code || trackingId,
                expectedDelivery: trackingData.edd,
                lastUpdate: getLastUpdateTime(trackingData.shipment_track),
                insights: insights,
                timeline: enhanceTimeline(trackingData.shipment_track || []),
                deliveryMetrics: calculateDeliveryMetrics(trackingData)
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: result,
                hasShiprocketData: !!result.sources.shiprocket?.data,
                hasFirebaseData: !!result.sources.firebase,
                comprehensiveAnalysis: !!result.combined
            })
        };

    } catch (error) {
        console.error('❌ Comprehensive tracking error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

// Analyze delivery status and provide insights
function analyzeDeliveryStatus(trackingData) {
    const insights = {
        statusCategory: 'unknown',
        estimatedProgress: 0,
        nextExpectedAction: 'Unknown',
        deliveryConfidence: 'medium',
        potentialIssues: [],
        recommendations: []
    };

    const status = trackingData.track_status || 0;
    const currentStatus = (trackingData.current_status || '').toLowerCase();

    // Determine status category and progress
    if (status >= 6 || currentStatus.includes('delivered')) {
        insights.statusCategory = 'delivered';
        insights.estimatedProgress = 100;
        insights.nextExpectedAction = 'Order completed';
        insights.deliveryConfidence = 'high';
    } else if (status >= 4 || currentStatus.includes('out for delivery')) {
        insights.statusCategory = 'out_for_delivery';
        insights.estimatedProgress = 85;
        insights.nextExpectedAction = 'Delivery attempt today';
        insights.deliveryConfidence = 'high';
    } else if (status >= 3 || currentStatus.includes('in transit')) {
        insights.statusCategory = 'in_transit';
        insights.estimatedProgress = 60;
        insights.nextExpectedAction = 'Arrival at destination city';
        insights.deliveryConfidence = 'medium';
    } else if (status >= 2 || currentStatus.includes('picked')) {
        insights.statusCategory = 'picked_up';
        insights.estimatedProgress = 30;
        insights.nextExpectedAction = 'Transit to destination';
        insights.deliveryConfidence = 'medium';
    } else {
        insights.statusCategory = 'processing';
        insights.estimatedProgress = 10;
        insights.nextExpectedAction = 'Pickup from sender';
        insights.deliveryConfidence = 'low';
    }

    // Check for potential issues
    const edd = trackingData.edd;
    if (edd && new Date(edd) < new Date()) {
        insights.potentialIssues.push('Delivery delayed past expected date');
        insights.deliveryConfidence = 'low';
    }

    const shipmentTrack = trackingData.shipment_track || [];
    const lastUpdate = getLastUpdateTime(shipmentTrack);
    if (lastUpdate && new Date() - new Date(lastUpdate) > 48 * 60 * 60 * 1000) {
        insights.potentialIssues.push('No tracking updates for 48+ hours');
    }

    // Provide recommendations
    if (insights.statusCategory === 'out_for_delivery') {
        insights.recommendations.push('Be available for delivery', 'Keep phone accessible');
    } else if (insights.potentialIssues.length > 0) {
        insights.recommendations.push('Contact courier for updates', 'Check with customer support');
    }

    return insights;
}

// Get last update time from shipment track
function getLastUpdateTime(shipmentTrack) {
    if (!shipmentTrack || shipmentTrack.length === 0) return null;
    
    const lastEvent = shipmentTrack[shipmentTrack.length - 1];
    return lastEvent.date || lastEvent.timestamp || null;
}

// Enhance timeline with additional context
function enhanceTimeline(shipmentTrack) {
    return shipmentTrack.map((event, index) => {
        const enhanced = { ...event };
        
        // Add context based on status
        const status = (event.current_status || '').toLowerCase();
        
        if (status.includes('created')) {
            enhanced.context = 'Order processed and ready for pickup';
            enhanced.icon = 'fas fa-file-alt';
            enhanced.color = '#6b7280';
        } else if (status.includes('picked')) {
            enhanced.context = 'Package collected from sender';
            enhanced.icon = 'fas fa-box';
            enhanced.color = '#8b5cf6';
        } else if (status.includes('transit')) {
            enhanced.context = 'Package moving towards destination';
            enhanced.icon = 'fas fa-shipping-fast';
            enhanced.color = '#3b82f6';
        } else if (status.includes('out for delivery')) {
            enhanced.context = 'Package out for final delivery';
            enhanced.icon = 'fas fa-truck';
            enhanced.color = '#f59e0b';
        } else if (status.includes('delivered')) {
            enhanced.context = 'Package successfully delivered';
            enhanced.icon = 'fas fa-check-circle';
            enhanced.color = '#10b981';
        } else {
            enhanced.context = 'Status update';
            enhanced.icon = 'fas fa-info-circle';
            enhanced.color = '#6b7280';
        }

        // Calculate time since last update
        if (event.date) {
            const timeDiff = new Date() - new Date(event.date);
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            enhanced.timeAgo = hours < 24 ? `${hours} hours ago` : `${Math.floor(hours / 24)} days ago`;
        }

        return enhanced;
    });
}

// Calculate delivery metrics
function calculateDeliveryMetrics(trackingData) {
    const metrics = {
        totalTransitTime: null,
        averageStopTime: null,
        deliverySpeed: 'normal',
        performanceScore: 75
    };

    const shipmentTrack = trackingData.shipment_track || [];
    if (shipmentTrack.length < 2) return metrics;

    // Calculate total transit time if delivered
    const firstEvent = shipmentTrack[0];
    const lastEvent = shipmentTrack[shipmentTrack.length - 1];
    
    if (firstEvent.date && lastEvent.date) {
        const transitTime = new Date(lastEvent.date) - new Date(firstEvent.date);
        metrics.totalTransitTime = Math.floor(transitTime / (1000 * 60 * 60 * 24)); // days
        
        // Determine delivery speed
        if (metrics.totalTransitTime <= 1) {
            metrics.deliverySpeed = 'express';
            metrics.performanceScore = 95;
        } else if (metrics.totalTransitTime <= 3) {
            metrics.deliverySpeed = 'fast';
            metrics.performanceScore = 85;
        } else if (metrics.totalTransitTime <= 7) {
            metrics.deliverySpeed = 'normal';
            metrics.performanceScore = 75;
        } else {
            metrics.deliverySpeed = 'slow';
            metrics.performanceScore = 50;
        }
    }

    return metrics;
}
