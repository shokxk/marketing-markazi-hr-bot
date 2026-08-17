const path = require('path');
const { execSync } = require('child_process');
const backendDir = path.join(__dirname, '../backend');
console.log('🚀 Starting Marketing Markazi HR Bot from root wrapper...');
console.log('📂 Working directory set to:', backendDir);
process.chdir(backendDir);

try {
  console.log('🔄 Ensuring SQLite database schema is synchronized before launch...');
  execSync('npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss', { stdio: 'inherit' });
  console.log('✅ Prisma DB push complete!');
} catch (e) {
  console.log('Prisma push info:', e.message);
}

require(path.join(backendDir, 'dist/index.js'));
