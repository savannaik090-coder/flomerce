/**
 * Local Address Manager
 * Manages shipping addresses in localStorage for guest users
 * Provides similar API to APIAddressManager but for local storage
 */

const LocalAddressManager = (function() {
    const STORAGE_KEY = 'guestAddresses';
    const STORAGE_VERSION = '1.0';
    
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
            errors.push('Please enter a valid email address');
        }
        
        // Phone validation (10 digits)
        const phoneRegex = /^\d{10}$/;
        if (!addressData.phone || !phoneRegex.test(addressData.phone.replace(/\D/g, ''))) {
            errors.push('Please enter a valid 10-digit phone number');
        }
        
        // PIN code validation
        const pinCodeRegex = /^\d{6}$/;
        if (!addressData.pinCode || !pinCodeRegex.test(addressData.pinCode)) {
            errors.push('Please enter a valid 6-digit PIN code');
        }
        
        // Address fields validation
        if (!addressData.houseNumber || addressData.houseNumber.trim().length < 1) {
            errors.push('House/Flat number is required');
        }
        
        if (!addressData.street || addressData.street.trim().length < 3) {
            errors.push('Street address must be at least 3 characters long');
        }
        
        if (!addressData.city || addressData.city.trim().length < 2) {
            errors.push('City is required');
        }
        
        if (!addressData.state || addressData.state.trim().length < 2) {
            errors.push('State is required');
        }
        
        if (!addressData.addressType || !['home', 'work', 'other'].includes(addressData.addressType)) {
            errors.push('Please select a valid address type');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Get all saved addresses from localStorage
     * @returns {Array} - Array of saved addresses
     */
    function getAddresses() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (data && data.version === STORAGE_VERSION && Array.isArray(data.addresses)) {
                    console.log('Loaded', data.addresses.length, 'addresses from localStorage');
                    return data.addresses;
                }
            }
        } catch (error) {
            console.error('Error loading addresses from localStorage:', error);
        }
        return [];
    }
    
    /**
     * Save addresses array to localStorage
     * @param {Array} addresses - Array of addresses to save
     * @returns {Boolean} - Success status
     */
    function saveAddressesArray(addresses) {
        try {
            const data = {
                version: STORAGE_VERSION,
                addresses: addresses,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('Saved', addresses.length, 'addresses to localStorage');
            return true;
        } catch (error) {
            console.error('Error saving addresses to localStorage:', error);
            return false;
        }
    }
    
    /**
     * Save a new address or update existing one
     * @param {Object} addressData - Address information to save
     * @returns {Object} - Result with success status and address ID
     */
    function saveAddress(addressData) {
        const validation = validateAddressData(addressData);
        if (!validation.isValid) {
            return {
                success: false,
                errors: validation.errors
            };
        }
        
        try {
            const addresses = getAddresses();
            
            // Generate unique ID if new address
            if (!addressData.id) {
                addressData.id = 'addr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                addressData.createdAt = new Date().toISOString();
            }
            
            addressData.updatedAt = new Date().toISOString();
            
            // If this is set as default, unset others
            if (addressData.isDefault) {
                addresses.forEach(addr => {
                    addr.isDefault = false;
                });
            } else if (addresses.length === 0) {
                // First address should be default
                addressData.isDefault = true;
            }
            
            // Update existing or add new
            const existingIndex = addresses.findIndex(addr => addr.id === addressData.id);
            if (existingIndex !== -1) {
                addresses[existingIndex] = addressData;
            } else {
                addresses.push(addressData);
            }
            
            saveAddressesArray(addresses);
            
            return {
                success: true,
                addressId: addressData.id,
                message: 'Address saved successfully'
            };
        } catch (error) {
            console.error('Error saving address:', error);
            return {
                success: false,
                errors: ['Failed to save address: ' + error.message]
            };
        }
    }
    
    /**
     * Delete an address
     * @param {String} addressId - ID of the address to delete
     * @returns {Object} - Result with success status
     */
    function deleteAddress(addressId) {
        try {
            let addresses = getAddresses();
            const initialLength = addresses.length;
            
            addresses = addresses.filter(addr => addr.id !== addressId);
            
            if (addresses.length === initialLength) {
                return {
                    success: false,
                    error: 'Address not found'
                };
            }
            
            // If deleted address was default and there are other addresses, make first one default
            const hasDefault = addresses.some(addr => addr.isDefault);
            if (!hasDefault && addresses.length > 0) {
                addresses[0].isDefault = true;
            }
            
            saveAddressesArray(addresses);
            
            return {
                success: true,
                message: 'Address deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting address:', error);
            return {
                success: false,
                error: 'Failed to delete address: ' + error.message
            };
        }
    }
    
    /**
     * Set an address as default
     * @param {String} addressId - ID of the address to set as default
     * @returns {Object} - Result with success status
     */
    function setDefaultAddress(addressId) {
        try {
            const addresses = getAddresses();
            let found = false;
            
            addresses.forEach(addr => {
                if (addr.id === addressId) {
                    addr.isDefault = true;
                    found = true;
                } else {
                    addr.isDefault = false;
                }
            });
            
            if (!found) {
                return {
                    success: false,
                    error: 'Address not found'
                };
            }
            
            saveAddressesArray(addresses);
            
            return {
                success: true,
                message: 'Default address updated'
            };
        } catch (error) {
            console.error('Error setting default address:', error);
            return {
                success: false,
                error: 'Failed to set default address: ' + error.message
            };
        }
    }
    
    /**
     * Get default address
     * @returns {Object|null} - Default address or null
     */
    function getDefaultAddress() {
        const addresses = getAddresses();
        return addresses.find(addr => addr.isDefault) || addresses[0] || null;
    }
    
    /**
     * Get address by ID
     * @param {String} addressId - ID of the address
     * @returns {Object|null} - Address object or null
     */
    function getAddressById(addressId) {
        const addresses = getAddresses();
        return addresses.find(addr => addr.id === addressId) || null;
    }
    
    /**
     * Clear all addresses (for testing or user request)
     * @returns {Boolean} - Success status
     */
    function clearAllAddresses() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('Cleared all guest addresses');
            return true;
        } catch (error) {
            console.error('Error clearing addresses:', error);
            return false;
        }
    }
    
    /**
     * Get count of saved addresses
     * @returns {Number} - Number of saved addresses
     */
    function getAddressCount() {
        return getAddresses().length;
    }
    
    // Public API
    return {
        getAddresses,
        saveAddress,
        deleteAddress,
        setDefaultAddress,
        getDefaultAddress,
        getAddressById,
        clearAllAddresses,
        getAddressCount,
        validateAddressData
    };
})();

// Make it available globally
window.LocalAddressManager = LocalAddressManager;

console.log('Local Address Manager loaded');
