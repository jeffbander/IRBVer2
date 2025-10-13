# Design Tokens & Logo Guide

## ✅ Design Tokens Created

I've created two design token files for you:

### 1. `design-tokens.json`
**Standard Design Tokens Format** - Can be imported into:
- Figma (using Figma Tokens plugin or Variables API)
- Style Dictionary
- Tokens Studio
- Any design token tool

**Contains:**
- ✅ Mount Sinai brand colors (#06ABEB, #DC298D, #212070, #00002D)
- ✅ Status colors (success, warning, error, info)
- ✅ Semantic status badges (draft, pending, approved, active, rejected)
- ✅ Complete gray scale
- ✅ Typography scale (Inter font)
- ✅ Spacing system (4px base unit)
- ✅ Border radius values
- ✅ Shadow elevation system
- ✅ Component sizes

### 2. `tailwind-tokens.js`
**Tailwind CSS Configuration** - Ready to integrate into your Next.js app

**Usage:**
```javascript
// In your tailwind.config.js
const mountSinaiTokens = require('./tailwind-tokens');

module.exports = {
  ...mountSinaiTokens,
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // ... rest of your config
};
```

---

## 🎨 How to Import Tokens into Figma

### Option 1: Using Figma Variables (Recommended)

1. Open your Figma file
2. Go to **Local variables** (top-right icon or keyboard shortcut)
3. Click **Import/Export** → **Import variables**
4. Select `design-tokens.json`
5. Figma will create variable collections automatically

### Option 2: Using Figma Tokens Plugin

1. Install **Figma Tokens** plugin from Figma Community
2. Open the plugin in your file
3. Click **Import** → Choose `design-tokens.json`
4. Apply tokens to your design system

### Option 3: Manual Setup

Create these variable collections in Figma:

**Colors Collection:**
- brand.primary: #06ABEB
- brand.accent: #DC298D
- brand.heading: #212070
- brand.navy: #00002D
- [... all other colors from tokens]

**Typography Collection:**
- fontSize.h1: 36px
- lineHeight.h1: 44px
- fontWeight.bold: 700
- [... all other type values]

**Spacing Collection:**
- space.1: 4px
- space.2: 8px
- [... up to space.16]

---

## 🏥 Mount Sinai Logo

### Official Logo Access

**Mount Sinai Brand Center:** https://www.mountsinaibrandcenter.org/
- Requires Mount Sinai employee login or external password
- Contains official, high-resolution logos
- Includes complete brand guidelines

### Logo Sources (Public)

**Wikipedia Commons (Free, Public Domain):**
- URL: https://commons.wikimedia.org/wiki/File:Mount_Sinai_Health_System_logo.svg
- Format: SVG (vector, scalable)
- License: Public domain or fair use
- Download: Click "Original file" link

**Third-Party Logo Resources:**
- Brandfetch: https://brandfetch.com/mountsinaihealth.org
- SeekLogo: https://seeklogo.com/vector-logo/488327/mount-sinai-health
- Logotyp.us: https://logotyp.us/logo/mount-sinai/

### Logo Specifications (from Brand Guidelines)

**Design:**
- Intersecting lines in cyan (#06ABEB) and magenta (#DC298D)
- Lines overlap to create violet
- Represents forward momentum and integration

**Usage:**
- Header: 40-48px height
- Clear space: minimum 2× logo height around all sides
- Background: Use full-color version on light backgrounds
- Never stretch, rotate, or distort
- Never use on busy backgrounds

### Logo Placeholder (If Official Not Available)

Create a simple SVG placeholder in Figma:

```svg
<svg width="120" height="40" viewBox="0 0 120 40" fill="none">
  <!-- Cyan line -->
  <path d="M10 10 L50 30" stroke="#06ABEB" stroke-width="4"/>
  <!-- Magenta line -->
  <path d="M50 10 L10 30" stroke="#DC298D" stroke-width="4"/>
  <!-- Text -->
  <text x="60" y="25" font-family="Inter" font-size="16" font-weight="700" fill="#212070">
    MOUNT SINAI
  </text>
</svg>
```

Or use text-only in the interim:
- Font: Inter Bold, 18-24px
- Color: #212070 (St. Patrick's Blue)
- Text: "MOUNT SINAI IRB"

---

## 🚀 Quick Start for Figma

### Step 1: Create New Figma File
1. File → New design file
2. Name: "Mount Sinai IRB - Design System"

### Step 2: Import Tokens
1. Import `design-tokens.json` as variables (see instructions above)

### Step 3: Set Up Pages
Create these pages:
- 00 Cover
- 01 Design System
- 02 Components
- 03 Screens - Desktop
- 04 Screens - Mobile
- 05 Prototypes

### Step 4: Create Base Components
Use the imported variables to create:
- Buttons (Primary, Secondary, Tertiary)
- Form inputs (Text, Select, Checkbox, Radio)
- Cards (Standard, Stat, Protocol)
- Badges (Status indicators)
- Navigation (Top bar, Sidebar)
- Modals & Dialogs

### Step 5: Build Key Screens
Priority screens:
1. Dashboard (role-based)
2. Studies List
3. Study Detail
4. Review Queue
5. Protocol Review Interface

---

## 📊 Token Usage Examples

### In Figma (After Importing Variables)

**Button:**
- Fill: `color/brand/primary`
- Corner radius: `radius/md`
- Padding: `space/3` (vertical) × `space/6` (horizontal)
- Text: `typography/fontSize/body` + `fontWeight/semibold`

**Card:**
- Fill: `color/background/primary`
- Stroke: `color/border/default` (1px)
- Corner radius: `radius/lg`
- Padding: `space/6`
- Shadow: `shadows/md`

**Status Badge:**
- Fill: `color/semantic/approved-bg`
- Text color: `color/semantic/approved-text`
- Corner radius: `radius/full`
- Padding: `space/1` × `space/3`
- Text: `typography/fontSize/caption` + `fontWeight/semibold`

### In Code (Using Tailwind)

```tsx
// Button
<button className="bg-brand-primary hover:bg-brand-primary-hover text-white
                   rounded-md px-6 py-3 font-semibold shadow-md">
  Submit Protocol
</button>

// Card
<div className="bg-white border border-gray-200 rounded-lg p-6 shadow-md">
  {/* content */}
</div>

// Status Badge
<span className="bg-semantic-approved-bg text-semantic-approved-text
                 rounded-full px-3 py-1 text-caption font-semibold">
  Approved
</span>
```

---

## 🎯 Design System Checklist

- ✅ Colors defined (brand, status, semantic)
- ✅ Typography scale (Inter font, 10 sizes)
- ✅ Spacing system (4px base, 10 increments)
- ✅ Border radius (5 sizes)
- ✅ Shadows (6 elevations)
- ✅ Component sizes standardized
- ⏳ Logo obtained (see sources above)
- ⏳ Components built in Figma
- ⏳ Key screens designed
- ⏳ Prototype created
- ⏳ Accessibility tested (WCAG 2.1 AA)

---

## 📞 Support

**For official Mount Sinai assets:**
- Email: marketing@mountsinai.org
- Brand Center: https://www.mountsinaibrandcenter.org/
- Request external access if needed

**For token/design questions:**
- Refer to `FIGMA_DESIGN_BRIEF.md` for complete specifications
- Check component library specifications in the brief
- Review accessibility requirements (WCAG 2.1 AA)

---

## 🔗 Related Files

- `FIGMA_DESIGN_BRIEF.md` - Complete design specifications
- `design-tokens.json` - Design tokens (Figma/Tokens Studio)
- `tailwind-tokens.js` - Tailwind CSS config
- `tailwind.config.js` - Main Tailwind config (integrate tokens here)

---

**Created:** October 2025
**Version:** 1.0.0
**System:** Mount Sinai IRB Management System
