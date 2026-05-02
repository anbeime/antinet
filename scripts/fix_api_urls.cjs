#!/usr/bin/env node
/**
 * 批量替换硬编码的 API 地址为动态获取
 */

const fs = require('fs');
const path = require('path');

const IMPORT_STATEMENT = "import { getApiBaseUrl } from '@/lib/apiConfig';";

function shouldAddImport(content) {
  return !content.includes("from '@/lib/apiConfig'");
}

function replaceApiUrls(content) {
  let newContent = content;

  // 替换 const API_BASE = 'http://localhost:8000' 等
  const patterns = [
    [/const API_BASE\s*=\s*['"]http:\/\/localhost:8000([^'"]*)['"];?/g, "const API_BASE = getApiBaseUrl() + '$1'"],
    [/const API_BASE_URL\s*=\s*['"]http:\/\/localhost:8000([^'"]*)['"];?/g, "const API_BASE_URL = getApiBaseUrl() + '$1'"],
    [/const API_PATHS\s*=\s*['"]http:\/\/localhost:8000([^'"]*)['"];?/g, "const API_PATHS = getApiBaseUrl() + '$1'"],
    [/const RESEARCH_API_BASE\s*=\s*['"]http:\/\/localhost:8000([^'"]*)['"];?/g, "const RESEARCH_API_BASE = getApiBaseUrl() + '$1'"],
    [/const VISION_API_BASE\s*=\s*['"]http:\/\/localhost:8000([^'"]*)['"];?/g, "const VISION_API_BASE = getApiBaseUrl() + '$1'"],
  ];

  for (const [pattern, replacement] of patterns) {
    newContent = newContent.replace(pattern, replacement);
  }

  // 替换 fetch('http://localhost:8000 为 fetch(getApiBaseUrl() + '
  newContent = newContent.replace(/fetch\(['"]http:\/\/localhost:8000/g, "fetch(getApiBaseUrl() + '");

  // 替换 `http://localhost:8000${ 为 `getApiBaseUrl() + ${
  newContent = newContent.replace(/`http:\/\/localhost:8000\$\{/g, "`getApiBaseUrl() + ${");

  // 替换 link.href = `http://localhost:8000${ 为 link.href = `getApiBaseUrl() + $
  newContent = newContent.replace(/href\s*=\s*`http:\/\/localhost:8000\$\{/g, "href = `getApiBaseUrl() + ${");

  return newContent;
}

function processFile(filepath) {
  try {
    let content = fs.readFileSync(filepath, 'utf-8');

    if (!content.includes('http://localhost:8000')) {
      return false;
    }

    let newContent = replaceApiUrls(content);

    // 添加 import 语句
    if (newContent.includes('getApiBaseUrl()') && shouldAddImport(newContent)) {
      const lines = newContent.split('\n');
      let importIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('import ') && !line.endsWith("';") && !line.endsWith('";')) {
          importIdx = i;
        }
      }

      if (importIdx >= 0) {
        lines.splice(importIdx + 1, 0, IMPORT_STATEMENT);
        newContent = lines.join('\n');
      }
    }

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
          console.log(`Updated: ${path.relative(__dirname, filepath)}`);
          count++;
        }
      }
    }
  }

  walkDir(srcDir);
  console.log(`\nTotal files updated: ${count}`);
}

main();