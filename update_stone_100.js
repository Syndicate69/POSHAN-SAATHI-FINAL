const fs = require('fs');
const file = 'components/Onboarding.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-stone-100/g, 'bg-[#EFEBE1]');
content = content.replace(/border-stone-100/g, 'border-[#EFEBE1]');

fs.writeFileSync(file, content);
console.log('Done');
