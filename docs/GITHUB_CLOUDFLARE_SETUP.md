# GitHub + Cloudflare Deployment Setup Guide

This guide explains how to set up GitHub Actions to automatically deploy your backend to Cloudflare Workers, create D1 database, and R2 storage bucket.

## Step 1: Create GitHub Personal Access Token with Workflow Scope

Since your repository contains GitHub Actions workflow files (`.github/workflows/`), you need a token with `workflow` permission.

### Create the Token:

1. Go to **GitHub.com** → Click your profile picture → **Settings**
2. Scroll down to **Developer settings** (left sidebar)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token** → **Generate new token (classic)**
5. Give it a name: `Fluxein Deploy Token`
6. Set expiration: Choose based on your needs (90 days recommended)
7. Select these scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
8. Click **Generate token**
9. **COPY THE TOKEN IMMEDIATELY** - you won't see it again!

### Use the Token to Push:

```bash
# Option A: Update remote URL with token
git remote set-url origin https://YOUR_TOKEN@github.com/savannaik090-coder/Fluxein.git

# Then push
git push origin main
```

Or:

```bash
# Option B: When prompted for password, use the token instead
git push origin main
# Username: savannaik090-coder
# Password: [paste your token here]
```

---

## Step 2: Add Cloudflare Secrets to GitHub

### Get Your Cloudflare Credentials:

1. **Cloudflare Account ID:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click on **Workers & Pages** in the left sidebar
   - Your Account ID is shown in the right sidebar

2. **Cloudflare API Token:**
   - Go to Cloudflare Dashboard → **Profile** (top right) → **API Tokens**
   - Click **Create Token**
   - Use the **"Edit Cloudflare Workers"** template
   - Add these permissions:
     - Account → D1 → Edit
     - Account → R2 → Edit
     - Account → Workers Scripts → Edit
   - Click **Continue to summary** → **Create Token**
   - **COPY THE TOKEN IMMEDIATELY**

### Add Secrets to GitHub:

1. Go to your GitHub repository: `https://github.com/savannaik090-coder/Fluxein`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:

| Secret Name | Description |
|-------------|-------------|
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token (from step above) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID (for payments) |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Key Secret |
| `JWT_SECRET` | A random secure string for JWT tokens (e.g., use `openssl rand -hex 32`) |
| `EMAIL_API_KEY` | Your email service API key (if using) |

---

## Step 3: Push and Deploy

Once secrets are configured:

```bash
# Push to main branch to trigger deployment
git push origin main
```

The GitHub Action will automatically:
1. ✅ Create D1 database `saas-platform-db` (if not exists)
2. ✅ Create R2 bucket `saas-platform-storage` (if not exists)
3. ✅ Run database migrations
4. ✅ Deploy the Cloudflare Worker

---

## Step 4: Verify Deployment

After the workflow runs:

1. Go to **Actions** tab in your GitHub repo to see the workflow status
2. Check Cloudflare Dashboard → **Workers & Pages** to see your deployed worker
3. Check Cloudflare Dashboard → **D1** to see your database
4. Check Cloudflare Dashboard → **R2** to see your storage bucket

---

## Manual Trigger

You can also manually trigger the deployment:

1. Go to your repo → **Actions** tab
2. Click **Deploy to Cloudflare** workflow
3. Click **Run workflow** → **Run workflow**

---

## Troubleshooting

### "workflow scope required" error
- Make sure your Personal Access Token has the `workflow` scope checked
- Regenerate the token if needed

### "D1 not found" error
- Check that `CLOUDFLARE_ACCOUNT_ID` is correct
- Verify API token has D1 permissions

### "R2 access denied" error
- Verify API token has R2 permissions
- Check bucket name matches in wrangler.toml

### Workflow fails at deploy step
- Check that wrangler.toml is valid
- Verify all required secrets are added to GitHub

---

## Files Created

- `.github/workflows/deploy-cloudflare.yml` - The GitHub Actions workflow
- `backend/wrangler.toml` - Cloudflare Workers configuration

---

## Security Notes

- Never commit secrets to your repository
- Use GitHub Secrets for all sensitive values
- Rotate your tokens periodically
- Use minimum required permissions for API tokens
