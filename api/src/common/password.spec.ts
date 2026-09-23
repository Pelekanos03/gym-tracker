import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the correct password', () => {
    const hash = hashPassword('correct horse battery staple');
    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const hash = hashPassword('correct horse battery staple');
    expect(verifyPassword('wrong password', hash)).toBe(false);
  });

  it('never stores the plaintext password in the hash', () => {
    const plain = 'correct horse battery staple';
    const hash = hashPassword(plain);
    expect(hash).not.toContain(plain);
  });

  it('produces a different hash each time (random salt)', () => {
    const a = hashPassword('same password');
    const b = hashPassword('same password');
    expect(a).not.toEqual(b);
  });

  it('rejects a malformed stored hash instead of throwing', () => {
    expect(verifyPassword('anything', 'not-a-real-hash')).toBe(false);
  });
});
