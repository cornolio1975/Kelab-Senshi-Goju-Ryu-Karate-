const { execSync } = require('child_process');

console.log('Building project for Hostinger deployment (basePath: /)...');

try {
  // Run build with DEPLOY_TARGET=hostinger
  execSync('npm run build', { 
    stdio: 'inherit', 
    env: { ...process.env, DEPLOY_TARGET: 'hostinger' } 
  });
  console.log('Build completed successfully!');
  
  // Publish to hostinger-deploy branch
  console.log('Publishing static output (out/) to branch "hostinger-deploy"...');
  execSync('npx gh-pages -d out -b hostinger-deploy --nojekyll --dotfiles', { stdio: 'inherit' });
  console.log('Successfully published to branch "hostinger-deploy"!');
} catch (error) {
  console.error('Deployment failed:', error);
  process.exit(1);
}
