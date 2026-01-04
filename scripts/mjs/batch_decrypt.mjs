import { createDecipheriv } from 'node:crypto';
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const encodingAesKey = process.env.TENCENT_MEETING_ENCODING_AES_KEY || '54235325';

function decryptData(encryptedData) {
  const decodedKey = Buffer.from(encodingAesKey + '=', 'base64');

  if (decodedKey.length !== 32) {
    throw new Error(`Invalid key length: expected 32 bytes, got ${decodedKey.length}`);
  }

  const decodedText = Buffer.from(encryptedData, 'base64');
  if (decodedText.length === 0) {
    throw new Error('Decoded encrypted text is empty');
  }

  const iv = decodedKey.subarray(0, 16);
  const cipherKey = decodedKey;

  const decipher = createDecipheriv('aes-256-cbc', cipherKey, iv);
  decipher.setAutoPadding(true);

  let decrypted = decipher.update(decodedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf-8');
}

async function main() {
  try {
    const jsonPath = join(__dirname, '../extracted_data_values.json');
    const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8'));

    console.log(`Total items to decrypt: ${jsonData.count}`);
    console.log('Starting decryption...\n');

    const decryptedResults = [];
    const errors = [];

    for (let i = 0; i < jsonData.data_values.length; i++) {
      const encryptedData = jsonData.data_values[i];
      try {
        const decrypted = decryptData(encryptedData);
        decryptedResults.push({
          index: i,
          encrypted: encryptedData.substring(0, 50) + '...',
          decrypted: decrypted
        });
        console.log(`[${i + 1}/${jsonData.data_values.length}] Decrypted successfully`);
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          encrypted: encryptedData.substring(0, 50) + '...'
        });
        console.error(`[${i + 1}/${jsonData.data_values.length}] Decryption failed:`, error.message);
      }
    }

    const outputPath = join(__dirname, '../decrypted_data_values.json');
    const outputData = {
      total_count: jsonData.count,
      success_count: decryptedResults.length,
      error_count: errors.length,
      results: decryptedResults,
      errors: errors
    };

    writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

    console.log('\n=== Summary ===');
    console.log(`Total: ${jsonData.count}`);
    console.log(`Success: ${decryptedResults.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`\nDecrypted data saved to: ${outputPath}`);

    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach(err => {
        console.log(`Index ${err.index}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
