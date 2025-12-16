# CGM Portal Enhancement Plan: Branding, Navigation & User Guide

## Overview

This plan adds user-friendly features including a catchy brand name, navigation tabs, data export instructions, usage guides, and a Signos referral button.

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

## Approval Requested

Please review this plan and confirm:
1. Preferred portal name (or suggest alternative)
2. Any content changes for Learn More / How to Use sections
3. Preferred location for referral button (header only, or also footer?)
4. Approval to proceed with implementation

