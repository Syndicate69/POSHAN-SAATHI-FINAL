const fs = require('fs');
const file = 'components/Onboarding.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/text-stone-400/g, 'text-[#A1887F]');

fs.writeFileSync(file, content);
console.log('Done');
