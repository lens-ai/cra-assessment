# Client Email Template

This is the email template that clients receive when they check "Email me a copy of my results".

## Template Details

**Template ID:** `template_client_results` (or your custom name)

**Purpose:** Send assessment results directly to the client with their compliance score and report link

**Variables Used:**
- `{{to_email}}` - Client's email address
- `{{to_name}}` - Client's name
- `{{company}}` - Client's company
- `{{sector}}` - Selected sector
- `{{product_type}}` - Selected product architecture
- `{{overall_score}}` - Compliance score (0-100)
- `{{questions_answered}}` - "X/22 questions"
- `{{assessment_date}}` - Submission date
- `{{report_link}}` - Permanent shareable link

---

## Email Template

### Subject:
```
Your CRA Compliance Assessment Results - {{overall_score}}% Ready
```

### Body (HTML):
```html
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #161d2e;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #3d5af1 0%, #2d46d9 100%); padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">
      Your CRA Readiness Report
    </h1>
    <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">
      EU Cyber Resilience Act Compliance Assessment
    </p>
  </div>

  <!-- Main Content -->
  <div style="padding: 32px 24px;">

    <p style="font-size: 16px; line-height: 1.6; color: #161d2e; margin: 0 0 24px 0;">
      Hi {{to_name}},
    </p>

    <p style="font-size: 15px; line-height: 1.6; color: #4a5568; margin: 0 0 24px 0;">
      Thank you for completing the CRA compliance assessment for <strong>{{company}}</strong>.
      Your assessment results are ready.
    </p>

    <!-- Score Card -->
    <div style="background: #f5f6f8; border-left: 4px solid #3d5af1; padding: 20px; border-radius: 8px; margin: 0 0 24px 0;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="background: #3d5af1; color: #ffffff; font-size: 32px; font-weight: 700; padding: 16px 20px; border-radius: 8px; min-width: 80px; text-align: center;">
          {{overall_score}}%
        </div>
        <div style="flex: 1;">
          <div style="font-size: 18px; font-weight: 600; color: #161d2e; margin: 0 0 4px 0;">
            Overall Compliance Score
          </div>
          <div style="font-size: 13px; color: #7d8a9e;">
            Based on {{questions_answered}} completed
          </div>
        </div>
      </div>
    </div>

    <!-- Assessment Details -->
    <div style="background: #fafbfc; border: 1px solid #e3e6ec; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
      <h3 style="font-size: 14px; font-weight: 600; color: #7d8a9e; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 16px 0;">
        Assessment Details
      </h3>
      <table style="width: 100%; font-size: 14px; line-height: 1.8;">
        <tr>
          <td style="color: #7d8a9e; padding: 4px 0;">Sector:</td>
          <td style="color: #161d2e; font-weight: 600; padding: 4px 0;">{{sector}}</td>
        </tr>
        <tr>
          <td style="color: #7d8a9e; padding: 4px 0;">Product Type:</td>
          <td style="color: #161d2e; font-weight: 600; padding: 4px 0;">{{product_type}}</td>
        </tr>
        <tr>
          <td style="color: #7d8a9e; padding: 4px 0;">Assessment Date:</td>
          <td style="color: #161d2e; font-weight: 600; padding: 4px 0;">{{assessment_date}}</td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="{{report_link}}" style="display: inline-block; background: #3d5af1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(61, 90, 241, 0.25);">
        View Full Report →
      </a>
    </div>

    <!-- What's Included -->
    <div style="margin: 32px 0 0 0;">
      <h3 style="font-size: 16px; font-weight: 600; color: #161d2e; margin: 0 0 16px 0;">
        Your report includes:
      </h3>
      <ul style="margin: 0; padding: 0 0 0 20px; color: #4a5568; font-size: 14px; line-height: 2;">
        <li>✅ Section-by-section compliance breakdown (Risk & Design, Product Security, Operational, Vulnerability Management, Documentation)</li>
        <li>📊 CRA Annex I clause coverage heatmap (23 essential requirements)</li>
        <li>🎯 Priority gaps and actionable recommendations</li>
        <li>🏭 Sector-specific compliance insights</li>
        <li>📋 Regulatory alignment analysis</li>
        <li>🔗 Shareable permanent link (bookmark this email!)</li>
      </ul>
    </div>

    <!-- Timeline Info -->
    <div style="background: #fef7eb; border-left: 4px solid #c07d18; padding: 16px; border-radius: 8px; margin: 32px 0 0 0;">
      <div style="font-size: 12px; font-weight: 600; color: #c07d18; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">
        ⏰ Important Deadlines
      </div>
      <div style="font-size: 13px; color: #4a5568; line-height: 1.6;">
        <strong>September 2026:</strong> Vulnerability disclosure & ENISA reporting obligations<br>
        <strong>December 2027:</strong> Full CRA compliance required for EU market access
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div style="background: #f5f6f8; padding: 24px; text-align: center; border-top: 1px solid #e3e6ec;">
    <p style="font-size: 12px; color: #7d8a9e; margin: 0 0 8px 0;">
      This assessment was generated by <strong>Complira CRA Assessment Tool</strong>
    </p>
    <p style="font-size: 11px; color: #adb5c4; margin: 0;">
      Need help with CRA compliance? Contact us at <a href="mailto:venkata@complira.co" style="color: #3d5af1; text-decoration: none;">venkata@complira.co</a>
    </p>
  </div>

</div>
```

---

## Setup Instructions

### 1. Create Template in EmailJS

1. Go to https://dashboard.emailjs.com/admin/templates
2. Click **Create New Template**
3. **Template Name:** `CRA Client Results`
4. **Template ID:** `template_client_results` (or customize)

### 2. Set Template Content

- **To Email:** `{{to_email}}`
- **From Name:** `Complira CRA Assessment`
- **Reply To:** `venkata@complira.co`
- **Subject:** `Your CRA Compliance Assessment Results - {{overall_score}}% Ready`
- **Content:** Paste the HTML body from above

### 3. Test Template

Use EmailJS "Test" feature with sample data:
```json
{
  "to_email": "test@example.com",
  "to_name": "Jane Smith",
  "company": "MedDevice Inc.",
  "sector": "Healthcare / MedTech",
  "product_type": "Pure Software (SaMD)",
  "overall_score": "67",
  "questions_answered": "18/22",
  "assessment_date": "February 12, 2026",
  "report_link": "https://yoursite.com/?report=abc123"
}
```

### 4. Add to Environment Variables

**Local (.env):**
```bash
VITE_EMAILJS_CLIENT_TEMPLATE_ID=template_client_results
```

**GitHub Secrets:**
```bash
gh secret set VITE_EMAILJS_CLIENT_TEMPLATE_ID --body "template_client_results"
```

---

## Comparison: Admin vs Client Emails

| Feature | Admin Email (Lead Notification) | Client Email (Results) |
|---------|--------------------------------|------------------------|
| **To** | venkata@complira.co | Client's email |
| **Purpose** | New lead notification | Client's assessment results |
| **Contains** | Contact info + summary | Full results summary + CTA |
| **Tone** | Business/notification | Helpful/educational |
| **CTA** | View report to follow up | View full detailed report |
| **Variables** | from_name, from_email, company, role, device | to_name, to_email, company |

---

## Email Sending Logic

**When form is submitted:**

1. **If checkbox is checked** (default):
   - ✅ Send admin notification to venkata@complira.co
   - ✅ Send results email to client

2. **If checkbox is unchecked**:
   - ✅ Send admin notification to venkata@complira.co only

Both emails include the permanent shareable report link saved in Firebase.

---

## Tips for Better Deliverability

1. **Use a custom domain** (not @gmail.com) for "From" address in EmailJS settings
2. **Set up SPF/DKIM records** if using custom domain
3. **Test spam scores** at https://www.mail-tester.com/
4. **Keep content text/HTML balanced** (current template is HTML-focused)
5. **Add plain text version** in EmailJS template settings

---

## Customization Ideas

**Personalize based on score:**
- Score < 40%: "Let's work together to improve your compliance"
- Score 40-70%: "You're on the right track"
- Score > 70%: "Great job! You're CRA-ready"

**Add sector-specific tips:**
- Healthcare: Link to FDA 524B guidance
- IoT: Link to RED compliance resources
- Industrial: Link to IEC 62443 standards

**Include next steps:**
- Book a consultation call
- Download CRA compliance checklist
- Access sector-specific resources

---

## Preview

The client will receive an email that looks professional, branded, and includes:
- Clear overall score with visual emphasis
- Assessment details in an organized table
- Prominent "View Full Report" button
- What's included list
- Important CRA deadlines
- Contact information for follow-up

The permanent report link ensures they can always access their full results, even if they delete the email.
