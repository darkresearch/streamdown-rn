# Release Process with Changesets

StreamdownRN uses [Changesets](https://github.com/changesets/changesets) for version management and publishing - the same system Vercel uses for Streamdown.

## How It Works

1. **Contributors add changesets** - Describe what changed and the version bump type
2. **Automated PR** - GitHub Actions creates a "Version Packages" PR aggregating all changes
3. **Merge to publish** - When you merge the Version Packages PR, it automatically publishes to npm

## For Contributors

When you make a change that should be published, add a changeset:

```bash
bun run changeset
```

This will prompt you:

1. **Which packages changed?** - Select `streamdown-rn`
2. **What kind of change?** - Choose:
   - `patch` - Bug fixes (0.1.0 → 0.1.1)
   - `minor` - New features (0.1.0 → 0.2.0)
   - `major` - Breaking changes (0.1.0 → 1.0.0)
3. **Summary** - Describe what changed (will appear in CHANGELOG)

This creates a file in `.changeset/` that you commit with your PR.

### Example Workflow

```bash
# Make your changes
git checkout -b feature/add-tables

# ... make changes ...

# Add a changeset
bun run changeset
# Choose: patch
# Summary: "Add support for markdown tables"

# Commit everything
git add .
git commit -m "Add markdown table support"

# Push and create PR
git push origin feature/add-tables
```

## For Maintainers

### The Automated Flow

1. **PRs get merged** with changesets
2. **GitHub Actions** automatically creates/updates a "Version Packages" PR
3. **Review the Version Packages PR** - Check:
   - Version bump is correct
   - CHANGELOG looks good
   - All changes are included
4. **Merge the Version Packages PR** - This triggers:
   - Version bump in package.json
   - CHANGELOG.md update
   - Git tag creation
   - npm publish (with provenance)

### Manual Version Bump (if needed)

If you need to publish without changesets:

```bash
# Create a changeset manually
bun run changeset

# Version (updates package.json and CHANGELOG)
bun run version

# Publish
bun run release
```

## Setting Up npm Token

For automated publishing, you need to add an npm token to GitHub Secrets:

1. **Generate npm token**:
   - Go to https://www.npmjs.com/settings/edgardark/tokens
   - Create new token → "Automation" type
   - Copy the token

2. **Add to GitHub Secrets**:
   - Go to https://github.com/darkresearch/streamdown-rn/settings/secrets/actions
   - New repository secret
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token

Alternatively, set up **Trusted Publishing with OIDC** (more secure, no token needed):
- Go to https://www.npmjs.com/package/streamdown-rn/access
- Configure Trusted Publisher with GitHub Actions

## Example Changesets

### Patch (Bug Fix)
```markdown
---
"streamdown-rn": patch
---

Fix code block rendering on Android devices
```

### Minor (New Feature)
```markdown
---
"streamdown-rn": minor
---

Add support for custom theme configuration
```

### Major (Breaking Change)
```markdown
---
"streamdown-rn": major
---

BREAKING: Remove deprecated `parseOptions` prop. Use `theme` prop instead.
```

## Benefits

✅ **Automated versioning** - No manual version bumps  
✅ **Automatic CHANGELOG** - Generated from changeset descriptions  
✅ **Aggregated releases** - Multiple PRs = one version bump  
✅ **Clear change tracking** - Know exactly what's in each version  
✅ **Same as Vercel** - Industry-standard workflow

## First Release with Changesets

Since we already published 0.1.0, the first changeset will create 0.1.1 (or 0.2.0 depending on the change type).

Try it out:
```bash
bun run changeset
# Select patch/minor/major
# Describe your change
git add .changeset/*
git commit -m "Add changeset"
git push
```

GitHub Actions will automatically create a "Version Packages" PR!

