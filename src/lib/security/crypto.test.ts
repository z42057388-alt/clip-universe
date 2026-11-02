// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateCode, validCode, digest, encryptCode, decryptCode } from '../../../supabase/functions/account-security/crypto';
describe('permanent account security codes',()=>{
 it('generates lengths 20–40 inclusive and all required character families',()=>{
  const lengths=new Set<number>();
  for(let i=0;i<1000;i++){const code=generateCode();expect(code.length).toBeGreaterThanOrEqual(20);expect(code.length).toBeLessThanOrEqual(40);expect(code).toMatch(/[A-Z]/);expect(code).toMatch(/[a-z]/);expect(code).toMatch(/[0-9]/);expect(code).toMatch(/[^A-Za-z0-9]/);lengths.add(code.length);}
  expect(lengths.has(20)).toBe(true);expect(lengths.has(40)).toBe(true);
 });
 it('does not repeat in a generated sample',()=>{const codes=Array.from({length:1000},generateCode);expect(new Set(codes).size).toBe(1000);});
 it('preserves case and every symbol when hashing',async()=>{
  const secret='test-only-cryptographic-key';const value='Abc123!@#xyzXYZ4567890';
  expect(await digest(value,secret)).not.toBe(await digest(value.toLowerCase(),secret));
  expect(await digest(value,secret)).not.toBe(await digest(value+' ',secret));
  expect(await digest(value,secret)).not.toBe(await digest(value.replace('!','?'),secret));
 });
 it('rejects lengths outside 20–40 and whitespace',()=>{expect(validCode('A'.repeat(19))).toBe(false);expect(validCode('A'.repeat(41))).toBe(false);expect(validCode('A'.repeat(20)+' ')).toBe(false);expect(validCode('A'.repeat(20))).toBe(true);expect(validCode('A'.repeat(40))).toBe(true);});
 it('encrypts without plaintext, decrypts for owner and refuses another account',async()=>{
  const code=generateCode(),secret='test-encryption-key';const encrypted=await encryptCode(code,secret,'owner');
  expect(encrypted).not.toContain(code);expect(await decryptCode(encrypted,secret,'owner')).toBe(code);
  await expect(decryptCode(encrypted,secret,'other-user')).rejects.toThrow();
 });
 it('refuses ciphertext corruption',async()=>{const encrypted=await encryptCode(generateCode(),'test-key','owner');const [iv,cipher]=encrypted.split('.');await expect(decryptCode(`${iv}.${cipher[0]==='A'?'B':'A'}${cipher.slice(1)}`,'test-key','owner')).rejects.toThrow();});
});
