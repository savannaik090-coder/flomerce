import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin } from './site-admin-worker.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function handleUpload(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);
  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];

  if (action === 'image' && method === 'GET') {
    const key = url.searchParams.get('key');
    if (!key) return errorResponse('Key is required', 400);
    return serveImage(env, key);
  }

  if (action === 'image' && method === 'POST') {
    return uploadImage(request, env, url);
  }

  if (action === 'image' && method === 'DELETE') {
    return deleteImage(request, env, url);
  }

  return errorResponse('Upload endpoint not found', 404);
}

async function authenticateAdmin(request, env, siteId) {
  const authHeader = request.headers.get('Authorization');

  if (authHeader && authHeader.startsWith('SiteAdmin ') && siteId) {
    const admin = await validateSiteAdmin(request, env, siteId);
    if (admin) {
      return { id: admin.userId || 'site-admin', _adminSiteId: siteId };
    }
  }

  const user = await validateAuth(request, env);
  if (user) {
    const site = await env.DB.prepare(
      'SELECT id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();
    if (site) return { ...user, _adminSiteId: siteId };
    return null;
  }

  return null;
}

async function uploadImage(request, env, url) {
  const siteId = url.searchParams.get('siteId');
  if (!siteId) return errorResponse('siteId is required', 400);

  const user = await authenticateAdmin(request, env, siteId);
  if (!user) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const files = formData.getAll('images');

      if (!files.length) return errorResponse('No images provided', 400);

      const results = [];
      for (const file of files) {
        if (!file || !file.size) continue;

        if (!ALLOWED_TYPES.includes(file.type)) {
          results.push({ error: `Invalid file type: ${file.type}` });
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          results.push({ error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)` });
          continue;
        }

        const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
        const key = `sites/${siteId}/products/${generateId()}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        await env.STORAGE.put(key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000',
          },
        });

        const imageUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
        results.push({ url: imageUrl, key });
      }

      return successResponse({ images: results }, 'Images uploaded successfully');
    }

    const body = await request.json();
    const { imageData, fileName } = body;

    if (!imageData) return errorResponse('imageData is required', 400);

    let buffer;
    let mimeType;

    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return errorResponse('Invalid base64 image data', 400);
      mimeType = matches[1];
      const base64 = matches[2];
      const binaryString = atob(base64);
      buffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
      }
    } else {
      return errorResponse('Image data must be a base64 data URL', 400);
    }

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return errorResponse(`Invalid image type: ${mimeType}`, 400);
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return errorResponse('Image too large (max 10MB)', 400);
    }

    const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
    const key = `sites/${siteId}/products/${generateId()}.${ext}`;

    await env.STORAGE.put(key, buffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const imageUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
    return successResponse({ url: imageUrl, key }, 'Image uploaded successfully');

  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('Failed to upload image: ' + error.message, 500);
  }
}

async function serveImage(env, key) {
  try {
    const object = await env.STORAGE.get(key);
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Serve image error:', error);
    return new Response('Failed to retrieve image', { status: 500 });
  }
}

async function deleteImage(request, env, url) {
  const siteId = url.searchParams.get('siteId');
  const key = url.searchParams.get('key');

  if (!siteId) return errorResponse('siteId is required', 400);
  if (!key) return errorResponse('key is required', 400);

  const user = await authenticateAdmin(request, env, siteId);
  if (!user) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');

  if (!key.startsWith(`sites/${siteId}/`)) {
    return errorResponse('Unauthorized: cannot delete images from another site', 403);
  }

  try {
    await env.STORAGE.delete(key);
    return successResponse(null, 'Image deleted successfully');
  } catch (error) {
    console.error('Delete image error:', error);
    return errorResponse('Failed to delete image', 500);
  }
}
