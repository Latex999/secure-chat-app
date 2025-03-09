/**
 * Message encryption module for end-to-end encryption
 * 
 * Flow:
 * 1. For each conversation, generate a symmetric AES key
 * 2. Encrypt the AES key with the recipient's public RSA key
 * 3. Encrypt messages using the AES key
 * 4. Store the encrypted AES key with the conversation
 * 5. For each message, use the AES key to encrypt/decrypt
 */

import { 
  importRSAPublicKey, 
  importRSAPrivateKey, 
  importAESKey, 
  generateAESKey,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from './keyGeneration';

// Encrypt a message with AES-GCM
export const encryptMessage = async (
  plaintext: string,
  symmetricKeyBase64: string
): Promise<{ ciphertext: string; iv: string }> => {
  try {
    // Import the AES key
    const key = await importAESKey(symmetricKeyBase64);
    
    // Generate a random IV (Initialization Vector)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Convert plaintext to ArrayBuffer
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(plaintext);
    
    // Encrypt the message
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      plaintextBuffer
    );
    
    // Convert to base64 strings
    const ciphertext = arrayBufferToBase64(ciphertextBuffer);
    const ivBase64 = arrayBufferToBase64(iv);
    
    return { ciphertext, iv: ivBase64 };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message');
  }
};

// Decrypt a message with AES-GCM
export const decryptMessage = async (
  ciphertext: string,
  iv: string,
  symmetricKeyBase64: string
): Promise<string> => {
  try {
    // Import the AES key
    const key = await importAESKey(symmetricKeyBase64);
    
    // Convert base64 strings to ArrayBuffers
    const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
    const ivBuffer = base64ToArrayBuffer(iv);
    
    // Decrypt the message
    const plaintextBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      ciphertextBuffer
    );
    
    // Convert ArrayBuffer to string
    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuffer);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw new Error('Failed to decrypt message');
  }
};

// Encrypt a symmetric key with RSA-OAEP (for key exchange)
export const encryptSymmetricKey = async (
  symmetricKeyBase64: string,
  publicKeyBase64: string
): Promise<string> => {
  try {
    // Import the RSA public key
    const publicKey = await importRSAPublicKey(publicKeyBase64);
    
    // Convert symmetric key to ArrayBuffer
    const symmetricKeyBuffer = base64ToArrayBuffer(symmetricKeyBase64);
    
    // Encrypt the symmetric key
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      symmetricKeyBuffer
    );
    
    // Convert to base64 string
    return arrayBufferToBase64(encryptedKeyBuffer);
  } catch (error) {
    console.error('Error encrypting symmetric key:', error);
    throw new Error('Failed to encrypt key');
  }
};

// Decrypt a symmetric key with RSA-OAEP
export const decryptSymmetricKey = async (
  encryptedKeyBase64: string,
  privateKeyBase64: string
): Promise<string> => {
  try {
    // Import the RSA private key
    const privateKey = await importRSAPrivateKey(privateKeyBase64);
    
    // Convert encrypted key to ArrayBuffer
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64);
    
    // Decrypt the symmetric key
    const symmetricKeyBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedKeyBuffer
    );
    
    // Convert to base64 string
    return arrayBufferToBase64(symmetricKeyBuffer);
  } catch (error) {
    console.error('Error decrypting symmetric key:', error);
    throw new Error('Failed to decrypt key');
  }
};

// Setup a new conversation with a symmetric key
export const setupConversationEncryption = async (
  recipientPublicKeyBase64: string
): Promise<{ 
  conversationKey: string; 
  encryptedConversationKey: string;
}> => {
  try {
    // Generate a new AES key for the conversation
    const conversationKey = await generateAESKey();
    
    // Encrypt the conversation key with recipient's public key
    const encryptedConversationKey = await encryptSymmetricKey(
      conversationKey,
      recipientPublicKeyBase64
    );
    
    return { conversationKey, encryptedConversationKey };
  } catch (error) {
    console.error('Error setting up conversation encryption:', error);
    throw new Error('Failed to setup secure conversation');
  }
};