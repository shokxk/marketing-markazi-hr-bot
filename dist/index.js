const path = require('path');
const backendDir = path.join(__dirname, '../backend');
console.log('🚀 Starting Marketing Markazi HR Bot from root wrapper...');
console.log('📂 Working directory set to:', backendDir);
process.chdir(backendDir);
require(path.join(backendDir, 'dist/index.js'));
