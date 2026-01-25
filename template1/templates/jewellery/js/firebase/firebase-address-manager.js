
/**
 * Firebase Address Manager
 * Handles saving, loading, and managing user addresses in Firestore
 * Addresses are stored at path: users/{userId}/addresses/{addressId}
 */

window.FirebaseAddressManager = (function() {
    let db, auth;
    let initialized = false;

    function init() {
        if (initialized) return true;
        
        if (!window.firebase) {
            console.error('Firebase not available for Address Manager');
            return false;
        }

        try {
            db = firebase.firestore();
            auth = firebase.auth();
            initialized = true;
            console.log('Firebase Address Manager initialized');
            return true;
        } catch (error) {
            console.error('Error initializing Firebase Address Manager:', error);
            return false;
        }
    }

    /**
     * Validate PIN code using real postal service API
     * @param {string} pinCode - PIN code to validate
     * @returns {Promise<Object>} - Validation result with location details
     */
    async function validatePinCodeAPI(pinCode) {
        try {
            // Use India Post API or postal code validation API
            const response = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`);
            const data = await response.json();
            
            if (data && data[0] && data[0].Status === 'Success') {
                const postOffice = data[0].PostOffice[0];
                return {
                    valid: true,
                    district: postOffice.District,
                    state: postOffice.State,
                    city: postOffice.Name,
                    region: postOffice.Region
                };
            } else {
                return {
                    valid: false,
                    error: 'PIN code not found in postal database'
                };
            }
        } catch (error) {
            console.warn('PIN code validation API failed:', error);
            // Fallback - if API fails, don't block the user
            return {
                valid: true,
                fallback: true,
                error: 'Could not validate PIN code - API unavailable'
            };
        }
    }

    /**
     * Validate address data
     * @param {Object} addressData - Address information to validate
     * @returns {Object} - Validation result with success status and errors
     */
    function validateAddressData(addressData) {
        const errors = [];
        
        // Required field validation
        if (!addressData.firstName || addressData.firstName.trim().length < 2) {
            errors.push('First name must be at least 2 characters long');
        }
        
        if (!addressData.lastName || addressData.lastName.trim().length < 2) {
            errors.push('Last name must be at least 2 characters long');
        }
        
        // Enhanced email validation
        const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!addressData.email || !strictEmailRegex.test(addressData.email)) {
            errors.push('Please enter a valid email address with proper domain extension');
        }
        
        // Additional email checks
        if (addressData.email) {
            const email = addressData.email.toLowerCase();
            const domain = email.split('@')[1];
            
            // Check for incomplete domains
            if (domain && (domain.includes('.co') && !domain.includes('.com') && !domain.includes('.co.in') && !domain.includes('.co.uk'))) {
                if (domain.endsWith('.co')) {
                    errors.push('Email domain appears incomplete. Did you mean .com or .co.in?');
                }
            }
            
            // Check for common typos
            if (domain && (domain.includes('gmail.co') && !domain.includes('gmail.com'))) {
                errors.push('Invalid Gmail domain. Did you mean @gmail.com?');
            }
        }
        
        // Phone validation (10 digits)
        const phoneRegex = /^\d{10}$/;
        if (!addressData.phone || !phoneRegex.test(addressData.phone.replace(/\D/g, ''))) {
            errors.push('Please enter a valid 10-digit phone number');
        }
        
        // Real PIN code validation - check if PIN code actually exists
        const pinCodeRegex = /^\d{6}$/;
        if (!addressData.pinCode || !pinCodeRegex.test(addressData.pinCode)) {
            errors.push('Please enter a valid 6-digit PIN code');
        } else {
            // Add the actual PIN code validation as async check
            // This will be validated in the saveAddress function using real API
            console.log(`PIN code ${addressData.pinCode} will be validated against postal service database`);
        }
        
        // Address fields validation
        if (!addressData.houseNumber || addressData.houseNumber.trim().length < 1) {
            errors.push('House/Building number is required');
        } else {
            const houseNumber = addressData.houseNumber.trim();
            
            // Check for invalid patterns like all zeros
            if (/^0+$/.test(houseNumber)) {
                errors.push('Please enter a valid house/building number (cannot be all zeros)');
            }
            
            // Check for single zero
            if (houseNumber === '0') {
                errors.push('Please enter a valid house/building number');
            }
            
            // Check for valid characters
            if (!/^[a-zA-Z0-9\-\/\s]+$/.test(houseNumber)) {
                errors.push('House/Building number can only contain letters, numbers, hyphens, slashes, and spaces');
            }
        }
        
        if (!addressData.roadName || addressData.roadName.trim().length < 5) {
            errors.push('Road name/Area must be at least 5 characters long');
        }
        
        if (!addressData.city || addressData.city.trim().length < 2) {
            errors.push('City name must be at least 2 characters long');
        }
        
        if (!addressData.state || addressData.state.trim().length < 2) {
            errors.push('Please select a valid state');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Save a new address for the user
     * @param {Object} addressData - Address information
     * @returns {Promise<Object>} - Success status and address ID
     */
    async function saveAddress(addressData) {
        if (!init()) return { success: false, error: 'Firebase not initialized' };
        
        // First validate PIN code using real postal API
        if (addressData.pinCode) {
            console.log(`Validating PIN code ${addressData.pinCode} using postal service API...`);
            const pinValidation = await validatePinCodeAPI(addressData.pinCode);
            
            if (!pinValidation.valid && !pinValidation.fallback) {
                return { 
                    success: false, 
                    error: `PIN code ${addressData.pinCode} is not valid. Please check and enter a correct PIN code.` 
                };
            }
            
            // If PIN code is valid, check if state matches
            if (pinValidation.valid && pinValidation.state && addressData.state) {
                const normalizeState = (state) => state.toLowerCase().replace(/\s+/g, ' ').trim();
                const apiState = normalizeState(pinValidation.state);
                const userState = normalizeState(addressData.state);
                
                if (apiState !== userState) {
                    return { 
                        success: false, 
                        error: `PIN code ${addressData.pinCode} belongs to ${pinValidation.state}, but you selected ${addressData.state}. Please verify your PIN code and state.` 
                    };
                }
                
                console.log(`✅ PIN code validated: ${addressData.pinCode} belongs to ${pinValidation.district}, ${pinValidation.state}`);
            }
        }
        
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'User not authenticated' };

        // Validate address data
        const validation = validateAddressData(addressData);
        if (!validation.isValid) {
            return { success: false, error: validation.errors.join('. ') };
        }

        try {
            // Generate a unique ID for the address
            const addressId = db.collection('temp').doc().id;
            
            const addressToSave = {
                id: addressId,
                firstName: addressData.firstName || '',
                lastName: addressData.lastName || '',
                email: addressData.email || '',
                phone: addressData.phone || '',
                houseNumber: addressData.houseNumber || '',
                roadName: addressData.roadName || '',
                city: addressData.city || '',
                state: addressData.state || '',
                pinCode: addressData.pinCode || '',
                addressType: addressData.addressType || 'home',
                isDefault: addressData.isDefault || false,
                createdAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now()
            };

            // If this is being set as default, unset other defaults first
            if (addressToSave.isDefault) {
                await unsetOtherDefaults(user.uid);
            }

            // Save to Firestore at users/{userId}/addresses/{addressId}
            await db.collection('users').doc(user.uid).collection('addresses').doc(addressId).set(addressToSave);
            
            console.log('Address saved successfully:', addressId);
            return { success: true, addressId: addressId, address: addressToSave };
        } catch (error) {
            console.error('Error saving address:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Load all addresses for the current user
     * @returns {Promise<Object>} - Success status and addresses array
     */
    async function loadUserAddresses() {
        if (!init()) return { success: false, error: 'Firebase not initialized' };
        
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'User not authenticated' };

        try {
            const addressesSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('addresses')
                .orderBy('createdAt', 'desc')
                .get();

            const addresses = [];
            addressesSnapshot.forEach(doc => {
                addresses.push({ id: doc.id, ...doc.data() });
            });

            console.log(`Loaded ${addresses.length} addresses for user`);
            return { success: true, addresses: addresses };
        } catch (error) {
            console.error('Error loading addresses:', error);
            return { success: false, error: error.message, addresses: [] };
        }
    }

    /**
     * Update an existing address
     * @param {string} addressId - Address ID to update
     * @param {Object} addressData - Updated address data
     * @returns {Promise<Object>} - Success status
     */
    async function updateAddress(addressId, addressData) {
        if (!init()) return { success: false, error: 'Firebase not initialized' };
        
        // First validate PIN code using real postal API
        if (addressData.pinCode) {
            console.log(`Validating PIN code ${addressData.pinCode} using postal service API...`);
            const pinValidation = await validatePinCodeAPI(addressData.pinCode);
            
            if (!pinValidation.valid && !pinValidation.fallback) {
                return { 
                    success: false, 
                    error: `PIN code ${addressData.pinCode} is not valid. Please check and enter a correct PIN code.` 
                };
            }
            
            // If PIN code is valid, check if state matches
            if (pinValidation.valid && pinValidation.state && addressData.state) {
                const normalizeState = (state) => state.toLowerCase().replace(/\s+/g, ' ').trim();
                const apiState = normalizeState(pinValidation.state);
                const userState = normalizeState(addressData.state);
                
                if (apiState !== userState) {
                    return { 
                        success: false, 
                        error: `PIN code ${addressData.pinCode} belongs to ${pinValidation.state}, but you selected ${addressData.state}. Please verify your PIN code and state.` 
                    };
                }
                
                console.log(`✅ PIN code validated: ${addressData.pinCode} belongs to ${pinValidation.district}, ${pinValidation.state}`);
            }
        }
        
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'User not authenticated' };

        // Validate address data
        const validation = validateAddressData(addressData);
        if (!validation.isValid) {
            return { success: false, error: validation.errors.join('. ') };
        }

        try {
            const updateData = {
                ...addressData,
                updatedAt: firebase.firestore.Timestamp.now()
            };

            // If this is being set as default, unset other defaults first
            if (updateData.isDefault) {
                await unsetOtherDefaults(user.uid, addressId);
            }

            await db.collection('users').doc(user.uid).collection('addresses').doc(addressId).update(updateData);
            
            console.log('Address updated successfully:', addressId);
            return { success: true };
        } catch (error) {
            console.error('Error updating address:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete an address
     * @param {string} addressId - Address ID to delete
     * @returns {Promise<Object>} - Success status
     */
    async function deleteAddress(addressId) {
        if (!init()) return { success: false, error: 'Firebase not initialized' };
        
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'User not authenticated' };

        try {
            await db.collection('users').doc(user.uid).collection('addresses').doc(addressId).delete();
            
            console.log('Address deleted successfully:', addressId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting address:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set an address as default
     * @param {string} addressId - Address ID to set as default
     * @returns {Promise<Object>} - Success status
     */
    async function setDefaultAddress(addressId) {
        if (!init()) return { success: false, error: 'Firebase not initialized' };
        
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'User not authenticated' };

        try {
            // First unset all other defaults
            await unsetOtherDefaults(user.uid, addressId);
            
            // Then set this one as default
            await db.collection('users').doc(user.uid).collection('addresses').doc(addressId).update({
                isDefault: true,
                updatedAt: firebase.firestore.Timestamp.now()
            });
            
            console.log('Default address set:', addressId);
            return { success: true };
        } catch (error) {
            console.error('Error setting default address:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get the default address for the user
     * @returns {Promise<Object>} - Success status and default address
     */
    async function getDefaultAddress() {
        if (!init()) return { success: false, error: 'Firebase not initialized' };
        
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'User not authenticated' };

        try {
            const defaultSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('addresses')
                .where('isDefault', '==', true)
                .limit(1)
                .get();

            if (!defaultSnapshot.empty) {
                const defaultAddress = { id: defaultSnapshot.docs[0].id, ...defaultSnapshot.docs[0].data() };
                return { success: true, address: defaultAddress };
            } else {
                return { success: false, error: 'No default address found', address: null };
            }
        } catch (error) {
            console.error('Error getting default address:', error);
            return { success: false, error: error.message, address: null };
        }
    }

    /**
     * Unset default flag from all other addresses
     * @param {string} userId - User ID
     * @param {string} excludeAddressId - Address ID to exclude from update
     */
    async function unsetOtherDefaults(userId, excludeAddressId = null) {
        try {
            const addressesSnapshot = await db.collection('users')
                .doc(userId)
                .collection('addresses')
                .where('isDefault', '==', true)
                .get();

            const batch = db.batch();
            addressesSnapshot.forEach(doc => {
                if (excludeAddressId && doc.id === excludeAddressId) return;
                
                const addressRef = db.collection('users').doc(userId).collection('addresses').doc(doc.id);
                batch.update(addressRef, { 
                    isDefault: false,
                    updatedAt: firebase.firestore.Timestamp.now()
                });
            });

            if (!addressesSnapshot.empty) {
                await batch.commit();
            }
        } catch (error) {
            console.warn('Error unsetting other default addresses:', error);
        }
    }

    // Initialize when script loads
    init();

    return {
        saveAddress,
        loadUserAddresses,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        getDefaultAddress,
        validateAddressData,
        init
    };
})();
