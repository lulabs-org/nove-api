import { createHash, createHmac, createDecipheriv } from 'node:crypto';
import {
  WebhookSignatureVerificationException,
  WebhookUrlVerificationException,
} from '../exceptions';

/**
 * Verifies the signature for Tencent Meeting webhook requests
 *
 * This function implements the signature verification algorithm specified in
 * Tencent Meeting documentation:
 * https://cloud.tencent.com/document/product/1095/51612
 *
 * The verification process:
 * 1. Sort token, timestamp, nonce, and data lexicographically
 * 2. Concatenate them into a single string
 * 3. Compute SHA1 hash of the concatenated string
 * 4. Compare with the provided signature
 *
 * @param token - The webhook token from Tencent Meeting configuration
 * @param timestamp - Timestamp from the request header
 * @param nonce - Random nonce from the request header
 * @param data - The request body data
 * @param signature - The signature to verify against
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(
  token: string,
  timestamp: string,
  nonce: string,
  data: string,
  signature: string,
): boolean {
  const arr = [token, timestamp, nonce, data].sort();
  const str = arr.join('');
  const sha1 = createHash('sha1');
  const computedSignature = sha1.update(str).digest('hex');
  return computedSignature === signature;
}

/**
 * Decrypts AES-256-CBC encrypted data for Tencent Meeting webhooks
 *
 * This function implements the AES decryption algorithm specified in
 * Tencent Meeting documentation:
 * https://cloud.tencent.com/document/product/1095/54658
 *
 * The decryption process:
 * 1. Decode the EncodingAESKey from Base64 (with "=" padding)
 * 2. Extract IV from first 16 bytes of the decoded key
 * 3. Decode the encrypted text from Base64
 * 4. Decrypt using AES-256-CBC with automatic PKCS#7 padding
 * 5. Return the decrypted UTF-8 string
 *
 * @param encryptedText - Base64 encoded encrypted text
 * @param key - Base64 encoded encryption key (EncodingAESKey)
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails or key length is invalid
 */
export async function aesDecrypt(
  encryptedText: string,
  key: string,
): Promise<string> {
  try {
    // Decode the EncodingAESKey with "=" padding as per Tencent documentation
    const decodedKey = Buffer.from(key + '=', 'base64');

    // Validate key length - must be 32 bytes for AES-256
    if (decodedKey.length !== 32) {
      throw new Error(
        `Invalid key length: expected 32 bytes, got ${decodedKey.length}`,
      );
    }

    // Decode the encrypted text from Base64
    const decodedText = Buffer.from(encryptedText, 'base64');
    if (decodedText.length === 0) {
      throw new Error('Decoded encrypted text is empty');
    }

    // Extract IV from first 16 bytes of the key (as per Tencent spec)
    const iv = decodedKey.subarray(0, 16);
    const cipherKey = decodedKey;

    // Create AES-256-CBC decipher
    const decipher = createDecipheriv('aes-256-cbc', cipherKey, iv);

    // Enable automatic PKCS#7 padding removal
    decipher.setAutoPadding(true);

    // Decrypt the data
    let decrypted = decipher.update(decodedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Convert to UTF-8 string
    const plaintext = decrypted.toString('utf-8');
    await Promise.resolve();
    return plaintext;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`AES decryption failed: ${errorMessage}`);
  }
}

/**
 * Verifies webhook URL and decrypts the verification string for Tencent Meeting
 *
 * This function performs the complete webhook URL verification process:
 * 1. Validates all required parameters are present
 * 2. Verifies the signature using verifySignature()
 * 3. Decrypts the check string using aesDecrypt()
 *
 * Used during Tencent Meeting webhook URL verification process to confirm
 * that the webhook endpoint is valid and can receive encrypted data.
 *
 * @param checkStr - Encrypted verification string from Tencent Meeting
 * @param timestamp - Timestamp from the request header
 * @param nonce - Random nonce from the request header
 * @param signature - Signature to verify against
 * @param token - Webhook token from Tencent Meeting configuration
 * @param encodingAesKey - Base64 encoded encryption key
 * @returns Decrypted verification string
 * @throws WebhookUrlVerificationException if verification fails
 * @throws WebhookSignatureVerificationException if signature is invalid
 */
export async function verifyWebhookUrl(
  checkStr: string,
  timestamp: string,
  nonce: string,
  signature: string,
  token: string,
  encodingAesKey: string,
): Promise<string> {
  try {
    // Validate all required parameters
    if (!checkStr || !timestamp || !nonce || !signature) {
      throw new WebhookUrlVerificationException(
        'TENCENT_MEETING',
        'Missing required parameters for URL verification',
      );
    }

    // Verify the signature
    const isValid = verifySignature(
      token,
      timestamp,
      nonce,
      checkStr,
      signature,
    );

    if (!isValid) {
      throw new WebhookSignatureVerificationException('TENCENT_MEETING');
    }

    // Decrypt the verification string
    const decryptedStr = await aesDecrypt(checkStr, encodingAesKey);
    return decryptedStr;
  } catch (error) {
    if (
      error instanceof WebhookSignatureVerificationException ||
      error instanceof WebhookUrlVerificationException
    ) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new WebhookUrlVerificationException(
      'TENCENT_MEETING',
      `URL verification failed: ${errorMessage}`,
    );
  }
}

/**
 * Generates signature for Tencent Meeting API requests
 *
 * This function creates a signature for authenticating API requests
 * to Tencent Meeting services. The signature is used in the Authorization
 * header for API authentication.
 *
 * The signature generation process:
 * 1. Construct header string with key, nonce, and timestamp
 * 2. Create string to sign with HTTP method, headers, URI, and body
 * 3. Generate HMAC-SHA256 hash using secret key
 * 4. Encode the hash as Base64
 *
 * @param secretKey - The secret key for HMAC signing
 * @param httpMethod - HTTP method (GET, POST, etc.)
 * @param secretId - The secret ID for API authentication
 * @param headerNonce - Random nonce for the request header
 * @param headerTimestamp - Timestamp for the request header
 * @param requestUri - The request URI path
 * @param requestBody - The request body content
 * @returns Base64 encoded signature string
 */
export function generateSignature(
  secretKey: string,
  httpMethod: string,
  secretId: string,
  headerNonce: string,
  headerTimestamp: string,
  requestUri: string,
  requestBody: string,
): string {
  // Construct header string for signature
  const headerString = `X-TC-Key=${secretId}&X-TC-Nonce=${headerNonce}&X-TC-Timestamp=${headerTimestamp}`;

  // Create string to sign with proper formatting
  const stringToSign = `${httpMethod}\n${headerString}\n${requestUri}\n${requestBody}`;

  // Generate HMAC-SHA256 signature
  const hmac = createHmac('sha256', secretKey);
  const hash = hmac.update(stringToSign).digest('hex');

  // Return Base64 encoded signature
  return Buffer.from(hash).toString('base64');
}
