const fs = require('fs');
const file = 'components/Onboarding.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/text-xs font-bold text-stone-500 dark:text-stone-400/g, 'text-sm font-extrabold text-stone-800 dark:text-stone-200');
fs.writeFileSync(file, content);
console.log('Done');
