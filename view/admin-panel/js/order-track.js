/**
 * Auric Comprehensive Order Tracking System
 * 
 * This script handles advanced order tracking with real Shiprocket integration,
 * Firebase order correlation, and comprehensive status updates
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get necessary elements
    const trackForm = document.getElementById('trackOrderForm');
    const orderIdInput = document.getElementById('orderId');

    // Enhanced tracking with multiple data sources
    if (trackForm) {
        trackForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const orderId = orderIdInput.value.trim();

            if (orderId === '') {
                showError('Please enter an order ID or AWB number');
                return;
            }

            // Enhanced tracking with multiple attempts
            trackOrderComprehensive(orderId);
        });
    }

    // Comprehensive tracking function with multiple data sources
    async function trackOrderComprehensive(trackingId) {
        try {
            showLoadingModal('🔍 Searching for your order...');
            console.log('🔍 Starting comprehensive tracking for:', trackingId);

            // Step 1: Check if it's a Firebase order ID first
            const firebaseOrder = await checkFirebaseOrder(trackingId);

            // Step 2: Try Shiprocket tracking (works for AWB numbers)
            const shiprocketResult = await trackWithShiprocket(trackingId);

            // Step 3: If we have Firebase order but no Shiprocket data, try to find AWB
            let combinedResult = null;
            if (firebaseOrder && !shiprocketResult.success) {
                combinedResult = await trackFirebaseOrderWithShipment(firebaseOrder, trackingId);
            } else if (shiprocketResult.success) {
                combinedResult = await enrichShiprocketWithFirebase(shiprocketResult.data, trackingId);
            }

            // Display results based on what we found
            if (combinedResult) {
                displayComprehensiveResults(combinedResult, trackingId);
            } else if (firebaseOrder) {
                displayFirebaseOrderOnly(firebaseOrder, trackingId);
            } else if (shiprocketResult.success) {
                displayShiprocketOnly(shiprocketResult.data, trackingId);
            } else {
                // No data found anywhere
                throw new Error(`Order "${trackingId}" not found in our system or shipping provider`);
            }

        } catch (error) {
            console.error('❌ Comprehensive tracking failed:', error);
            showErrorModal(error.message);
        }
    }

    // Check Firebase for order data
    async function checkFirebaseOrder(orderId) {
        try {
            if (!window.firebase || !firebase.auth().currentUser) {
                console.log('🔒 User not authenticated, skipping Firebase order check');
                return null;
            }

            console.log('🔍 Checking Firebase for order:', orderId);

            const userOrdersRef = firebase.firestore()
                .collection('users')
                .doc(firebase.auth().currentUser.uid)
                .collection('orders');

            // Try to find order by document ID
            try {
                const orderDoc = await userOrdersRef.doc(orderId).get();
                if (orderDoc.exists) {
                    console.log('✅ Found Firebase order by ID');
                    return { id: orderDoc.id, ...orderDoc.data() };
                }
            } catch (e) {
                console.log('📝 Order ID not found as document ID, searching by order reference');
            }

            // Try to find by orderReference field
            const orderQuery = await userOrdersRef
                .where('orderReference', '==', orderId)
                .limit(1)
                .get();

            if (!orderQuery.empty) {
                console.log('✅ Found Firebase order by reference');
                const doc = orderQuery.docs[0];
                return { id: doc.id, ...doc.data() };
            }

            console.log('❌ No Firebase order found');
            return null;
        } catch (error) {
            console.error('❌ Firebase order check failed:', error);
            return null;
        }
    }

    // Track with Shiprocket API
    async function trackWithShiprocket(trackingId) {
        try {
            console.log('🚚 Checking Shiprocket for AWB:', trackingId);

            const response = await fetch(`/.netlify/functions/shiprocket-track-order/${trackingId}`);
            const result = await response.json();

            if (result.success && !result.isTestData) {
                // Check for Shiprocket errors
                if (result.data?.tracking_data?.error) {
                    const error = result.data.tracking_data.error;
                    if (error.includes('no shipment present') || error.includes('Aahh!')) {
                        return { success: false, error: 'AWB not found in shipping system' };
                    }
                }
                console.log('✅ Found Shiprocket tracking data');
                return { success: true, data: result.data };
            }

            return { success: false, error: result.error || 'No shipping data found' };
        } catch (error) {
            console.error('❌ Shiprocket tracking failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Combine Firebase order with shipment tracking
    async function trackFirebaseOrderWithShipment(firebaseOrder, orderId) {
        console.log('🔗 Combining Firebase order with shipment data');

        // Look for AWB in Firebase order data
        let awbNumber = null;
        if (firebaseOrder.shiprocketData?.awb_code) {
            awbNumber = firebaseOrder.shiprocketData.awb_code;
        } else if (firebaseOrder.awbNumber) {
            awbNumber = firebaseOrder.awbNumber;
        }

        let shiprocketData = null;
        if (awbNumber) {
            console.log('📋 Found AWB in Firebase order, tracking:', awbNumber);
            const shiprocketResult = await trackWithShiprocket(awbNumber);
            if (shiprocketResult.success) {
                shiprocketData = shiprocketResult.data;
            }
        }

        return {
            type: 'combined',
            firebaseOrder,
            shiprocketData,
            awbNumber
        };
    }

    // Enrich Shiprocket data with Firebase order info
    async function enrichShiprocketWithFirebase(shiprocketData, awbNumber) {
        console.log('💎 Enriching Shiprocket data with Firebase order info');

        // Try to find Firebase order that matches this AWB
        let firebaseOrder = null;

        if (window.firebase && firebase.auth().currentUser) {
            try {
                const userOrdersRef = firebase.firestore()
                    .collection('users')
                    .doc(firebase.auth().currentUser.uid)
                    .collection('orders');

                // Search for order with matching AWB
                const orderQuery = await userOrdersRef
                    .where('shiprocketData.awb_code', '==', awbNumber)
                    .limit(1)
                    .get();

                if (!orderQuery.empty) {
                    const doc = orderQuery.docs[0];
                    firebaseOrder = { id: doc.id, ...doc.data() };
                    console.log('✅ Found matching Firebase order for AWB');
                }
            } catch (e) {
                console.log('❌ Could not find matching Firebase order');
            }
        }

        return {
            type: 'enriched',
            shiprocketData,
            firebaseOrder,
            awbNumber
        };
    }

    // Display comprehensive results
    function displayComprehensiveResults(combinedData, trackingId) {
        const { type, firebaseOrder, shiprocketData, awbNumber } = combinedData;

        let orderInfo = '';
        let trackingInfo = '';
        let statusBadge = '';

        // Order Information Section
        if (firebaseOrder) {
            const orderDate = firebaseOrder.timestamp ? 
                new Date(firebaseOrder.timestamp.seconds * 1000).toLocaleDateString() : 
                new Date(firebaseOrder.createdAt).toLocaleDateString();

            statusBadge = getOrderStatusBadge(firebaseOrder, shiprocketData);

            orderInfo = `
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #1e293b; display: flex; align-items: center;">
                        <i class="fas fa-shopping-bag" style="margin-right: 10px; color: #3b82f6;"></i>
                        Order Information
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div>
                            <strong>Order ID:</strong><br>
                            <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${firebaseOrder.orderReference || trackingId}</code>
                        </div>
                        <div>
                            <strong>Order Date:</strong><br>
                            ${orderDate}
                        </div>
                        <div>
                            <strong>Total Amount:</strong><br>
                            ₹${firebaseOrder.totalAmount || 'N/A'}
                        </div>
                        <div>
                            <strong>Payment:</strong><br>
                            ${firebaseOrder.paymentMethod || 'N/A'} - ${firebaseOrder.paymentStatus || 'Unknown'}
                        </div>
                    </div>
                    ${awbNumber ? `
                        <div style="margin-top: 15px; padding: 10px; background: #dbeafe; border-radius: 8px;">
                            <strong style="color: #1e40af;">AWB Number:</strong> 
                            <code style="background: white; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">${awbNumber}</code>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Shipping Information Section
        if (shiprocketData?.tracking_data) {
            const trackingData = shiprocketData.tracking_data;
            const currentStatus = trackingData.current_status || trackingData.shipment_status || 'Unknown';
            const courierName = trackingData.courier_name || 'Unknown Courier';
            const edd = trackingData.edd || 'Not available';

            trackingInfo = `
                <div style="background: #f0f9ff; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #1e293b; display: flex; align-items: center;">
                        <i class="fas fa-truck" style="margin-right: 10px; color: #0ea5e9;"></i>
                        Shipping Status
                    </h4>
                    <div style="text-align: center; margin-bottom: 20px;">
                        ${getShippingStatusBadge(currentStatus)}
                        <p style="margin: 10px 0 0 0; color: #64748b;">via ${courierName}</p>
                        ${edd !== 'Not available' ? `<p style="margin: 5px 0 0 0; color: #64748b;"><strong>Expected Delivery:</strong> ${edd}</p>` : ''}
                    </div>
                    ${generateTrackingTimeline(trackingData.shipment_track || [])}
                </div>
            `;
        } else if (firebaseOrder && !shiprocketData) {
            // Order exists but no shipping data yet
            trackingInfo = `
                <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
                    <i class="fas fa-clock" style="font-size: 36px; color: #f59e0b; margin-bottom: 15px;"></i>
                    <h4 style="margin: 0 0 10px 0; color: #92400e;">Order Being Processed</h4>
                    <p style="margin: 0; color: #92400e;">Your order is being prepared for shipment. Tracking information will be available once the shipment is created.</p>
                </div>
            `;
        }

        showResultModal('📦 Complete Order Information', `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h3 style="color: #2563eb; margin: 0 0 10px 0;">Order Tracking Results</h3>
                    <p style="color: #64748b; margin: 0;">Tracking ID: <strong>${trackingId}</strong></p>
                </div>

                ${statusBadge}
                ${orderInfo}
                ${trackingInfo}

                <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <p style="margin: 0; color: #065f46;"><strong>💡 Tip:</strong> Bookmark this page and check back regularly for the latest updates on your order.</p>
                </div>
            </div>
        `);
    }

    // Display Firebase order only
    function displayFirebaseOrderOnly(firebaseOrder, trackingId) {
        const orderDate = firebaseOrder.timestamp ? 
            new Date(firebaseOrder.timestamp.seconds * 1000).toLocaleDateString() : 
            new Date(firebaseOrder.createdAt).toLocaleDateString();

        showResultModal('📋 Order Found', `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h3 style="color: #2563eb; margin: 0 0 10px 0;">Order Information</h3>
                    <p style="color: #64748b; margin: 0;">Order ID: <strong>${trackingId}</strong></p>
                </div>

                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #1e293b;">Order Details</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div><strong>Order Date:</strong><br>${orderDate}</div>
                        <div><strong>Total Amount:</strong><br>₹${firebaseOrder.totalAmount || 'N/A'}</div>
                        <div><strong>Payment:</strong><br>${firebaseOrder.paymentMethod || 'N/A'}</div>
                        <div><strong>Status:</strong><br>${firebaseOrder.paymentStatus || 'Processing'}</div>
                    </div>
                </div>

                <div style="background: #fef3c7; padding: 20px; border-radius: 12px; text-align: center;">
                    <i class="fas fa-clock" style="font-size: 36px; color: #f59e0b; margin-bottom: 15px;"></i>
                    <h4 style="margin: 0 0 10px 0; color: #92400e;">Being Prepared for Shipment</h4>
                    <p style="margin: 0; color: #92400e;">Your order is being processed. Shipping tracking will be available once your order is dispatched.</p>
                </div>
            </div>
        `);
    }

    // Display Shiprocket data only
    function displayShiprocketOnly(shiprocketData, trackingId) {
        const trackingData = shiprocketData.tracking_data || {};
        const currentStatus = trackingData.current_status || 'Unknown';

        showResultModal('🚚 Shipping Information', `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h3 style="color: #2563eb; margin: 0 0 10px 0;">Shipment Tracking</h3>
                    <p style="color: #64748b; margin: 0;">AWB: <strong>${trackingId}</strong></p>
                </div>

                <div style="text-align: center; margin-bottom: 20px;">
                    ${getShippingStatusBadge(currentStatus)}
                    ${trackingData.courier_name ? `<p style="margin: 10px 0 0 0; color: #64748b;">via ${trackingData.courier_name}</p>` : ''}
                    ${trackingData.edd ? `<p style="margin: 5px 0 0 0; color: #64748b;"><strong>Expected Delivery:</strong> ${trackingData.edd}</p>` : ''}
                </div>

                ${generateTrackingTimeline(trackingData.shipment_track || [])}

                <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <p style="margin: 0; color: #1e40af;"><strong>Note:</strong> For complete order details, please log in to your account.</p>
                </div>
            </div>
        `);
    }

    // Generate order status badge
    function getOrderStatusBadge(firebaseOrder, shiprocketData) {
        let status = 'Processing';
        let bgColor = '#f59e0b';
        let textColor = 'white';

        if (shiprocketData?.tracking_data?.track_status >= 6) {
            status = 'Delivered';
            bgColor = '#10b981';
        } else if (shiprocketData?.tracking_data?.track_status >= 3) {
            status = 'In Transit';
            bgColor = '#3b82f6';
        } else if (shiprocketData?.tracking_data?.track_status >= 1) {
            status = 'Shipped';
            bgColor = '#8b5cf6';
        } else if (firebaseOrder.paymentStatus === 'completed') {
            status = 'Confirmed';
            bgColor = '#06b6d4';
        }

        return `
            <div style="text-align: center; margin-bottom: 25px;">
                <span style="background: ${bgColor}; color: ${textColor}; padding: 12px 24px; border-radius: 25px; font-weight: 600; font-size: 16px;">
                    ${status}
                </span>
            </div>
        `;
    }

    // Generate shipping status badge
    function getShippingStatusBadge(status) {
        const statusMap = {
            'delivered': { bg: '#10b981', text: 'white', icon: 'fas fa-check-circle' },
            'out for delivery': { bg: '#f59e0b', text: 'white', icon: 'fas fa-truck' },
            'in transit': { bg: '#3b82f6', text: 'white', icon: 'fas fa-shipping-fast' },
            'picked up': { bg: '#8b5cf6', text: 'white', icon: 'fas fa-box' },
            'order created': { bg: '#6b7280', text: 'white', icon: 'fas fa-file-alt' }
        };

        const config = statusMap[status.toLowerCase()] || { bg: '#6b7280', text: 'white', icon: 'fas fa-info-circle' };

        return `
            <div style="display: inline-flex; align-items: center; background: ${config.bg}; color: ${config.text}; padding: 12px 20px; border-radius: 25px; font-weight: 600;">
                <i class="${config.icon}" style="margin-right: 8px;"></i>
                ${status}
            </div>
        `;
    }

    // Generate tracking timeline
    function generateTrackingTimeline(trackingEvents) {
        if (!trackingEvents || trackingEvents.length === 0) {
            return `
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; color: #64748b;">No detailed tracking information available yet</p>
                </div>
            `;
        }

        const sortedEvents = [...trackingEvents].reverse(); // Most recent first

        return `
            <div style="margin-top: 20px;">
                <h5 style="margin: 0 0 15px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                    📍 Tracking Timeline
                </h5>
                <div style="max-height: 350px; overflow-y: auto; padding-right: 10px;">
                    ${sortedEvents.map((event, index) => `
                        <div style="border-left: 3px solid ${index === 0 ? '#10b981' : '#e2e8f0'}; padding-left: 15px; margin-bottom: 20px; position: relative;">
                            <div style="position: absolute; left: -6px; top: 5px; width: 10px; height: 10px; background: ${index === 0 ? '#10b981' : '#e2e8f0'}; border-radius: 50%;"></div>
                            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <h6 style="margin: 0 0 8px 0; color: #1e293b; font-weight: 600;">
                                    ${event.current_status || event.status || 'Status Update'}
                                </h6>
                                <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">
                                    ${event.activity || event.message || 'Tracking update'}
                                </p>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                    <small style="color: #64748b; font-size: 12px;">
                                        ${event.date ? new Date(event.date).toLocaleString() : 'Date not available'}
                                    </small>
                                    ${event.location ? `<small style="color: #3b82f6; font-size: 12px;"><i class="fas fa-map-marker-alt"></i> ${event.location}</small>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Enhanced modal functions
    function showLoadingModal(message) {
        hideAllModals();

        const loadingModal = document.createElement('div');
        loadingModal.id = 'comprehensiveLoadingModal';
        loadingModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.6); z-index: 10000; 
            display: flex; align-items: center; justify-content: center;
        `;

        loadingModal.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 15px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.25); max-width: 400px; width: 90%;">
                <div style="margin-bottom: 20px;">
                    <div style="width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
                <h3 style="margin: 0 0 10px 0; color: #1e293b;">${message}</h3>
                <p style="margin: 0; color: #64748b;">Please wait while we search multiple sources...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

        document.body.appendChild(loadingModal);
    }

    function showResultModal(title, content) {
        hideAllModals();

        const resultModal = document.createElement('div');
        resultModal.id = 'comprehensiveResultModal';
        resultModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.6); z-index: 10000; 
            display: flex; align-items: center; justify-content: center; padding: 20px;
        `;

        resultModal.innerHTML = `
            <div style="background: white; border-radius: 15px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 25px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(90deg, #3b82f6, #1e40af); color: white; border-radius: 15px 15px 0 0;">
                    <h2 style="margin: 0; font-size: 24px;">${title}</h2>
                    <button onclick="this.closest('div').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>
                <div>${content}</div>
                <div style="padding: 25px; text-align: center; border-top: 1px solid #e2e8f0; background: #f8fafc;">
                    <button onclick="this.closest('div').remove(); document.getElementById('orderId').value = ''" style="background: #3b82f6; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-right: 15px;">Track Another Order</button>
                    <button onclick="this.closest('div').remove()" style="background: #6b7280; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(resultModal);

        // Clear the form
        if (trackForm) {
            trackForm.reset();
        }
    }

    function showErrorModal(errorMessage) {
        hideAllModals();

        const errorModal = document.createElement('div');
        errorModal.id = 'comprehensiveErrorModal';
        errorModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.6); z-index: 10000; 
            display: flex; align-items: center; justify-content: center; padding: 20px;
        `;

        errorModal.innerHTML = `
            <div style="background: white; border-radius: 15px; max-width: 500px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
                <div style="padding: 30px; text-align: center;">
                    <div style="color: #dc2626; margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                    </div>
                    <h3 style="color: #dc2626; margin: 0 0 15px 0;">Order Not Found</h3>
                    <p style="color: #374151; margin: 0 0 20px 0;">${errorMessage}</p>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; color: #92400e; text-align: left; margin-bottom: 20px;">
                        <strong>Please check:</strong><br>
                        • Order ID is correct (check your email confirmation)<br>
                        • AWB number is accurate (if provided by support)<br>
                        • Order was placed with this account<br>
                        • Try again in a few minutes<br><br>
                        <strong>Need help?</strong> Contact our support team with your order details.
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; background: #f8fafc;">
                    <button onclick="this.closest('div').remove()" style="background: #dc2626; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(errorModal);
    }

    function hideAllModals() {
        const modals = ['comprehensiveLoadingModal', 'comprehensiveResultModal', 'comprehensiveErrorModal'];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.remove();
        });
    }

    function showError(message) {
        console.error('Error:', message);
        // Add visual error feedback here if needed
    }

    // Auto-refresh functionality for active tracking
    let refreshInterval = null;

    function startAutoRefresh(trackingId) {
        if (refreshInterval) clearInterval(refreshInterval);

        refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing tracking data...');
            trackOrderComprehensive(trackingId);
        }, 30000); // Refresh every 30 seconds
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    // Clean up on page unload
    window.addEventListener('beforeunload', stopAutoRefresh);
});