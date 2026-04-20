let dirty = false;

export function setEditorDirty(v) {
  dirty = !!v;
}

export function isEditorDirty() {
  return dirty;
}

export function clearEditorDirty() {
  dirty = false;
}
