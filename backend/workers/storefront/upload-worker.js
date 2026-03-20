import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { validateAuth } from '../../utils/auth.js';
import { validateSiteAdmin } from './site-admin-worker.js';
import { recordMediaFile, removeMediaFile, checkUsageLimit } from '../../utils/usage-tracker.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/svg+xml': 'svg',
};

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

  if (action === 'return-photo' && method === 'POST') {
    return uploadReturnPhoto(request, env, url);
  }

  if (action === 'image' && method === 'DELETE') {
    return deleteImage(request, env, url);
  }

  if (action === 'video' && method === 'GET') {
    const key = url.searchParams.get('key');
    if (!key) return errorResponse('Key is required', 400);
    return serveVideo(env, key);
  }

  if (action === 'video' && method === 'POST') {
    return uploadVideo(request, env, url);
  }

  if (action === 'video' && method === 'DELETE') {
    return deleteVideo(request, env, url);
  }

  return errorResponse('Upload endpoint not found', 404);
}

async function authenticateAdmin(request, env, siteId) {
  const authHeader = request.headers.get('Authorization');

  if (authHeader && authHeader.startsWith('SiteAdmin ') && siteId) {
    const admin = await validateSiteAdmin(request, env, siteId);
    if (admin) {
      return { id: admin.staffId || 'site-admin', _adminSiteId: siteId, _adminPermissions: admin };
    }
  }

  const user = await validateAuth(request, env);
  if (user) {
    const site = await env.DB.prepare(
      'SELECT id FROM sites WHERE id = ? AND user_id = ?'
    ).bind(siteId, user.id).first();
    if (site) return { ...user, _adminSiteId: siteId, _adminPermissions: { isOwner: true } };
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

        const usageCheck = await checkUsageLimit(env, siteId, 'r2', file.size);
        if (!usageCheck.allowed) {
          results.push({ error: usageCheck.reason });
          continue;
        }

        const ext = MIME_TO_EXT[file.type] || file.type.split('/')[1];
        const key = `sites/${siteId}/images/${generateId()}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        await env.STORAGE.put(key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000',
          },
        });

        await recordMediaFile(env, siteId, key, file.size, 'image');

        const imageUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
        results.push({ url: imageUrl, key });
      }

      const urls = results.filter(r => r.url).map(r => r.url);
      return successResponse({ images: results, urls }, 'Images uploaded successfully');
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

    const usageCheck = await checkUsageLimit(env, siteId, 'r2', buffer.length);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    const ext = MIME_TO_EXT[mimeType] || mimeType.split('/')[1];
    const key = `sites/${siteId}/images/${generateId()}.${ext}`;

    await env.STORAGE.put(key, buffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    await recordMediaFile(env, siteId, key, buffer.length, 'image');

    const imageUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
    return successResponse({ url: imageUrl, key }, 'Image uploaded successfully');

  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('Failed to upload image: ' + error.message, 500);
  }
}

const RETURN_PHOTO_MAX_SIZE = 5 * 1024 * 1024;
const RETURN_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function uploadReturnPhoto(request, env, url) {
  const siteId = url.searchParams.get('siteId');
  if (!siteId) return errorResponse('siteId is required', 400);

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('multipart/form-data required', 400);
    }

    const formData = await request.formData();
    const file = formData.get('photo');
    if (!file || !file.size) return errorResponse('No photo provided', 400);

    if (!RETURN_PHOTO_TYPES.includes(file.type)) {
      return errorResponse(`Invalid file type: ${file.type}. Only JPEG, PNG, and WebP allowed.`, 400);
    }

    if (file.size > RETURN_PHOTO_MAX_SIZE) {
      return errorResponse(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 5MB)`, 400);
    }

    const usageCheck = await checkUsageLimit(env, siteId, 'r2', file.size);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    const ext = MIME_TO_EXT[file.type] || 'jpg';
    const key = `sites/${siteId}/returns/${generateId()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    await env.STORAGE.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
    });

    await recordMediaFile(env, siteId, key, file.size, 'image');

    const imageUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
    return successResponse({ url: imageUrl, key }, 'Return photo uploaded');
  } catch (error) {
    console.error('Return photo upload error:', error);
    return errorResponse('Failed to upload photo: ' + error.message, 500);
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
    await removeMediaFile(env, siteId, key);
    return successResponse(null, 'Image deleted successfully');
  } catch (error) {
    console.error('Delete image error:', error);
    return errorResponse('Failed to delete image', 500);
  }
}

async function uploadVideo(request, env, url) {
  const siteId = url.searchParams.get('siteId');
  if (!siteId) return errorResponse('siteId is required', 400);

  const user = await authenticateAdmin(request, env, siteId);
  if (!user) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('video');

      if (!file || !file.size) return errorResponse('No video provided', 400);

      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return errorResponse(`Invalid video type: ${file.type}. Allowed: MP4, WebM, MOV`, 400);
      }

      if (file.size > MAX_VIDEO_SIZE) {
        return errorResponse(`Video too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 100MB)`, 400);
      }

      const usageCheck = await checkUsageLimit(env, siteId, 'r2', file.size);
      if (!usageCheck.allowed) {
        return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
      }

      const ext = file.type === 'video/quicktime' ? 'mov' : file.type.split('/')[1];
      const key = `sites/${siteId}/videos/${generateId()}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      await env.STORAGE.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000',
        },
      });

      await recordMediaFile(env, siteId, key, file.size, 'video');

      const videoUrl = `/api/upload/video?key=${encodeURIComponent(key)}`;
      return successResponse({ url: videoUrl, key }, 'Video uploaded successfully');
    }

    return errorResponse('Video upload requires multipart/form-data', 400);
  } catch (error) {
    console.error('Video upload error:', error);
    return errorResponse('Failed to upload video: ' + error.message, 500);
  }
}

async function serveVideo(env, key) {
  try {
    const object = await env.STORAGE.get(key);
    if (!object) {
      return new Response('Video not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'video/mp4');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Serve video error:', error);
    return new Response('Failed to retrieve video', { status: 500 });
  }
}

async function deleteVideo(request, env, url) {
  const siteId = url.searchParams.get('siteId');
  const key = url.searchParams.get('key');

  if (!siteId) return errorResponse('siteId is required', 400);
  if (!key) return errorResponse('key is required', 400);

  const user = await authenticateAdmin(request, env, siteId);
  if (!user) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');

  if (!key.startsWith(`sites/${siteId}/`)) {
    return errorResponse('Unauthorized: cannot delete videos from another site', 403);
  }

  try {
    await env.STORAGE.delete(key);
    await removeMediaFile(env, siteId, key);
    return successResponse(null, 'Video deleted successfully');
  } catch (error) {
    console.error('Delete video error:', error);
    return errorResponse('Failed to delete video', 500);
  }
}
