const fs = require('fs');
const file = 'components/Onboarding.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/font-semibold/g, 'font-extrabold');
fs.writeFileSync(file, content);
console.log('Done');
