const fs = require('fs');
const file = 'components/Onboarding.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/ className="font-sans"/g, '');
fs.writeFileSync(file, content);
console.log('Done');
