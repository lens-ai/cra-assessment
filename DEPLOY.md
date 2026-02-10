# Deploying CRA Assessment to complira.co

## Project Structure

```
cra-deploy/
├── index.html              # Entry point with SEO meta tags
├── package.json            # Dependencies & scripts
├── vite.config.js          # Build config
├── vercel.json             # Vercel deployment config
├── netlify.toml            # Netlify deployment config
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   ├── _headers            # Cloudflare Pages security headers
│   └── _redirects          # Cloudflare Pages SPA routing
├── src/
│   ├── main.jsx            # React entry point
│   └── CraSurvey.jsx       # Full survey component (22 questions)
└── dist/                   # Built output (~85KB gzipped)
```

## Quick Start (Local Development)

```bash
cd cra-deploy
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build
```

---

## Option A: Vercel (Recommended — Fastest)

### Why Vercel
- Free tier handles marketing traffic easily
- Global CDN, auto-SSL, instant deploys
- Best DX for React/Vite projects

### Steps

1. **Push to GitHub**
```bash
cd cra-deploy
git init
git add .
git commit -m "CRA Assessment v3"
git remote add origin git@github.com:YOUR_ORG/cra-assessment.git
git push -u origin main
```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) → New Project
   - Import your GitHub repo
   - Framework Preset: **Vite** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Click **Deploy**

3. **Connect complira.co domain**
   - In Vercel dashboard → Project Settings → Domains
   - Add: `assess.complira.co` (or `cra.complira.co`)
   - Vercel gives you a CNAME record to add:
   
   | Type | Name | Value |
   |------|------|-------|
   | CNAME | assess | cname.vercel-dns.com |

   - Or for root domain (`complira.co`):
   
   | Type | Name | Value |
   |------|------|-------|
   | A | @ | 76.76.21.21 |

4. **Add DNS records at your domain registrar**
   - Go to wherever complira.co is registered (Namecheap, Cloudflare, GoDaddy, etc.)
   - Add the CNAME or A record from step 3
   - SSL certificate is auto-provisioned by Vercel (Let's Encrypt)
   - Propagation: ~5 min to 48 hours

### Environment Variables (for lead capture later)
```bash
# In Vercel dashboard → Settings → Environment Variables
VITE_API_URL=https://api.complira.co
VITE_POSTHOG_KEY=phc_xxxxx        # Analytics
VITE_HUBSPOT_PORTAL_ID=xxxxx      # CRM integration
```

---

## Option B: Cloudflare Pages

### Why Cloudflare Pages
- If complira.co DNS is already on Cloudflare — zero-config domain setup
- Unlimited bandwidth on free tier
- Edge functions for future form handling

### Steps

1. **Push to GitHub** (same as above)

2. **Connect to Cloudflare Pages**
   - Cloudflare Dashboard → Pages → Create a project
   - Connect GitHub repo
   - Build settings:
     - Framework preset: None
     - Build command: `npm run build`
     - Build output directory: `dist`
   - Deploy

3. **Connect domain** (if DNS already on Cloudflare)
   - Pages project → Custom domains → Add `assess.complira.co`
   - Cloudflare auto-configures DNS (no manual records needed)
   - SSL is automatic

4. **If DNS is NOT on Cloudflare**
   - Add CNAME: `assess` → `cra-assessment.pages.dev`
   
   | Type | Name | Value |
   |------|------|-------|
   | CNAME | assess | cra-assessment.pages.dev |

---

## Option C: Netlify

### Steps

1. **Push to GitHub** (same as above)

2. **Connect to Netlify**
   - [netlify.com](https://netlify.com) → Add new site → Import from Git
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Deploy

3. **Connect domain**
   - Site Settings → Domain management → Add custom domain
   - Add: `assess.complira.co`
   - Add DNS record:
   
   | Type | Name | Value |
   |------|------|-------|
   | CNAME | assess | YOUR_SITE.netlify.app |

---

## Domain Strategy for complira.co

### Recommended subdomain: `assess.complira.co`

This keeps the assessment separate from your main marketing site and allows independent deployment.

```
complira.co              → Main marketing site (separate deploy)
assess.complira.co       → CRA Assessment tool (this project)
app.complira.co          → Future: CyDocGen platform
api.complira.co          → Future: Backend APIs
docs.complira.co         → Future: Documentation
```

### If you want it at complira.co/cra-assessment (path, not subdomain)

You'd need to either:
- Host both the marketing site and assessment in the same project
- Use a reverse proxy (Cloudflare Workers, Vercel rewrites, or nginx)

Example Vercel rewrite (in the marketing site's vercel.json):
```json
{
  "rewrites": [
    { "source": "/cra-assessment", "destination": "https://assess.complira.co" },
    { "source": "/cra-assessment/:path*", "destination": "https://assess.complira.co/:path*" }
  ]
}
```

---

## Post-Deploy: Lead Capture Integration

The survey has a lead capture form. To make it functional:

### Option 1: HubSpot (Recommended for sales pipeline)
```jsx
// In CraSurvey.jsx, replace the lead capture submit handler:
const submitLead = async () => {
  await fetch('https://api.hsforms.com/submissions/v3/integration/submit/YOUR_PORTAL_ID/YOUR_FORM_ID', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: [
        { name: 'firstname', value: lead.name },
        { name: 'email', value: lead.email },
        { name: 'company', value: lead.company },
        { name: 'jobtitle', value: lead.role },
      ],
      context: {
        pageUri: window.location.href,
        pageName: 'CRA Assessment',
      },
    }),
  });
};
```

### Option 2: Webhook to your backend
```jsx
const submitLead = async () => {
  await fetch('https://api.complira.co/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...lead,
      scores: qScores,
      overall,
      productType: pt,
      timestamp: new Date().toISOString(),
    }),
  });
};
```

### Option 3: Google Sheets (Quick & dirty)
Use a Google Apps Script web app as an API endpoint.

---

## Post-Deploy: Analytics

### PostHog (Recommended — product analytics)
```bash
npm install posthog-js
```

```jsx
// In main.jsx:
import posthog from 'posthog-js'
posthog.init('phc_YOUR_KEY', { api_host: 'https://us.i.posthog.com' })

// Track funnel events in CraSurvey.jsx:
posthog.capture('assessment_started', { product_type: pt })
posthog.capture('question_answered', { question_id: q.id, section: q.section })
posthog.capture('assessment_completed', { overall_score: overall, gaps: gaps.length })
posthog.capture('lead_captured', { company: lead.company })
posthog.capture('blueprint_cta_clicked')
```

### Google Analytics 4 (if already using GA)
Add to index.html `<head>`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## Post-Deploy: PDF Report Generation

To make the "Download Report (PDF)" button functional:

### Client-side (simplest)
```bash
npm install html2canvas jspdf
```

### Server-side (better quality — use your existing reportlab pipeline)
Send scores to `api.complira.co/report/generate` and return a PDF.

---

## CI/CD: Auto-deploy on Push

All three platforms (Vercel, Netlify, Cloudflare Pages) auto-deploy when you push to main. No additional CI/CD setup needed.

For preview deployments on PRs:
- **Vercel**: Automatic — every PR gets a preview URL
- **Netlify**: Automatic — deploy previews on PRs
- **Cloudflare Pages**: Automatic — preview deployments per branch

---

## Checklist Before Go-Live

- [ ] Build succeeds: `npm run build`
- [ ] Deploy to chosen platform
- [ ] DNS record added for assess.complira.co
- [ ] SSL certificate provisioned (auto on all 3 platforms)
- [ ] Lead capture form connected (HubSpot/webhook)
- [ ] Analytics tracking added (PostHog/GA4)
- [ ] OG image created and uploaded to /public/og-image.png
- [ ] Test on mobile (responsive check)
- [ ] "Schedule Blueprint Session" button linked to Calendly/booking page
- [ ] "Download Report (PDF)" functionality wired up
- [ ] robots.txt and sitemap verified
- [ ] Security headers verified (check headers at securityheaders.com)
