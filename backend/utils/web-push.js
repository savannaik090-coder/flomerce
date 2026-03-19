function derToRaw(derSig) {
  if (derSig[0] !== 0x30) return derSig;
  let offset = 2;
  if (derSig[1] & 0x80) offset += (derSig[1] & 0x7f);

  function readInt(pos) {
    if (derSig[pos] !== 0x02) return { val: new Uint8Array(32), next: pos };
    const len = derSig[pos + 1];
    let start = pos + 2;
    let intBytes = derSig.slice(start, start + len);
    while (intBytes.length < 32) intBytes = concat(new Uint8Array([0]), intBytes);
    if (intBytes.length > 32) intBytes = intBytes.slice(intBytes.length - 32);
    return { val: intBytes, next: start + len };
  }

  const r = readInt(offset);
  const s = readInt(r.next);
  return concat(r.val, s.val);
}

function base64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Uint8Array.from(atob(b64 + pad), c => c.charCodeAt(0));
}

function base64urlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function concat(...arrays) {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

async function hmacSha256(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return new Uint8Array(sig);
}

async function hkdfExtract(salt, ikm) {
  return hmacSha256(salt, ikm);
}

async function hkdfExpand(prk, info, length) {
  const infoBytes = typeof info === 'string' ? new TextEncoder().encode(info) : info;
  const t = new Uint8Array(0);
  let okm = new Uint8Array(0);
  let prev = t;
  let counter = 1;
  while (okm.length < length) {
    const input = concat(prev, infoBytes, new Uint8Array([counter++]));
    prev = await hmacSha256(prk, input);
    okm = concat(okm, prev);
  }
  return okm.slice(0, length);
}

async function encryptPayload(plaintext, p256dhBase64, authBase64) {
  const receiverPublicKeyRaw = base64urlDecode(p256dhBase64);
  const authSecret = base64urlDecode(authBase64);

  const receiverPublicKey = await crypto.subtle.importKey(
    'raw', receiverPublicKeyRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  const senderKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, ['deriveBits']
  );

  const senderPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeyPair.publicKey));

  const ecdhSharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPublicKey },
    senderKeyPair.privateKey,
    256
  );
  const ecdhShared = new Uint8Array(ecdhSharedBits);

  const enc = new TextEncoder();

  const keyInfo = concat(
    enc.encode('WebPush: info\x00'),
    receiverPublicKeyRaw,
    senderPublicKeyRaw
  );

  const prkKey = await hkdfExtract(authSecret, ecdhShared);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prk = await hkdfExtract(salt, ikm);

  const cekInfo = enc.encode('Content-Encoding: aes128gcm\x00');
  const nonceInfo = enc.encode('Content-Encoding: nonce\x00');

  const cek = await hkdfExpand(prk, cekInfo, 16);
  const nonce = await hkdfExpand(prk, nonceInfo, 12);

  const plaintextBytes = typeof plaintext === 'string' ? enc.encode(plaintext) : plaintext;
  const paddedPlaintext = concat(plaintextBytes, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPlaintext
  );

  const recordSize = new DataView(new ArrayBuffer(4));
  recordSize.setUint32(0, 4096, false);

  const header = concat(
    salt,
    new Uint8Array(recordSize.buffer),
    new Uint8Array([senderPublicKeyRaw.length]),
    senderPublicKeyRaw
  );

  return concat(header, new Uint8Array(ciphertext));
}

async function buildVapidHeaders(endpoint, subject, publicKeyBase64, privateKeyJWK) {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 3600;

  const enc = new TextEncoder();

  const headerObj = { typ: 'JWT', alg: 'ES256' };
  const payloadObj = { aud: audience, exp: expiration, sub: subject };

  const headerB64 = base64urlEncode(enc.encode(JSON.stringify(headerObj)));
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(payloadObj)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const jwk = typeof privateKeyJWK === 'string' ? JSON.parse(privateKeyJWK) : privateKeyJWK;
  const privateKey = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const rawSignature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    enc.encode(signingInput)
  );

  const sigBytes = new Uint8Array(rawSignature);
  const finalSig = sigBytes.length !== 64 ? derToRaw(sigBytes) : sigBytes;

  const jwt = `${signingInput}.${base64urlEncode(finalSig)}`;

  return {
    Authorization: `vapid t=${jwt},k=${publicKeyBase64}`,
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: '86400',
  };
}

export async function sendWebPush(subscription, payload, vapidPublicKey, vapidPrivateKeyJWK, vapidSubject) {
  const { endpoint, p256dh, auth } = subscription;

  const payloadStr = typeof payload === 'object' ? JSON.stringify(payload) : payload;
  const encryptedBody = await encryptPayload(payloadStr, p256dh, auth);

  const vapidHeaders = await buildVapidHeaders(endpoint, vapidSubject, vapidPublicKey, vapidPrivateKeyJWK);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: vapidHeaders,
    body: encryptedBody,
  });

  return response;
}
