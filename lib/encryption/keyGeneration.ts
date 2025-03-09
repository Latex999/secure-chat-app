/**
 * Key generation module for end-to-end encryption
 * Uses Web Crypto API for secure key generation
 */

// Generate RSA key pair for asymmetric encryption
export const generateKeyPair = async (): Promise<{ publicKey: string; privateKey: string }> => {
  try {
    // Generate RSA key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true, // extractable
      ['encrypt', 'decrypt'] // key usage
    );

    // Export public key
    const publicKeyBuffer = await window.crypto.subtle.exportKey(
      'spki',
      keyPair.publicKey
    );
    
    // Export private key
    const privateKeyBuffer = await window.crypto.subtle.exportKey(
      'pkcs8',
      keyPair.privateKey
    );

    // Convert to base64 strings
    const publicKey = arrayBufferToBase64(publicKeyBuffer);
    const privateKey = arrayBufferToBase64(privateKeyBuffer);

    return { publicKey, privateKey };
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error('Failed to generate encryption keys');
  }
};

// Generate AES key for symmetric encryption
export const generateAESKey = async (): Promise<string> => {
  try {
    // Generate AES key
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt'] // key usage
    );

    // Export key
    const keyBuffer = await window.crypto.subtle.exportKey('raw', key);
    
    // Convert to base64 string
    return arrayBufferToBase64(keyBuffer);
  } catch (error) {
    console.error('Error generating AES key:', error);
    throw new Error('Failed to generate symmetric key');
  }
};

// Import RSA public key from base64 string
export const importRSAPublicKey = async (publicKeyBase64: string): Promise<CryptoKey> => {
  try {
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    
    return await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true, // extractable
      ['encrypt'] // key usage
    );
  } catch (error) {
    console.error('Error importing RSA public key:', error);
    throw new Error('Failed to import public key');
  }
};

// Import RSA private key from base64 string
export const importRSAPrivateKey = async (privateKeyBase64: string): Promise<CryptoKey> => {
  try {
    const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    
    return await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true, // extractable
      ['decrypt'] // key usage
    );
  } catch (error) {
    console.error('Error importing RSA private key:', error);
    throw new Error('Failed to import private key');
  }
};

// Import AES key from base64 string
export const importAESKey = async (keyBase64: string): Promise<CryptoKey> => {
  try {
    const keyBuffer = base64ToArrayBuffer(keyBase64);
    
    return await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'AES-GCM',
      },
      true, // extractable
      ['encrypt', 'decrypt'] // key usage
    );
  } catch (error) {
    console.error('Error importing AES key:', error);
    throw new Error('Failed to import symmetric key');
  }
};

// Helper function to convert ArrayBuffer to Base64 string
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Helper function to convert Base64 string to ArrayBuffer
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};