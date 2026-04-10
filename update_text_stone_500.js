const fs = require('fs');
const file = 'components/Onboarding.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/text-stone-500/g, 'text-[#8D6E63]');

fs.writeFileSync(file, content);
console.log('Done');
