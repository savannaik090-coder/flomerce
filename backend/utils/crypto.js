const VERSION_BYTE = 0x01;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

let cachedKeyPromise = null;
let cachedKeySource = null;

function base64Encode(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64Decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function loadKey(env) {
  const raw = env?.SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('SETTINGS_ENCRYPTION_KEY is not configured');
  }
  if (cachedKeyPromise && cachedKeySource === raw) return cachedKeyPromise;

  cachedKeySource = raw;
  cachedKeyPromise = (async () => {
    let keyBytes;
    try {
      keyBytes = base64Decode(raw.trim());
    } catch (e) {
      throw new Error('SETTINGS_ENCRYPTION_KEY must be base64-encoded');
    }
    if (keyBytes.length !== KEY_LENGTH) {
      throw new Error(`SETTINGS_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes (got ${keyBytes.length})`);
    }
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  })();
  return cachedKeyPromise;
}

export async function encryptSecret(env, plaintext) {
  if (plaintext == null || plaintext === '') return '';
  const key = await loadKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder().encode(String(plaintext));
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const cipher = new Uint8Array(cipherBuf);
  const out = new Uint8Array(1 + IV_LENGTH + cipher.length);
  out[0] = VERSION_BYTE;
  out.set(iv, 1);
  out.set(cipher, 1 + IV_LENGTH);
  return base64Encode(out);
}

export async function decryptSecret(env, ciphertext) {
  if (!ciphertext) return '';
  const key = await loadKey(env);
  const bytes = base64Decode(ciphertext);
  if (bytes.length < 1 + IV_LENGTH + 16) {
    throw new Error('Ciphertext too short');
  }
  if (bytes[0] !== VERSION_BYTE) {
    throw new Error(`Unsupported ciphertext version ${bytes[0]}`);
  }
  const iv = bytes.slice(1, 1 + IV_LENGTH);
  const cipher = bytes.slice(1 + IV_LENGTH);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plainBuf);
}

export function maskSecret(plaintext, visibleChars = 4) {
  if (!plaintext) return '';
  const s = String(plaintext);
  const tail = s.length <= visibleChars ? s : s.slice(-visibleChars);
  return '••••••••••' + tail;
}
