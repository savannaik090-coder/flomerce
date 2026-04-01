import { generateId, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { resolveSiteDBById } from '../../utils/site-db.js';
import { validateSiteAdmin } from './site-admin-worker.js';
import { estimateRowBytes, trackD1Write, trackD1Update } from '../../utils/usage-tracker.js';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function handleBlog(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const pathParts = path.split('/').filter(Boolean);
  const action = pathParts[2];
  const subAction = pathParts[3];

  if (action === 'posts' && method === 'GET' && !subAction) {
    return listPosts(request, env);
  }

  if (action === 'post' && subAction && method === 'GET') {
    return getPost(request, env, subAction);
  }

  if (action === 'admin' && method === 'GET' && !subAction) {
    return adminListPosts(request, env);
  }

  if (action === 'admin' && method === 'POST' && !subAction) {
    return createPost(request, env);
  }

  if (action === 'admin' && subAction && method === 'PUT') {
    return updatePost(request, env, subAction);
  }

  if (action === 'admin' && subAction && method === 'DELETE') {
    return deletePost(request, env, subAction);
  }

  return errorResponse('Not found', 404);
}

async function listPosts(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required', 400);

    const db = await resolveSiteDBById(env, siteId);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '12') || 12));
    const offset = (page - 1) * limit;

    const posts = await db.prepare(
      `SELECT id, title, slug, excerpt, cover_image, author, tags, published_at, created_at
       FROM blog_posts WHERE site_id = ? AND status = 'published'
       ORDER BY published_at DESC LIMIT ? OFFSET ?`
    ).bind(siteId, limit, offset).all();

    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM blog_posts WHERE site_id = ? AND status = 'published'`
    ).bind(siteId).first();

    return successResponse({
      posts: posts.results || [],
      total: countResult?.total || 0,
      page,
      totalPages: Math.ceil((countResult?.total || 0) / limit),
    });
  } catch (error) {
    if (error.message?.includes('no such table')) {
      return successResponse({ posts: [], total: 0, page: 1, totalPages: 0 });
    }
    console.error('List blog posts error:', error);
    return errorResponse('Failed to fetch blog posts', 500);
  }
}

async function getPost(request, env, slug) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required', 400);

    const db = await resolveSiteDBById(env, siteId);
    const post = await db.prepare(
      `SELECT id, title, slug, content, excerpt, cover_image, author, tags,
              meta_title, meta_description, published_at, created_at, updated_at
       FROM blog_posts WHERE site_id = ? AND slug = ? AND status = 'published'`
    ).bind(siteId, slug).first();

    if (!post) return errorResponse('Blog post not found', 404);

    return successResponse(post);
  } catch (error) {
    if (error.message?.includes('no such table')) {
      return errorResponse('Blog post not found', 404);
    }
    console.error('Get blog post error:', error);
    return errorResponse('Failed to fetch blog post', 500);
  }
}

async function adminListPosts(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required', 400);

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    if (!admin.isOwner && admin.permissions && !admin.permissions.includes('website')) {
      return errorResponse('Permission denied', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    const posts = await db.prepare(
      `SELECT id, title, slug, excerpt, cover_image, status, author, tags, published_at, created_at, updated_at
       FROM blog_posts WHERE site_id = ? ORDER BY created_at DESC`
    ).bind(siteId).all();

    return successResponse(posts.results || []);
  } catch (error) {
    if (error.message?.includes('no such table')) {
      return successResponse([]);
    }
    console.error('Admin list blog posts error:', error);
    return errorResponse('Failed to fetch blog posts', 500);
  }
}

async function createPost(request, env) {
  try {
    const body = await request.json();
    const { siteId, title, content, excerpt, coverImage, status, author, tags, metaTitle, metaDescription } = body;

    if (!siteId) return errorResponse('siteId is required', 400);
    if (!title || !title.trim()) return errorResponse('Title is required', 400);

    const validStatuses = ['draft', 'published'];
    const postStatus = validStatuses.includes(status) ? status : 'draft';

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    if (!admin.isOwner && admin.permissions && !admin.permissions.includes('website')) {
      return errorResponse('Permission denied', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    const id = generateId();
    let slug = slugify(title);

    const existing = await db.prepare(
      'SELECT id FROM blog_posts WHERE site_id = ? AND slug = ?'
    ).bind(siteId, slug).first();

    if (existing) {
      slug = slug + '-' + Date.now().toString(36);
    }

    const publishedAt = postStatus === 'published' ? new Date().toISOString() : null;
    const tagsJson = JSON.stringify(tags || []);

    await db.prepare(
      `INSERT INTO blog_posts (id, site_id, title, slug, content, excerpt, cover_image, status, author, tags, meta_title, meta_description, published_at, row_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(
      id, siteId, title.trim(), slug, content || '', excerpt || '',
      coverImage || '', postStatus, author || '',
      tagsJson, metaTitle || '', metaDescription || '', publishedAt
    ).run();

    const rowData = { id, site_id: siteId, title, slug, content: content || '', excerpt: excerpt || '', cover_image: coverImage || '', status: postStatus, author: author || '', tags: tagsJson, meta_title: metaTitle || '', meta_description: metaDescription || '' };
    const rowBytes = estimateRowBytes(rowData);
    try {
      await db.prepare('UPDATE blog_posts SET row_size_bytes = ? WHERE id = ?').bind(rowBytes, id).run();
      await trackD1Write(env, siteId, rowBytes);
    } catch (e) {}

    return successResponse({ id, slug }, 'Blog post created');
  } catch (error) {
    console.error('Create blog post error:', error);
    return errorResponse('Failed to create blog post', 500);
  }
}

async function updatePost(request, env, postId) {
  try {
    const body = await request.json();
    const { siteId, title, content, excerpt, coverImage, status, author, tags, metaTitle, metaDescription, slug: newSlug } = body;

    if (!siteId) return errorResponse('siteId is required', 400);

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    if (!admin.isOwner && admin.permissions && !admin.permissions.includes('website')) {
      return errorResponse('Permission denied', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    const existing = await db.prepare(
      'SELECT id, status, published_at, row_size_bytes FROM blog_posts WHERE id = ? AND site_id = ?'
    ).bind(postId, siteId).first();

    if (!existing) return errorResponse('Blog post not found', 404);

    const setClauses = [];
    const values = [];

    if (title !== undefined) { setClauses.push('title = ?'); values.push(title.trim()); }
    if (content !== undefined) { setClauses.push('content = ?'); values.push(content); }
    if (excerpt !== undefined) { setClauses.push('excerpt = ?'); values.push(excerpt); }
    if (coverImage !== undefined) { setClauses.push('cover_image = ?'); values.push(coverImage); }
    if (author !== undefined) { setClauses.push('author = ?'); values.push(author); }
    if (tags !== undefined) { setClauses.push('tags = ?'); values.push(JSON.stringify(tags)); }
    if (metaTitle !== undefined) { setClauses.push('meta_title = ?'); values.push(metaTitle); }
    if (metaDescription !== undefined) { setClauses.push('meta_description = ?'); values.push(metaDescription); }

    if (newSlug !== undefined) {
      const slugToUse = slugify(newSlug);
      const slugConflict = await db.prepare(
        'SELECT id FROM blog_posts WHERE site_id = ? AND slug = ? AND id != ?'
      ).bind(siteId, slugToUse, postId).first();
      if (slugConflict) return errorResponse('A post with this URL slug already exists', 400);
      setClauses.push('slug = ?');
      values.push(slugToUse);
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'published'];
      if (!validStatuses.includes(status)) return errorResponse('Invalid status', 400);
      setClauses.push('status = ?');
      values.push(status);
      if (status === 'published' && !existing.published_at) {
        setClauses.push('published_at = ?');
        values.push(new Date().toISOString());
      }
    }

    if (setClauses.length === 0) return errorResponse('No fields to update', 400);

    setClauses.push("updated_at = datetime('now')");
    values.push(postId, siteId);

    const oldBytes = existing.row_size_bytes || 0;

    await db.prepare(
      `UPDATE blog_posts SET ${setClauses.join(', ')} WHERE id = ? AND site_id = ?`
    ).bind(...values).run();

    try {
      const updatedRow = await db.prepare('SELECT * FROM blog_posts WHERE id = ?').bind(postId).first();
      const newBytes = updatedRow ? estimateRowBytes(updatedRow) : oldBytes;
      await db.prepare('UPDATE blog_posts SET row_size_bytes = ? WHERE id = ?').bind(newBytes, postId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    } catch (e) {}

    return successResponse({ id: postId }, 'Blog post updated');
  } catch (error) {
    console.error('Update blog post error:', error);
    return errorResponse('Failed to update blog post', 500);
  }
}

async function deletePost(request, env, postId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return errorResponse('siteId is required', 400);

    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin) return errorResponse('Unauthorized', 401);

    if (!admin.isOwner && admin.permissions && !admin.permissions.includes('website')) {
      return errorResponse('Permission denied', 403);
    }

    const db = await resolveSiteDBById(env, siteId);
    await db.prepare(
      'DELETE FROM blog_posts WHERE id = ? AND site_id = ?'
    ).bind(postId, siteId).run();

    return successResponse(null, 'Blog post deleted');
  } catch (error) {
    console.error('Delete blog post error:', error);
    return errorResponse('Failed to delete blog post', 500);
  }
}
