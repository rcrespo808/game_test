# GitHub Pages Setup Guide

This guide will help you enable GitHub Pages for the Grid Runner game.

## Step-by-Step Instructions

### 1. Navigate to Repository Settings

1. Go to your repository: https://github.com/rcrespo808/game_test
2. Click on the **Settings** tab (top right of the repository page)
3. If you don't see Settings, make sure you have admin/owner permissions

### 2. Enable GitHub Pages

1. In the left sidebar, scroll down and click **Pages**
2. Under **Source**, you'll see a dropdown - select **"GitHub Actions"**
   - ⚠️ **Important**: Do NOT select "Deploy from a branch"
   - You must select "GitHub Actions" for the workflow to work
3. Click **Save** (if there's a save button)

### 3. Verify Setup

After enabling:
- The Pages section should show "GitHub Actions" as the source
- You should see a message indicating Pages is ready to be deployed

### 4. Trigger Deployment

1. Go to the **Actions** tab in your repository
2. You can either:
   - Wait for the next push to `main` branch (automatic)
   - Or manually re-run the latest "CI Build" workflow

### 5. Check Deployment Status

1. Go to **Actions** tab
2. Click on the latest workflow run
3. You should see:
   - ✅ Build job completes successfully
   - ✅ Deploy job completes successfully
4. Once complete, your game will be live at: `https://rcrespo808.github.io/game_test/`

## Troubleshooting

### "Not Found" Error (404)
- Make sure GitHub Pages is enabled in Settings → Pages
- Make sure source is set to **"GitHub Actions"** (not a branch)
- Wait for the deployment workflow to complete

### Deployment Fails
- Check the Actions tab for error messages
- Ensure the `build` directory is created correctly
- Verify all dependencies install successfully

### Pages Still Not Loading
- It can take a few minutes for GitHub to propagate the site
- Clear your browser cache
- Check the Pages settings to see if deployment is in progress

## Alternative: Manual Branch Deployment

If GitHub Actions deployment doesn't work, you can use the older method:

1. In Settings → Pages, select **"Deploy from a branch"**
2. Select branch: `gh-pages`
3. Folder: `/ (root)`
4. Update the workflow to use `peaceiris/actions-gh-pages@v3` instead

However, the GitHub Actions method is recommended and should work once properly enabled.

