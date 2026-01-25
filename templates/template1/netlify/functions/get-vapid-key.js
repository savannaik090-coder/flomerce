/**
 * Netlify Function: get-vapid-key
 * Returns the Firebase VAPID key for client-side notification setup
 * 
 * GET /api/get-vapid-key
 */

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const vapidKey = process.env.FIREBASE_VAPID_KEY;

    if (!vapidKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'VAPID key not configured' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ vapidKey })
    };

  } catch (error) {
    console.error('Error in get-vapid-key:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve VAPID key' })
    };
  }
};
