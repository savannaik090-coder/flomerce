import { useEffect, useRef, useState } from 'react';
import { setEditorDirty } from '../admin/editorDirtyStore.js';

/**
 * Deterministic JSON.stringify that sorts keys recursively so that
 * `{a:1,b:2}` and `{b:2,a:1}` produce the same string.
 *
 * Arrays preserve their order (order is meaningful for things like the videos
 * list, dots in Shop The Look, etc.). Nested objects/arrays are walked.
 */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

/**
 * useDirtyTracker — single source of truth for editor "unsaved changes" state.
 *
 * Replaces the open-coded `hasChanges` + `serverValuesRef` + change-detection
 * `useEffect` + post-save re-snapshot pattern that lives in every section
 * editor. The win: every watched field is listed exactly once (in `values`),
 * so it is structurally impossible to forget to register a new field.
 *
 * Usage:
 *   const dirty = useDirtyTracker({ title, description, color, font });
 *
 *   // Once your async load resolves, capture the server snapshot:
 *   useEffect(() => {
 *     loadSettings().then(s => {
 *       setTitle(s.title);
 *       ...
 *       // schedule baseline AFTER state has flushed:
 *       requestAnimationFrame(() => dirty.baseline({ title: s.title, ... }));
 *     });
 *   }, []);
 *
 *   // After a successful PUT:
 *   await fetch(...);
 *   dirty.markSaved();   // re-captures the current values as the new baseline
 *
 *   // Render:
 *   <SaveBar hasChanges={dirty.hasChanges} ... />
 *
 * The hook also mirrors the dirty flag into the global `editorDirtyStore`
 * so the customizer's "discard unsaved changes?" prompt keeps working
 * without each editor wiring it up manually.
 *
 * IMPORTANT: list every field that should trigger the SaveBar exactly once
 * in the `values` object. Forgetting a field is the #1 source of save-bar
 * bugs across this codebase.
 */
export function useDirtyTracker(values, options = {}) {
  const { enabled = true } = options;
  const baselineRef = useRef(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [hasChanges, setHasChanges] = useState(false);
  const serialized = stableStringify(values);

  useEffect(() => {
    if (!enabled) return;
    if (baselineRef.current === null) return;
    const next = serialized !== baselineRef.current;
    setHasChanges(prev => (prev !== next ? next : prev));
    setEditorDirty(next);
  }, [enabled, serialized]);

  // Clear the global dirty flag on unmount so a leftover dirty editor
  // doesn't gate the next section's navigation.
  useEffect(() => () => setEditorDirty(false), []);

  function baseline(snapshot) {
    baselineRef.current = stableStringify(snapshot === undefined ? valuesRef.current : snapshot);
    setHasChanges(false);
    setEditorDirty(false);
  }

  function markSaved(snapshot) {
    baseline(snapshot);
  }

  function reset() {
    baselineRef.current = null;
    setHasChanges(false);
    setEditorDirty(false);
  }

  return { hasChanges, baseline, markSaved, reset };
}
