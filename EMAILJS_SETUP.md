# EmailJS Setup Guide

This guide will help you set up email notifications for CRA assessment form submissions.

## Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account (200 emails/month)
3. Verify your email address

## Step 2: Connect Your Email Service

1. Go to **Email Services** in the EmailJS dashboard
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. For Gmail:
   - Click **Connect Account**
   - Authorize EmailJS with Gmail (requires "Send email on your behalf" permission)
   - Note your **Service ID** (e.g., `service_21y3wlh`)

⚠️ **Important**: If you get "insufficient authentication scopes" error:
   - Disconnect and reconnect the Gmail account
   - Make sure to grant all requested permissions during OAuth flow

## Step 3: Create Email Template

1. Go to **Email Templates** in the EmailJS dashboard
2. Click **Create New Template**
3. Use this template:

```
Subject: New CRA Assessment Lead - {{company}}

New CRA assessment submission:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:         {{from_name}}
Email:        {{from_email}}
Company:      {{company}}
Role:         {{role}}
Product:      {{device}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASSESSMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sector:       {{sector}}
Product Type: {{product_type}}
Overall Score: {{overall_score}}%
Completed:    {{questions_answered}} questions
Date:         {{assessment_date}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
View full report: {{report_link}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This email was sent via the CRA Assessment Tool.
```

4. Save the template and note your **Template ID** (e.g., `template_cra_lead`)

## Step 4: Get Your Public Key

1. Go to **Account** → **General** in EmailJS dashboard
2. Find your **Public Key** (looks like a long string)
3. Copy it for the next step

## Step 5: Configure Environment Variables

### For Local Development:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values:
   ```bash
   VITE_EMAILJS_SERVICE_ID=service_21y3wlh
   VITE_EMAILJS_TEMPLATE_ID=template_cra_lead
   VITE_EMAILJS_PUBLIC_KEY=your_actual_public_key_here
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

### For GitHub Pages Deployment:

Since GitHub Pages is a static site host, you need to build the site with environment variables injected at build time.

#### Option A: GitHub Actions (Recommended)

1. Add secrets to your GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Add these three secrets:
     - `VITE_EMAILJS_SERVICE_ID`
     - `VITE_EMAILJS_TEMPLATE_ID`
     - `VITE_EMAILJS_PUBLIC_KEY`

2. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build with env variables
        env:
          VITE_EMAILJS_SERVICE_ID: ${{ secrets.VITE_EMAILJS_SERVICE_ID }}
          VITE_EMAILJS_TEMPLATE_ID: ${{ secrets.VITE_EMAILJS_TEMPLATE_ID }}
          VITE_EMAILJS_PUBLIC_KEY: ${{ secrets.VITE_EMAILJS_PUBLIC_KEY }}
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

3. Enable GitHub Pages in repository settings:
   - Go to **Settings** → **Pages**
   - Source: **GitHub Actions**

#### Option B: Manual Build (Alternative)

If you prefer manual deployment:

1. Build locally with environment variables:
   ```bash
   VITE_EMAILJS_SERVICE_ID=service_xxx \
   VITE_EMAILJS_TEMPLATE_ID=template_xxx \
   VITE_EMAILJS_PUBLIC_KEY=your_key \
   npm run build
   ```

2. Deploy the `dist/` folder to GitHub Pages

⚠️ **Security Note**: The public key is meant to be public (it's in your client-side code). Never expose private keys or API secrets.

## Step 6: Test Email Delivery

1. Start your dev server: `npm run dev`
2. Complete a CRA assessment
3. Fill out the lead capture form with test data
4. Click "View report"
5. Check your email (venkata@complira.co) for the notification

### Troubleshooting:

**Email not received?**
- Check EmailJS dashboard → Logs for error messages
- Verify template ID matches in code
- Check spam folder
- Verify Gmail connection has proper permissions
- Test email directly in EmailJS dashboard

**"insufficient authentication scopes" error?**
- Disconnect and reconnect Gmail in EmailJS
- Grant all permissions during OAuth flow
- Use Gmail settings to check app permissions: https://myaccount.google.com/permissions

**"EmailJS public key not configured" error?**
- Make sure `.env` file exists and has `VITE_EMAILJS_PUBLIC_KEY`
- Restart dev server after creating `.env`
- For production, ensure GitHub secrets are set

## Alternative: Fallback to Skip Mode

If EmailJS setup fails, users can still "Skip for now" and see their results without submitting contact info. The email submission is optional.

## Email Rate Limits

**Free Tier**: 200 emails/month
- Sufficient for ~6-7 leads per day
- Upgrade to paid plans for higher volume

## Template Variables Reference

Variables sent from the app:
- `to_email`: Always `venkata@complira.co`
- `from_name`: User's full name
- `from_email`: User's email
- `company`: User's company name
- `role`: User's role (optional)
- `device`: Product/device class (optional)
- `sector`: Selected sector (Healthcare, IoT, etc.)
- `product_type`: Selected architecture (SaMD, Embedded, Cloud, Hybrid)
- `overall_score`: Calculated CRA compliance score (0-100)
- `questions_answered`: "X/22 questions"
- `assessment_date`: Submission date
- `report_link`: URL to view full report
