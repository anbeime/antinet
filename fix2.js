const fs = require('fs');
const c = fs.readFileSync('src/pages/Home.tsx', 'utf8');
const search = "['team- collaboration'].includes( activeTab)";
const replace = "['pdf- analysis', 'ppt- analysis', 'excel- analysis', 'document- center', 'format- converter', 'report- automation'].includes( activeTab)";
const idx = c.indexOf(search);
console.log('idx', idx);
const next = c.indexOf(search, idx+1);
console.log('idx2', next);