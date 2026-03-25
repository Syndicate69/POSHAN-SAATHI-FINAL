const fs = require('fs');
const file = 'components/Onboarding.tsx';
let content = fs.readFileSync(file, 'utf8');

// Background
content = content.replace(/bg-\[#F7F5F0\]/g, 'bg-[#FDF8F5]');

// Dhaka pattern opacity
content = content.replace(/opacity-\[0\.04\]/g, 'opacity-[0.08]');

// Card background and mandala
content = content.replace(/bg-white dark:bg-\[#1A1816\]/g, 'bg-[#FFFCF8] dark:bg-[#1A1816] mandala-bg');

// Main text color
content = content.replace(/text-stone-900 dark:text-stone-50/g, 'text-[#4A362D] dark:text-stone-50');

// Label text color
content = content.replace(/text-stone-800 dark:text-stone-200/g, 'text-[#5D4037] dark:text-stone-200');

// Input background
content = content.replace(/bg-stone-50 dark:bg-\[#221F1D\]/g, 'bg-[#FDFBF7] dark:bg-[#221F1D]');

// Input border
content = content.replace(/border-stone-200 dark:border-stone-800/g, 'border-[#EFEBE1] dark:border-stone-800');

// Input hover border
content = content.replace(/hover:border-stone-300 dark:hover:border-stone-700/g, 'hover:border-[#D7CCC8] dark:hover:border-stone-700');

// Continue with Google button
content = content.replace(/bg-white dark:bg-\[#221F1D\] text-stone-700/g, 'bg-[#FFFCF8] dark:bg-[#221F1D] text-[#5D4037]');
content = content.replace(/hover:bg-stone-50 dark:hover:bg-stone-800/g, 'hover:bg-[#FDF8F5] dark:hover:bg-stone-800');

// Back button
content = content.replace(/text-stone-500 hover:text-stone-900/g, 'text-[#8D6E63] hover:text-[#4A362D]');

fs.writeFileSync(file, content);
console.log('Done');
