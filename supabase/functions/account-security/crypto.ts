const GROUPS = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz','0123456789','!@#$%^&*()-_=+[]{}:,.?'];
const ALPHABET = GROUPS.join('');
export function randomInt(max: number): number {
  const bytes = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
  return bytes[0] % max;
}
export function generateCode(): string {
  const length = 20 + randomInt(21);
  const chars = GROUPS.map(g => g[randomInt(g.length)]);
  while (chars.length < length) chars.push(ALPHABET[randomInt(ALPHABET.length)]);
  for (let i=chars.length-1;i>0;i--) { const j=randomInt(i+1); [chars[i],chars[j]]=[chars[j],chars[i]]; }
  return chars.join('');
}
export function validCode(code: unknown): code is string {
  return typeof code==='string' && code.length>=20 && code.length<=40 && [...code].every(c=>ALPHABET.includes(c));
}
const enc = new TextEncoder();
export async function digest(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function encryptionKey(secret: string) {
  return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(`encryption:${secret}`)),'AES-GCM',false,['encrypt','decrypt']);
}
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const from64 = (value: string) => Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export async function encryptCode(code: string, secret: string, userId: string): Promise<string> {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(userId)},await encryptionKey(secret),enc.encode(code));
  return `${b64(iv)}.${b64(new Uint8Array(cipher))}`;
}
export async function decryptCode(value: string, secret: string, userId: string): Promise<string> {
  const [iv,cipher]=value.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(iv),additionalData:enc.encode(userId)},await encryptionKey(secret),from64(cipher)));
}
