#!/usr/bin/env node
/**
 * 修复剩余的硬编码 API 地址
 */

const fs = require('fs');
const path = require('path');

function replaceApiUrls(content) {
  let newContent = content;
  
  // 替换 fetch('http://localhost:8000
  newContent = newContent.replace(/fetch\(['"]http:\/\/localhost:8000/g, "fetch(getApiBaseUrl() + '");

  // 替换 fetch(`http://localhost:8000
  newContent = newContent.replace(/fetch\(`http:\/\/localhost:8000/g, "fetch(getApiBaseUrl() + `");

  // 替换 link.href = `http://localhost:8000
  newContent = newContent.replace(/href\s*=\s*`http:\/\/localhost:8000/g, "href = `getApiBaseUrl() + `");

  return newContent;
}

function processFile(filepath) {
  try {
    let content = fs.readFileSync(filepath, 'utf-8');

    if (!content.includes('http://localhost:8000')) {
      return false;
    }

    let newContent = replaceApiUrls(content);

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