# 🚀 Bracket System - Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the Bracket System to production.

## ✅ Deployment Status

| Component | Status | Location |
|-----------|--------|----------|
| Bracket Core | ✅ Deployed | `src/lib/bracketGenerator.ts` |
| CSV Utils | ✅ Deployed | `src/lib/csvUtils.ts` |
| Configuration | ✅ Deployed | `src/lib/bracketConfig.ts` |
| React Component | ✅ Deployed | `src/components/AdvancedBracket.tsx` |
| Test Suite | ✅ Deployed | `src/lib/__tests__/` |
| CI/CD Workflow | ✅ Deployed | `bracket-ci-cd.yml` |
| Documentation | ✅ Deployed | `BRACKET_SYSTEM.md` |

## 🔧 Local Development Setup

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- Git

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/cornolio1975/Kelab-Senshi-Goju-Ryu-Karate-.git
cd Kelab-Senshi-Goju-Ryu-Karate-

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Open in browser
# Navigate to http://localhost:3000/brackets
```

### Running Tests Locally

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- bracketGenerator.test.ts

# Run with coverage
npm run test -- --coverage

# Run in watch mode
npm run test -- --watch
```

### Building for Production

```bash
# Build the project
npm run build

# Start production server
npm run start
```

## 📦 GitHub Deployment

### 1. Setup GitHub Secrets

Go to: **Settings → Secrets and variables → Actions**

Add the following secrets:

```
VERCEL_TOKEN: <your-vercel-token>
```

To get Vercel token:
1. Visit https://vercel.com/account/tokens
2. Create new token
3. Copy and add to GitHub secrets

### 2. GitHub Actions Workflow

The workflow automatically:
- ✅ Runs on every push to master/main/develop
- ✅ Runs on all pull requests
- ✅ Tests with Node 18.x and 20.x
- ✅ Deploys to Vercel on master branch

### 3. Deployment Triggers

**Automatic Deployment (Master Branch):**
```bash
git push origin master
```

**Pull Request Tests:**
```bash
git push origin feature-branch
# Create PR to master
```

## 🚀 Vercel Deployment

### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=https://api.example.com
```

## 📋 Pre-Deployment Checklist

- [ ] All tests passing locally: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] GitHub secrets configured
- [ ] Vercel project linked

## 🔍 Testing the Deployment

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests (if available)
```bash
npm run test:e2e
```

## 📊 Monitoring Deployment

### GitHub Actions Dashboard
- Navigate to: **Actions** tab in repository
- View build logs and deployment status
- Check for any failures

### Vercel Dashboard
- Visit: https://vercel.com/dashboard
- Monitor deployment history
- Check analytics and performance

## 🐛 Troubleshooting

### Build Fails

**Issue**: Tests failing on CI/CD
```bash
# Solution: Run tests locally first
npm run test

# Check for TypeScript errors
npm run type-check

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Deployment blocked
```bash
# Check GitHub Actions logs
# Check Vercel logs
# Verify secrets are set correctly
```

### Permission Issues

**Issue**: Can't push to repository
```bash
# Generate new SSH key
ssh-keygen -t ed25519

# Add to GitHub Settings → SSH Keys
```

## 📱 Production URLs

Once deployed:
- **Vercel Production**: `https://your-domain.vercel.app`
- **GitHub Pages** (if enabled): `https://cornolio1975.github.io/Kelab-Senshi-Goju-Ryu-Karate-`

## 🔐 Security

### Best Practices
- ✅ Keep dependencies updated: `npm audit`
- ✅ Use environment variables for secrets
- ✅ Enable branch protection rules
- ✅ Require status checks before merging
- ✅ Enable HTTPS only

### Dependency Management

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

## 📝 Version Management

### Semantic Versioning
```
MAJOR.MINOR.PATCH
1.0.0 → 1.0.1 (patch)
1.0.0 → 1.1.0 (minor)
1.0.0 → 2.0.0 (major)
```

### Release Process

1. **Create release branch**
   ```bash
   git checkout -b release/v1.0.0
   ```

2. **Update version in package.json**
   ```json
   {
     "version": "1.0.0"
   }
   ```

3. **Update CHANGELOG.md**

4. **Push and create PR**
   ```bash
   git push origin release/v1.0.0
   ```

5. **Merge to master**

6. **Create GitHub Release**
   - Go to Releases
   - Create new release
   - Tag: v1.0.0
   - Add notes

## 📈 Performance Monitoring

### Key Metrics
- Build time: < 2 minutes
- Test coverage: > 80%
- Bundle size: Monitor with `npm run analyze`
- Performance score: Monitor with Lighthouse

### Optimization

```bash
# Analyze bundle size
npm run analyze

# Generate coverage report
npm run test -- --coverage
```

## 🤝 Rollback Strategy

### If Deployment Fails

```bash
# Revert to previous commit
git revert <commit-hash>
git push origin master

# Or reset to previous version
git reset --hard <previous-commit>
git push origin master --force
```

### Vercel Rollback
- Go to Vercel Dashboard
- Find previous deployment
- Click "Rollback"

## 📞 Support & Documentation

- **Technical Docs**: `BRACKET_SYSTEM.md`
- **API Reference**: See inline JSDoc comments
- **Examples**: `src/lib/bracketExamples.ts`
- **Issues**: GitHub Issues tab

## 🎯 Post-Deployment Tasks

- [ ] Verify deployment is live
- [ ] Test all bracket functionality
- [ ] Monitor error logs
- [ ] Get user feedback
- [ ] Update status page
- [ ] Document any issues

## 🔄 Continuous Improvement

### Regular Tasks
- **Weekly**: Review logs and errors
- **Monthly**: Update dependencies
- **Quarterly**: Performance audit
- **Yearly**: Major version evaluation

---

**Last Updated**: July 4, 2026  
**Status**: ✅ Ready for Production  
**Next Review**: July 11, 2026
