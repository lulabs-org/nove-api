/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-31 01:20:55
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 01:20:57
 * @FilePath: /lulab_backend/scripts/parse_decrypted.mjs
 * @Description: 
 * 
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved. 
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    const jsonPath = join(__dirname, '../decrypted_data_values.json');
    const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8'));

    console.log(`Processing ${jsonData.results.length} decrypted items...\n`);

    for (let i = 0; i < jsonData.results.length; i++) {
      const item = jsonData.results[i];
      try {
        const decryptedObj = JSON.parse(item.decrypted);
        jsonData.results[i].decrypted = decryptedObj;
        console.log(`[${i + 1}/${jsonData.results.length}] Parsed successfully`);
      } catch (error) {
        console.error(`[${i + 1}/${jsonData.results.length}] Failed to parse:`, error.message);
      }
    }

    writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log('\n✓ All decrypted fields converted to JSON objects');
    console.log(`Updated file: ${jsonPath}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
