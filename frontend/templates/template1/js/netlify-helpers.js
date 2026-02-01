/**
 * API Helpers
 * 
 * This file provides utility functions for working with the REST API
 * in both local development and production environments.
 */

// Determine if we're running in production or development
const isProduction = !window.location.hostname.includes('localhost') && 
                     !window.location.hostname.includes('127.0.0.1');

/**
 * Get the base URL for API requests
 * @returns {string} The base URL to use for API requests
 */
function getApiBaseUrl() {
  return '/api';
}

/**
 * Make an API request
 * 
 * @param {string} endpoint - The API endpoint (without leading slash)
 * @param {Object} options - Fetch API options (method, headers, body, etc.)
 * @returns {Promise<Object>} - Promise resolving to the JSON response
 */
async function callApiFunction(endpoint, options = {}) {
  // Ensure we have default headers
  if (!options.headers) {
    options.headers = {};
  }

  // Add Content-Type header for JSON if not specified and we have a body
  if (options.body && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }

  // Create the URL
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/${endpoint}`;

  try {
    console.log(`Calling API: ${url}`, options);

    // Add a timeout to the fetch call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Clone options and add signal
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Log response status
    console.log(`API response: ${response.status} ${response.statusText}`);

    // Try to parse the JSON response
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);

      // Special handling for 404 errors (endpoint not found)
      if (response.status === 404) {
        console.warn(`API endpoint not found: ${endpoint}`);
        return { 
          success: false, 
          message: 'Service temporarily unavailable',
          status: 404 
        };
      }

      throw new Error(`Failed to parse response from ${endpoint}: ${parseError.message}`);
    }

    // If response is not ok, throw an error
    if (!response.ok) {
      console.error('API error response:', data);
      throw new Error(data.message || data.error || `API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Error calling API ${endpoint}:`, error);
    console.error(`Request URL: ${url}`);
    console.error(`Request options:`, options);

    // Check if it's a 404 error
    if (error.message && error.message.includes('404')) {
      console.error(`API endpoint not found: ${endpoint}`);
      throw new Error(`Service temporarily unavailable`);
    }

    throw error;
  }
}

// Export the helper functions (keeping backward compatibility)
window.netlifyHelpers = {
  getApiBaseUrl,
  callNetlifyFunction: callApiFunction,
  callApiFunction,
  isProduction
};

window.apiHelpers = {
  getApiBaseUrl,
  callApiFunction,
  isProduction
};
