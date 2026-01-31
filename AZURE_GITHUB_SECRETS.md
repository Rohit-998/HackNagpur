# 🔐 Azure GitHub Secrets Setup Guide

Your GitHub Actions workflows need Azure credentials to deploy. Here's how to set them up.

---

## 🎯 Option 1: Using Azure Portal (Federated Credentials - Recommended)

This is the **modern, secure way** using OIDC (no long-lived secrets!).

### Step 1: Create Service Principal

1. Open **Azure Cloud Shell** (portal.azure.com - click the >_ icon)

2. Run this command (replace `YOUR_GITHUB_USERNAME` and `HackNagpur`):

```bash
az ad sp create-for-rbac \
  --name "GitHub-HackNagpur-Deploy" \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv) \
  --json-auth
```

3. **Save the output** - it looks like:
```json
{
  "clientId": "abc123...",
  "clientSecret": "xyz789...",
  "subscriptionId": "sub456...",
  "tenantId": "tenant789..."
}
```

### Step 2: Configure Federated Credentials

```bash
# Get your GitHub info
GITHUB_USER="YOUR_GITHUB_USERNAME"
REPO_NAME="HackNagpur"

# Get the Application ID (from previous step's clientId)
APP_ID="<your-clientId-from-above>"

# Create federated credential
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "GitHubActions",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'"$GITHUB_USER"'/'"$REPO_NAME"':ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### Step 3: Add Secrets to GitHub

1. Go to your GitHub repo: `https://github.com/YOUR_USERNAME/HackNagpur`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these **3 secrets**:

| Secret Name | Value |
|-------------|-------|
| `AZURE_CLIENT_ID` | The `clientId` from Step 1 |
| `AZURE_TENANT_ID` | The `tenantId` from Step 1 |
| `AZURE_SUBSCRIPTION_ID` | The `subscriptionId` from Step 1 |

✅ **Done!** Your workflows will now authenticate via OIDC.

---

## 🎯 Option 2: Using Publish Profile (Simpler, but less secure)

### Step 1: Download Publish Profile

1. Azure Portal → Your App Service (`hackngp`)
2. **Overview** → **Get publish profile** (download button)
3. Open the `.PublishSettings` file in notepad
4. Copy the entire XML content

### Step 2: Add to GitHub

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**:
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE_ML`
   - Value: Paste the XML content
3. Click **Add secret**

### Step 3: Repeat for Backend

1. Download publish profile for backend app
2. Add as `AZURE_WEBAPP_PUBLISH_PROFILE_BACKEND`

### Step 4: Update Workflows

If using publish profiles, replace the login step with:

```yaml
- name: 'Deploy to Azure Web App'
  uses: azure/webapps-deploy@v3
  with:
    app-name: 'hackngp'
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_ML }}
```

---

## ✅ Verification

After setting up secrets:

1. **Push a change** to GitHub
2. Go to **Actions** tab in your repo
3. Watch the workflow run
4. Green checkmark = Success! ✅

---

## 🐛 Troubleshooting

### "Secret not found"
- Check secret names match exactly (case-sensitive)
- Verify secrets are repository secrets, not environment secrets

### "Authentication failed"
- For OIDC: Verify federated credential subject matches your repo
- For publish profile: Re-download from Azure (profiles expire)

### "Resource not found"
- Verify app name matches in workflow (e.g., `hackngp`, `ht1-backend`)
- Check subscription ID is correct

---

## 🔒 Security Best Practices

### OIDC (Option 1) ✅
- No long-lived secrets stored
- Tokens expire automatically
- More secure, Azure-recommended

### Publish Profile (Option 2) ⚠️
- Contains credentials
- Needs manual rotation
- Good for quick setup

---

## 📝 Quick Reference

### For ML Service
- **App Name**: `hackngp`
- **Secrets Needed**: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`

### For Backend
- **App Name**: `ht1-backend` (or your chosen name)
- **Secrets Needed**: Same as above (shared secrets)

---

## 🚀 Next Steps

1. ✅ Set up secrets (choose Option 1 or 2)
2. ✅ Push to GitHub to trigger workflow
3. ✅ Monitor deployment in Actions tab
4. ✅ Test your deployed apps!

---

**Need help?** Check the workflow logs in GitHub Actions tab for detailed error messages.
