import { useRef, useEffect, useCallback } from 'react';
import { safeDeleteMedia } from '../services/api.js';

/**
 * usePendingMedia
 *
 * Tracks R2 uploads/deletions inside an editor so the actual R2 mutations
 * happen at the *right* time relative to the user clicking Save:
 *
 *  - markUploaded(url)      → call after a successful POST /upload. The url
 *                             becomes a "pending upload": if the user never
 *                             saves (cancel / unmount with no save), it gets
 *                             cleaned up from R2.
 *  - markForDeletion(url)   → call when the user removes/replaces an existing
 *                             saved image. The url becomes a "pending delete"
 *                             that only fires once the user saves; this way,
 *                             if they cancel, the live site still works.
 *  - commit(keepUrls=[])    → call inside handleSave AFTER the settings PUT
 *                             succeeds. Deletes everything in pendingDeletes,
 *                             plus any pendingUpload that didn't end up in
 *                             keepUrls (intermediate uploads the user replaced
 *                             before saving).
 *  - discard()              → call when the user is leaving the editor without
 *                             saving (component unmount with pending state).
 *                             Deletes pendingUploads (they were never tied to
 *                             anything visible) and forgets pendingDeletes
 *                             (those originals are still referenced).
 *
 * The hook also runs discard() automatically on unmount as a safety net so
 * orphaned uploads from accidental tab close / route change get cleaned up.
 */
export function usePendingMedia(siteId) {
  const pendingUploadsRef = useRef(new Set());
  const pendingDeletesRef = useRef(new Set());
  const siteIdRef = useRef(siteId);
  siteIdRef.current = siteId;
  // After unmount, any in-flight upload that resolves and tries to call
  // markUploaded would otherwise leak its URL (the cleanup effect already ran).
  // Once unmounted, markUploaded immediately deletes the URL instead.
  const unmountedRef = useRef(false);

  const markUploaded = useCallback((url) => {
    if (!url) return;
    if (unmountedRef.current) {
      // Editor was destroyed mid-upload; immediately clean up so we don't leak.
      const id = siteIdRef.current;
      if (id) safeDeleteMedia(id, url);
      return;
    }
    pendingUploadsRef.current.add(url);
  }, []);

  const markForDeletion = useCallback((url) => {
    if (url) pendingDeletesRef.current.add(url);
  }, []);

  const commit = useCallback(async (keepUrls = []) => {
    const id = siteIdRef.current;
    const keep = new Set(keepUrls.filter(Boolean));
    // CRITICAL: filter both sets against keep — the same URL may legitimately
    // appear in pendingDeletes (e.g. user removed it then re-added it, or it's
    // still referenced by another slide). Never delete a URL that is in the
    // final saved state.
    const dedup = new Set();
    for (const u of pendingDeletesRef.current) if (!keep.has(u)) dedup.add(u);
    for (const u of pendingUploadsRef.current) if (!keep.has(u)) dedup.add(u);
    pendingUploadsRef.current = new Set();
    pendingDeletesRef.current = new Set();
    const toDelete = [...dedup];
    if (!id || toDelete.length === 0) return { ok: true, failed: [] };
    const results = await Promise.all(toDelete.map((u) => safeDeleteMedia(id, u).then((ok) => ({ u, ok }))));
    const failed = results.filter((r) => !r.ok).map((r) => r.u);
    return { ok: failed.length === 0, failed };
  }, []);

  const discard = useCallback(async () => {
    const id = siteIdRef.current;
    const toDelete = [...pendingUploadsRef.current];
    pendingUploadsRef.current = new Set();
    pendingDeletesRef.current = new Set();
    if (!id || toDelete.length === 0) return;
    await Promise.all(toDelete.map((u) => safeDeleteMedia(id, u)));
  }, []);

  // Safety net: clean up orphan uploads if the editor unmounts without an
  // explicit commit/discard (e.g. user navigates away).
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      const id = siteIdRef.current;
      const toDelete = [...pendingUploadsRef.current];
      pendingUploadsRef.current = new Set();
      if (!id || toDelete.length === 0) return;
      // Fire-and-forget; we can't await in a cleanup function.
      toDelete.forEach((u) => { safeDeleteMedia(id, u); });
    };
  }, []);

  return { markUploaded, markForDeletion, commit, discard };
}
