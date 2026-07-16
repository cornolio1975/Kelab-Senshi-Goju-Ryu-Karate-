const { execSync } = require('child_process');

console.log('Building project for GitHub Pages deployment (basePath: /Kelab-Senshi-Goju-Ryu-Karate-)...');

try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_BASE_PATH: '/Kelab-Senshi-Goju-Ryu-Karate-'
    }
  });
  console.log('GitHub Pages build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
