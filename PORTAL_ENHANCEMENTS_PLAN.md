# CGM Portal Enhancement Plan: Branding, Navigation & User Guide

## Overview

This plan adds user-friendly features including a catchy brand name, navigation tabs, data export instructions, usage guides, Signos referral button, **unofficial portal disclaimer**, **Privacy Policy**, and **Terms of Use** pages.

---

## 1. New Portal Name & Branding

### Proposed Name Options:

| Name | Tagline |
|------|---------|
| **Signos Physician Portal** | Share your CGM journey with your healthcare provider |
| **GlucoShare** | Bridge the gap between you and your physician |
| **My CGM Report** | Your Signos data, ready for your doctor |
| **CGM Insights Portal** | From Signos to your physician |

**Recommended:** `Signos Physician Portal` - Clear, direct, and immediately communicates the purpose.

### Updated Header Design:
```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]  Signos Physician Portal                                    │
│          Share your CGM data with your healthcare provider          │
│                                                                      │
│  [Learn More]  [How to Use]  [Get 30% Off Signos]    [Export PDF]  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Navigation Tabs

Add a clean navigation bar with three main tabs/buttons:

### Tab 1: Learn More (Modal/Section)
Opens a modal or expands a section explaining the portal features.

### Tab 2: How to Use (Modal/Section)
Opens guides for patients and physicians.

### Tab 3: Get 30% Off Signos (Button)
Link: `https://refer.signos.com/xtek5h7w`
- Opens in new tab
- Styled as a call-to-action button

---

## 3. Data Export Instructions

### Location: On the Upload Section
Add a help link/expandable section below the upload area.

### Content (Based on Signos Help Center):

**How to Export Your Signos Data:**

1. **Via Mobile App (Recommended)**
   - Open Signos app → Menu → Settings
   - Tap "Export Data" under General
   - Select the "Email" tab
   - Tap "Export Now"
   - You'll receive CSV files via email

2. **Request CSV from Support**
   - Email: support@signos.com
   - Request: "Please send me a CSV export of my raw glucose and activity data"

3. **Required Files:**
   - `glucose_readings.csv` - Your CGM glucose data (required)
   - `activity_logs.csv` - Weight entries (optional, for enhanced insights)

**Link:** [Signos Help: How to Export Data](https://support.signos.com/hc/en-us/articles/26157421018772-How-do-I-export-and-download-my-data)

---

## 4. "Learn More" Content

### Features Section:

```markdown
## What is Signos Physician Portal?

A free, privacy-focused tool that transforms your Signos CGM data into
professional reports for your healthcare provider.

### Key Features:

📊 **AGP Charts (Ambulatory Glucose Profile)**
Industry-standard visualization showing your 24-hour glucose patterns
with percentile bands.

📈 **Weight Loss-Optimized Metrics**
Unlike diabetes-focused CGM reports, we use the tighter 70-110 mg/dL
optimal range that supports metabolic health and weight loss.

📉 **Long-Term Progress Tracking**
See your glucose trends over weeks, months, and quarters with
automatic comparisons.

⚖️ **Weight & Glucose Correlation**
Optional weight tracking shows how your weight loss journey correlates
with glucose improvements.

🩺 **Evidence-Based Health Insights**
- Estimated A1C (GMI) based on CGM data
- Cardiovascular risk indicators
- Disease risk reduction estimates
- Dawn phenomenon detection
- Post-meal spike analysis

🔒 **100% Private**
All data processing happens in your browser. Nothing is uploaded to
any server. Your health data stays on your device.

📄 **PDF Export**
Generate professional PDF reports to share with your physician via
email or patient portal.
```

### Value Proposition:

```markdown
## Why Use This Portal?

### For Patients:
- Show your physician objective data about your metabolic health
- Track progress between appointments
- Understand how your lifestyle affects blood sugar
- Get evidence-based health insights

### For Physicians:
- Receive standardized AGP reports familiar from diabetes care
- See metabolic health context for weight loss patients
- Review trends without Signos app access
- Save time during appointments with pre-analyzed data
```

---

## 5. "How to Use" Guides

### For Patients:

```markdown
## Patient Guide: How to Use Signos Physician Portal

### Step 1: Export Your Data from Signos
1. Open the Signos app on your phone
2. Go to Menu → Settings → Export Data
3. Select "Email" tab and tap "Export Now"
4. Check your email for the data files

### Step 2: Upload Your Data
1. Visit this portal
2. Click "Browse Files" or drag your glucose_readings.csv
3. Wait for the dashboard to load
4. (Optional) Upload activity_logs.csv for weight tracking

### Step 3: Review Your Results
- Check your key metrics at the top
- Review the AGP chart for daily patterns
- Look at long-term progress trends
- If you uploaded weight data, explore health insights

### Step 4: Share with Your Physician
- Click "Export PDF" to generate a report
- Email the PDF to your doctor's office
- Upload to your patient portal
- Bring a printed copy to your appointment

### Tips for Your Appointment:
- Export 2-4 weeks of data before your visit
- Note any patterns you've observed
- Prepare questions about your results
```

### For Physicians:

```markdown
## Physician Guide: Interpreting Signos CGM Reports

### Understanding the Context
This portal is designed for **weight loss patients** using Signos CGM,
not diabetes management. Metrics use tighter targets optimized for
metabolic health.

### Key Metrics Explained:

| Metric | Weight Loss Target | Clinical Significance |
|--------|-------------------|----------------------|
| Avg Glucose | 79-100 mg/dL | Insulin sensitivity indicator |
| CV% | <36% (ideal <18%) | Glycemic stability |
| Time in Range | >70% in 70-110 | Metabolic health |
| Fasting Glucose | 70-99 mg/dL | Morning metabolic function |

### AGP Chart Interpretation
- **Median line**: Typical glucose throughout the day
- **Dark band (25-75th %ile)**: Most common glucose range
- **Light band (10-90th %ile)**: Includes occasional variations
- **Meal response zones**: Look for post-meal peaks

### Health Insights (If Weight Data Included)
- **GMI**: Estimates A1C from CGM mean glucose
  - Formula: 3.31 + 0.02392 × mean glucose (mg/dL)
- **Risk Reduction**: Based on weight loss percentage
  - 16% T2D risk reduction per kg lost (research-based)
- **Dawn Phenomenon**: Early morning glucose rise >20 mg/dL

### Clinical Recommendations Based on Patterns:

| Pattern | Possible Intervention |
|---------|----------------------|
| High fasting glucose | Evening meal timing, protein-rich dinner |
| Large post-meal spikes | Food pairing, meal composition |
| High variability | Consistent meal timing, portion control |
| Dawn phenomenon | Evening exercise, earlier dinner |

### Data Quality Notes:
- 10-14 days minimum for reliable GMI
- More data = more reliable patterns
- Consider patient's context (illness, travel, etc.)
```

---

## 6. Signos Referral Button

### Design:
```
┌────────────────────────────────────────┐
│  🎉 Get 30% Off Signos Membership!    │
│                                        │
│  Start your CGM weight loss journey    │
│                                        │
│  [Get My 30% Discount →]               │
└────────────────────────────────────────┘
```

### Implementation:
- Button in header navigation
- Additional callout in footer
- Links to: `https://refer.signos.com/xtek5h7w`
- Opens in new tab (`target="_blank"`)
- Use referral-friendly color (accent/highlight)

---

## 7. UI Layout Changes

### Updated Header Structure:
```html
<header class="header">
  <div class="header-main">
    <div class="logo">
      [Logo SVG]
      <h1>Signos Physician Portal</h1>
    </div>
    <div class="header-tagline">
      Share your CGM data with your healthcare provider
    </div>
  </div>
  <nav class="header-nav">
    <button class="nav-btn" onclick="openLearnMore()">Learn More</button>
    <button class="nav-btn" onclick="openHowToUse()">How to Use</button>
    <a href="https://refer.signos.com/xtek5h7w" target="_blank" class="nav-btn referral">
      Get 30% Off Signos
    </a>
    <button id="exportPdfBtn" class="btn btn-secondary" disabled>Export PDF</button>
  </nav>
</header>
```

### Modal System for Content:
- "Learn More" and "How to Use" open as modals
- Clean backdrop with centered content
- Close button and click-outside-to-close
- Tab navigation within "How to Use" (Patient | Physician)

---

## 8. Updated Upload Section

Add export instructions below upload area:

```html
<div class="upload-help">
  <button class="help-toggle" onclick="toggleExportHelp()">
    How do I export my Signos data?
  </button>
  <div class="export-instructions" id="exportInstructions">
    <!-- Export steps here -->
    <a href="https://support.signos.com/hc/en-us/articles/26157421018772" target="_blank">
      View Signos Help Article →
    </a>
  </div>
</div>
```

---

## 9. Implementation Checklist

### HTML Changes:
- [ ] Update title and header branding
- [ ] Add navigation bar with three tabs
- [ ] Create "Learn More" modal
- [ ] Create "How to Use" modal with Patient/Physician tabs
- [ ] Add referral button
- [ ] Add export instructions to upload section
- [ ] Update footer with referral mention

### CSS Changes:
- [ ] Style navigation bar
- [ ] Style modal system
- [ ] Style referral button (accent color)
- [ ] Style export instructions toggle
- [ ] Responsive design for modals

### JavaScript Changes:
- [ ] Modal open/close functions
- [ ] Export instructions toggle
- [ ] Tab switching in How to Use modal

---

## 10. Design Principles

1. **Clean & Modern**: Maintain the existing clean aesthetic
2. **Non-Intrusive**: Modals for optional content, not blocking
3. **Mobile-First**: All modals work on mobile
4. **Accessible**: Proper focus management, keyboard navigation
5. **Privacy Focus**: Emphasize local processing throughout

---

## 11. Unofficial Portal Disclaimer

### Prominent Disclaimer Banner
Add a clear disclaimer that this is NOT an official Signos product.

**Location:**
- Subtle banner below header (always visible)
- Repeated in footer
- Included in "Learn More" modal

**Disclaimer Text:**
```
⚠️ This is an independent, community-created tool and is NOT affiliated with,
endorsed by, or officially supported by Signos, Inc. Signos® is a registered
trademark of Signos, Inc. This portal was created by Signos users to help
share CGM data with healthcare providers.
```

**Styling:**
- Subtle background (light yellow/amber or light gray)
- Small font size, non-intrusive but visible
- Icon to draw attention

---

## 12. Privacy Policy Page (`privacy.html`)

### Content:

```markdown
# Privacy Policy

**Last Updated:** [Current Date]

## About This Portal

Signos Physician Portal is an independent, community-created tool that is NOT
affiliated with, endorsed by, or officially supported by Signos, Inc.

## Data Collection & Processing

### What We DO NOT Collect:
- We do NOT collect, store, transmit, or have access to any of your data
- We do NOT use cookies for tracking
- We do NOT use analytics services
- We do NOT have servers that receive your health information

### How Your Data is Processed:
- **100% Client-Side Processing**: All data analysis happens entirely within
  your web browser
- **No Upload**: Your CSV files are never uploaded to any server
- **No Storage**: Your data is not stored anywhere - it exists only in your
  browser's memory while you use the portal
- **Session Only**: When you close or refresh the page, all data is cleared

### Technical Details:
- JavaScript processes your files locally using the File API
- Charts and calculations are generated in your browser
- PDF exports are created client-side using html2pdf.js
- No network requests are made with your health data

## Third-Party Services

### What We Use:
- **Chart.js** (charts) - No data sent to Chart.js servers
- **PapaParse** (CSV parsing) - No data sent externally
- **html2pdf.js** (PDF generation) - No data sent externally
- **GitHub Pages** (hosting) - Only serves static files, no data collection

### External Links:
This portal contains links to:
- Signos Help Center (support.signos.com)
- Signos referral program (refer.signos.com)

These external sites have their own privacy policies.

## Your Rights

Since we don't collect any data:
- There is no data to request, modify, or delete
- You have complete control - your data stays on your device

## Children's Privacy

This portal is intended for adults managing their health data. We do not
knowingly process data from children under 13.

## Changes to This Policy

We may update this Privacy Policy. Changes will be reflected in the
"Last Updated" date.

## Contact

For questions about this privacy policy, please open an issue on our
GitHub repository.

---

**Remember:** This is NOT an official Signos product. For Signos's privacy
practices, please visit [signos.com/privacy](https://www.signos.com/privacy).
```

---

## 13. Terms of Use Page (`terms.html`)

### Content:

```markdown
# Terms of Use

**Last Updated:** [Current Date]

## Acceptance of Terms

By accessing and using Signos Physician Portal ("the Portal"), you agree
to these Terms of Use.

## About This Portal

### Independent Project
This Portal is an **independent, community-created tool**. It is:
- NOT affiliated with Signos, Inc.
- NOT endorsed by Signos, Inc.
- NOT officially supported by Signos, Inc.

Signos® is a registered trademark of Signos, Inc.

### Purpose
This Portal is designed to help Signos users visualize their CGM data and
share it with healthcare providers. It is provided free of charge as a
community resource.

## Disclaimer of Warranties

THE PORTAL IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
- Accuracy of calculations or visualizations
- Fitness for a particular purpose
- Non-infringement
- Reliability or availability

## Medical Disclaimer

### NOT Medical Advice
The Portal and its outputs are for **informational purposes only** and do
NOT constitute:
- Medical advice
- Diagnosis
- Treatment recommendations
- A substitute for professional medical care

### Consult Your Healthcare Provider
- Always consult qualified healthcare professionals for medical decisions
- Do not rely solely on Portal outputs for health decisions
- CGM data interpretation requires clinical context
- Health insights shown are educational estimates, not diagnoses

### Evidence-Based but Not Personalized
Health metrics and risk estimates are based on population-level research
and may not apply to your individual situation. Factors such as genetics,
medications, and other health conditions affect individual outcomes.

## Limitation of Liability

### No Liability for:
- Health decisions made based on Portal outputs
- Inaccuracies in data visualization or calculations
- Technical errors or service interruptions
- Data loss (though no data is stored)
- Any damages arising from use of the Portal

### Maximum Liability
To the fullest extent permitted by law, the creators and maintainers of
this Portal shall not be liable for any indirect, incidental, special,
consequential, or punitive damages.

## User Responsibilities

By using the Portal, you agree to:
- Use it only for lawful purposes
- Not attempt to reverse engineer or exploit the Portal
- Not misrepresent Portal outputs as official Signos reports
- Understand that you are responsible for your health decisions

## Intellectual Property

### Portal Code
The Portal source code is available on GitHub under applicable open source
licenses.

### Trademarks
- Signos® is a trademark of Signos, Inc.
- Use of the Signos name is for descriptive purposes only
- This Portal does not claim any affiliation with Signos, Inc.

## Third-Party Links

The Portal contains links to third-party websites (Signos, referral
programs). We are not responsible for the content or practices of these
external sites.

## Modifications

We reserve the right to modify these Terms at any time. Continued use of
the Portal after changes constitutes acceptance of new Terms.

## Governing Law

These Terms shall be governed by applicable laws. Any disputes shall be
resolved in appropriate courts of jurisdiction.

## Severability

If any provision of these Terms is found unenforceable, the remaining
provisions will continue in effect.

## Contact

For questions about these Terms, please open an issue on our GitHub
repository.

---

**Remember:** This is NOT an official Signos product. For Signos's terms
of service, please visit [signos.com/terms](https://www.signos.com/terms).
```

---

## 14. Updated Footer Design

### New Footer Structure:
```html
<footer class="footer">
  <!-- Unofficial Disclaimer -->
  <div class="footer-disclaimer">
    <p>
      <strong>⚠️ Unofficial Tool:</strong> This portal is an independent,
      community-created project and is NOT affiliated with, endorsed by,
      or officially supported by Signos, Inc.
    </p>
  </div>

  <!-- Main Footer Content -->
  <div class="footer-content">
    <div class="footer-main">
      <p>Signos Physician Portal | Data processed locally - No information sent to servers</p>
      <p class="medical-disclaimer">
        This tool is for informational purposes only. CGM data should be
        interpreted in consultation with a healthcare provider.
      </p>
    </div>

    <!-- Legal Links -->
    <div class="footer-legal">
      <a href="privacy.html" target="_blank">Privacy Policy</a>
      <span class="separator">|</span>
      <a href="terms.html" target="_blank">Terms of Use</a>
    </div>

    <!-- Referral -->
    <div class="footer-referral">
      <a href="https://refer.signos.com/xtek5h7w" target="_blank" class="referral-link">
        New to Signos? Get 30% Off →
      </a>
    </div>
  </div>

  <!-- Copyright -->
  <div class="footer-copyright">
    <p>Signos® is a registered trademark of Signos, Inc.</p>
  </div>
</footer>
```

---

## 15. Updated Implementation Checklist

### HTML Changes:
- [ ] Update title and header branding
- [ ] Add unofficial disclaimer banner below header
- [ ] Add navigation bar with three tabs
- [ ] Create "Learn More" modal
- [ ] Create "How to Use" modal with Patient/Physician tabs
- [ ] Add referral button
- [ ] Add export instructions to upload section
- [ ] Update footer with disclaimer, legal links, and referral
- [ ] **Create `privacy.html` page**
- [ ] **Create `terms.html` page**

### CSS Changes:
- [ ] Style navigation bar
- [ ] Style modal system
- [ ] Style referral button (accent color)
- [ ] Style export instructions toggle
- [ ] Style disclaimer banner
- [ ] Style footer sections
- [ ] **Style legal pages (privacy.html, terms.html)**
- [ ] Responsive design for all new elements

### JavaScript Changes:
- [ ] Modal open/close functions
- [ ] Export instructions toggle
- [ ] Tab switching in How to Use modal

---

## Approval Requested

Please review this plan and confirm:
1. Preferred portal name (or suggest alternative)
2. Any content changes for Learn More / How to Use sections
3. Preferred location for referral button (header only, or also footer?)
4. Approval to proceed with implementation

