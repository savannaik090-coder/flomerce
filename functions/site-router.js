
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    const host = event.headers.host || '';
    const subdomain = host.split('.')[0];
    
    // In a real environment, we'd check Firestore for the subdomain mapping
    // For this MVP, we'll serve template-1 if a subdomain is present
    if (subdomain && subdomain !== 'kreavo' && subdomain !== 'localhost' && subdomain !== '127') {
        try {
            // Serve the template content dynamically
            // This is a simplified version of what a Netlify Edge function would do
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                body: `<html><body><h1>Serving site for ${subdomain}</h1><p>Template #1 loaded.</p></body></html>`
            };
        } catch (err) {
            return { statusCode: 500, body: err.toString() };
        }
    }

    return {
        statusCode: 404,
        body: 'Subdomain not found'
    };
};
