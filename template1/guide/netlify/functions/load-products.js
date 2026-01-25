/**
 * Netlify Function: Load Products (Generic)
 * 
 * Loads products from Firebase Storage using direct CDN URLs for optimal caching
 * Handles GET requests to /.netlify/functions/load-products?category=CATEGORY
 * 
 * Uses direct Firebase Storage URLs with alt=media to ensure proper CDN caching,
 * avoiding the bandwidth consumption issues that occur with signed URLs or Admin SDK downloads.
 */

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Method not allowed'
      })
    };
  }

  // Get category from query parameters - declare outside try block for catch access
  const category = event.queryStringParameters?.category;
  const categories = event.queryStringParameters?.categories;

  try {
    const cacheBust = event.queryStringParameters?.cacheBust;
    const ifNoneMatch = event.headers['if-none-match'];

    if (!category && !categories) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          products: [],
          error: 'Category parameter is required',
          message: 'Please provide a category parameter: ?category=featured-collection or ?categories=cat1,cat2,cat3'
        })
      };
    }

    const isCacheBust = !!cacheBust;

    if (categories) {
      const categoryList = categories.split(',').map(c => c.trim()).filter(c => c);
      console.log(`Loading products from multiple categories: ${categoryList.join(', ')}`);

      if (isCacheBust) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }

      const fetchOptions = isCacheBust ? {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Cache-Bust': `${Date.now()}`
        }
      } : {};

      const productPromises = categoryList.map(async (cat) => {
        const isBandwidthTest = cat.startsWith('bandwidth-test-');
        let storageUrl;
        
        if (isBandwidthTest) {
          storageUrl = `https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/bandwidthTest%2F${cat}-products.json?alt=media`;
        } else {
          storageUrl = `https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/productData%2F${cat}-products.json?alt=media`;
        }

        if (isCacheBust) {
          storageUrl += `&fbCacheBust=${cacheBust}`;
        }

        try {
          const response = await fetch(storageUrl, fetchOptions);
          if (!response.ok) {
            console.log(`Category ${cat} not found or error: ${response.status}`);
            return [];
          }
          const categoryProducts = await response.json();
          return Array.isArray(categoryProducts) ? categoryProducts : [];
        } catch (error) {
          console.error(`Error fetching category ${cat}:`, error);
          return [];
        }
      });

      const productsArrays = await Promise.all(productPromises);
      const allProducts = productsArrays.flat();

      const sortedCategories = categoryList.sort().join(',');
      const compositeETag = require('crypto')
        .createHash('md5')
        .update(sortedCategories + JSON.stringify(allProducts))
        .digest('hex');
      const formattedETag = `"${compositeETag}"`;

      if (!isCacheBust && ifNoneMatch === formattedETag) {
        console.log('Client has current version (composite ETag match), returning 304');
        return {
          statusCode: 304,
          headers: {
            ...headers,
            'ETag': formattedETag,
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=31536000'
          }
        };
      }

      console.log(`Successfully loaded ${allProducts.length} products from ${categoryList.length} categories`);

      const responseHeaders = {
        ...headers
      };

      if (isCacheBust) {
        responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        responseHeaders['Pragma'] = 'no-cache';
        responseHeaders['Expires'] = '0';
      } else {
        responseHeaders['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=31536000, stale-if-error=31536000, immutable';
        responseHeaders['Netlify-CDN-Cache-Control'] = 'public, max-age=31536000, durable, stale-while-revalidate=31536000';
        responseHeaders['ETag'] = formattedETag;
      }

      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify({
          success: true,
          products: allProducts,
          message: `Loaded ${allProducts.length} products from ${categoryList.length} categories`
        })
      };
    }

    if (isCacheBust) {
      console.log(`Loading ${category} products with cache busting (${cacheBust}) for admin panel...`);
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    } else {
      console.log(`Loading ${category} products from Cloud Storage...`);
    }

    const isBandwidthTest = category.startsWith('bandwidth-test-');
    let storageUrl;
    
    if (isBandwidthTest) {
      storageUrl = `https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/bandwidthTest%2F${category}-products.json?alt=media`;
    } else {
      storageUrl = `https://firebasestorage.googleapis.com/v0/b/auric-a0c92.firebasestorage.app/o/productData%2F${category}-products.json?alt=media`;
    }
    
    if (isCacheBust) {
      storageUrl += `&fbCacheBust=${cacheBust}`;
      console.log(`Fetching with cache busting from Firebase Storage: ${storageUrl}`);
    } else {
      console.log(`Fetching from Firebase Storage CDN: ${storageUrl}`);
    }

    const fetchOptions = isCacheBust ? {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Cache-Bust': `${Date.now()}`
      }
    } : {};
    
    const response = await fetch(storageUrl, fetchOptions);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No ${category} products file found in Firebase Storage`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            products: [],
            message: `No ${category} products found - add some through the admin panel`
          })
        };
      }
      throw new Error(`Failed to fetch from Firebase Storage: ${response.status}`);
    }

    const products = await response.json();

    const cacheControl = response.headers.get('cache-control') || response.headers.get('Cache-Control');
    const etag = response.headers.get('etag') || response.headers.get('ETag');

    console.log(`Cache-Control: ${cacheControl}, ETag: ${etag}`);

    // Check if client has the same version (304 Not Modified)
    if (!isCacheBust && etag && ifNoneMatch === etag) {
      console.log(`Client has current version (ETag match), returning 304 Not Modified`);
      return {
        statusCode: 304,
        headers: {
          ...headers,
          'ETag': etag,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=31536000'
        }
      };
    }

    console.log(`Successfully loaded ${products.length} ${category} products from Firebase Storage CDN`);

    // Set proper CDN cache headers for Netlify CDN caching
    const responseHeaders = {
      ...headers
    };

    // For cache-busting requests, prevent all caching
    if (isCacheBust) {
      responseHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      responseHeaders['Pragma'] = 'no-cache';
      responseHeaders['Expires'] = '0';
    } else {
      // For normal requests, use shorter cache to catch product updates faster
      // This ensures new products appear within 1 hour instead of 24 hours
      responseHeaders['Cache-Control'] = 'public, max-age=3600, stale-while-revalidate=86400'; // 1 hour cache, 1 day stale
      responseHeaders['Netlify-CDN-Cache-Control'] = 'public, max-age=3600, durable, stale-while-revalidate=86400'; // Netlify CDN specific
      
      // Generate consistent ETag based on product data to ensure proper cache validation
      if (etag) {
        responseHeaders['ETag'] = etag;
        console.log(`Using original Firebase ETag: ${etag}`);
      } else {
        // Generate fallback ETag from products hash if Firebase doesn't provide one
        const productHash = require('crypto').createHash('md5').update(JSON.stringify(products)).digest('hex');
        responseHeaders['ETag'] = `"${productHash}"`;
        console.log(`Generated fallback ETag: ${responseHeaders['ETag']}`);
      }
    }

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        success: true,
        products: Array.isArray(products) ? products : [],
        message: `Loaded ${products.length} ${category || 'unknown'} products from Firebase Storage CDN`
      })
    };

  } catch (error) {
    console.error(`Error loading ${category || 'unknown'} products:`, error);

    // Return proper error response without fallback products
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        products: [],
        error: `Failed to load products: ${error.message}`,
        message: 'Please check Firebase configuration and try again'
      })
    };
  }
};