const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('1. Building and deploying to GitHub Pages...');
  execSync('node build-gh.js', { stdio: 'inherit' });
  execSync('npx gh-pages -d out --nojekyll --dotfiles', { stdio: 'inherit' });
  console.log('✅ GitHub Pages deployment successful!');

  console.log('\n2. Building for Hostinger (no basePath)...');
  execSync('node build-hostinger.js', { stdio: 'inherit' });

  console.log('\n3. Packaging Hostinger build into dist.zip...');
  if (process.platform === 'win32') {
    execSync('powershell "if (Test-Path dist.zip) { Remove-Item dist.zip }; Compress-Archive -Path out\\* -DestinationPath dist.zip -Force"', { stdio: 'inherit' });
  } else {
    execSync('zip -r dist.zip out/*', { stdio: 'inherit' });
  }
  console.log('✅ Hostinger build packaged in dist.zip successfully!');
  console.log('\n🎉 Both deployments prepared! Upload dist.zip to Hostinger and you are good to go!');
} catch (error) {
  console.error('❌ Deployment process failed:', error);
  process.exit(1);
}
