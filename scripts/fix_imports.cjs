#!/usr/bin/env node
/**
 * 修复 import 语句位置错误
 */

const fs = require('fs');
const path = require('path');

function fixImportStatements(content) {
  // 修复模式: import { 后面紧跟 import { getApiBaseUrl
  // 匹配: import {\nimport { getApiBaseUrl } from '@/lib/apiConfig';\n
  // 修复为: import { getApiBaseUrl } from '@/lib/apiConfig';\nimport {

  let newContent = content;
  
  // 模式1: import { 后面跟着 import { getApiBaseUrl
  const pattern1 = /import \{\nimport \{ getApiBaseUrl \} from ['"]@\/lib\/apiConfig['"];\n/;
  const replacement1 = "import { getApiBaseUrl } from '@/lib/apiConfig';\nimport {\n";
  newContent = newContent.replace(pattern1, replacement1);

  // 模式2: import type { 后面跟着 import { getApiBaseUrl
  const pattern2 = /import type \{\nimport \{ getApiBaseUrl \} from ['"]@\/lib\/apiConfig['"];\n/;
  const replacement2 = "import { getApiBaseUrl } from '@/lib/apiConfig';\nimport type {\n";
  newContent = newContent.replace(pattern2, replacement2);

  return newContent;
}

function processFile(filepath) {
  try {
    let content = fs.readFileSync(filepath, 'utf-8');
    let newContent = fixImportStatements(content);

    if (newContent !== content) {
      fs.writeFileSync(filepath, newContent, 'utf-8');
      return true;
    }
    return false;
  } catch (e) {
    console.error(`Error processing ${filepath}: ${e.message}`);
    return false;
  }
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  let count = 0;

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filepath = path.join(dir, file);
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        walkDir(filepath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        if (processFile(filepath)) {
          console.log(`Fixed: ${path.relative(__dirname, filepath)}`);
          count++;
        }
      }
    }
  }

  walkDir(srcDir);
  console.log(`\nTotal files fixed: ${count}`);
}

main();