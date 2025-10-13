# Figma Setup Checklist - Do This Now

## ✅ Step-by-Step Setup (10 minutes)

### Step 1: Create Figma File (2 min)
1. Go to https://figma.com
2. Click **New design file**
3. Name it: **"Mount Sinai IRB - Design System 2025"**

### Step 2: Import Design Tokens (3 min)
1. In your new file, click the **Variables icon** (top-right toolbar)
   - Or use shortcut: **Shift + Ctrl/Cmd + K**
2. Click **Create collection**
3. Click the **••• menu** → **Import/Export** → **Import variables**
4. Navigate to: `C:\Users\jeffr\IRB try 2\design-tokens.json`
5. Click **Import**
6. Figma will auto-create all color, spacing, and typography variables ✅

### Step 3: Download Mount Sinai Logo (1 min)
1. Go to: https://upload.wikimedia.org/wikipedia/commons/f/fa/Mount_Sinai_Health_System_logo.svg
2. Right-click → **Save As**
3. Save to: `C:\Users\jeffr\IRB try 2\mount-sinai-logo.svg`
4. In Figma: **File** → **Place image** → Select the SVG
5. Resize to 40-48px height for header

### Step 4: Set Up Pages (2 min)
Create these pages (click **+** next to "Page 1"):
1. **00 Cover** - Title page with project info
2. **01 Design System** - Colors, typography, spacing reference
3. **02 Components** - Reusable UI components
4. **03 Dashboard** - Main dashboard screen
5. **04 Studies** - Studies list and detail views
6. **05 Review Queue** - Reviewer interface
7. **06 Mobile** - Mobile responsive versions

### Step 5: Install Key Plugins (2 min)
Press **Shift + I** to open Resources, search and install:
1. **"Figma to Code"** - Export React/Tailwind
2. **"Iconify"** - Access to icon libraries
3. **"Stark"** - Accessibility contrast checker
4. **"Content Reel"** - Generate realistic content

---

## 🎯 What to Design First (Priority Order)

### Priority 1: Core Components (Start Here)
Design these in **02 Components** page:

**Buttons:**
- [ ] Primary button (use color variable: `brand.primary`)
- [ ] Secondary button
- [ ] Create variants: default, hover, active, disabled

**Cards:**
- [ ] Standard card (white, border, shadow)
- [ ] Stat card (gradient background with large number)
- [ ] Protocol card (status badge, metadata)

**Form Inputs:**
- [ ] Text input (with label, focus state, error state)
- [ ] Select dropdown
- [ ] Checkbox and Radio

**Status Badges:**
- [ ] Draft (gray)
- [ ] Pending Review (amber)
- [ ] Approved (green)
- [ ] Active (blue)
- [ ] Rejected (red)

**Navigation:**
- [ ] Top nav bar (64px height, logo, nav items)
- [ ] Sidebar nav (280px width when expanded)

### Priority 2: Key Screens
Design these in **03 Dashboard**, **04 Studies**, etc.:

1. **Dashboard** (Most important)
   - 4 stat cards at top
   - Quick actions panel
   - Recent activity list
   - Navigation

2. **Studies List**
   - Search bar
   - Filter chips
   - Grid of protocol cards
   - Action buttons

3. **Study Detail**
   - Header with title, status badge
   - Tabs: Overview, Documents, Participants
   - Content area

4. **Review Queue**
   - Prioritized list
   - Deadline indicators
   - Assign buttons

### Priority 3: Mobile Views
Create mobile versions (320px-375px width) of:
- Dashboard
- Studies list
- Document upload

---

## 🎨 Design Tips

### Use Variables Everywhere
Instead of typing hex codes, use variables:
- Colors: `brand.primary`, `status.success`, `gray.50`
- Spacing: `space.4` (16px), `space.6` (24px)
- Radius: `radius.md` (8px), `radius.lg` (12px)

### Auto Layout is Your Friend
Every frame should use **Auto Layout** (Shift + A):
- Makes components responsive
- Translates directly to CSS Flexbox
- Easy to adjust spacing

### Naming Convention
Name layers clearly:
```
Button/Primary/Default
Button/Primary/Hover
Card/Protocol/Active
Input/Text/Focus
Badge/Status/Approved
```

### Component Variants
Use Figma variants for states:
- Button: Primary, Secondary, Tertiary
- State: Default, Hover, Active, Disabled, Loading

---

## 📤 When You're Ready to Share

### Option A: Share Live Link (Best)
1. Click **Share** button (top-right)
2. Change to: **"Anyone with the link can view"**
3. Copy the link
4. Paste it here in our chat
5. I'll access it and start coding immediately

### Option B: Export Specific Screens
If you want to share incrementally:
1. Select a frame (e.g., Dashboard)
2. Right-click → **Copy/Paste as** → **Copy link to selection**
3. Share that link for just that screen

---

## 🚀 My Part (What I'll Do)

Once you share the Figma link:

1. **Inspect your designs** using Dev Mode
2. **Extract exact specs**:
   - Colors (already have as variables)
   - Spacing, sizing, typography
   - Component structure
3. **Generate React components** in Next.js:
   - Match your design pixel-perfect
   - Use Tailwind with our token system
   - Add interactions and states
4. **Connect to backend**:
   - Hook up to existing database
   - Integrate with Aigents API
   - Add authentication
5. **Show you the live result** at:
   - Local: http://localhost:3009
   - Public: https://providerloop.ngrok.app

---

## 📋 Quick Reference

**Figma File Location:**
- You're designing in Figma (cloud)
- I'll code in: `C:\Users\jeffr\IRB try 2\`

**Design Token Variables (Use These):**
```
Colors:
- brand.primary (#06ABEB)
- brand.accent (#DC298D)
- brand.heading (#212070)
- status.success (#10B981)
- status.warning (#F59E0B)
- status.error (#EF4444)

Spacing:
- space.1 (4px)
- space.2 (8px)
- space.4 (16px)
- space.6 (24px)
- space.8 (32px)

Typography:
- fontSize.h1 (36px)
- fontSize.body (16px)
- fontWeight.semibold (600)
- fontWeight.bold (700)
```

**Component Specs (From Design Brief):**
- Button height: 44px
- Input height: 44px
- Card padding: 24px
- Card border-radius: 12px
- Badge border-radius: full (pill)
- Touch target minimum: 44×44px

---

## ⏱️ Timeline

**Today (You):**
- [ ] Set up Figma file (10 min)
- [ ] Import tokens (done)
- [ ] Add logo (done)
- [ ] Create 3-5 core components (1-2 hours)

**Tomorrow (You):**
- [ ] Design Dashboard screen (2-3 hours)
- [ ] Design Studies List (1-2 hours)
- [ ] Share Figma link with me

**Tomorrow (Me):**
- [ ] Generate React components from your designs
- [ ] Integrate with existing codebase
- [ ] Show you the live coded version

**This Week:**
- [ ] Iterate: design → code → feedback → refine
- [ ] Complete all priority screens
- [ ] Test on mobile
- [ ] Deploy

---

## 🆘 Need Help?

**Stuck on something?**
- Share a screenshot
- Ask me questions
- I can provide more specific component examples

**Want to see an example component?**
- I can create a reference Figma file
- Or code a component first and you match it in design

**Not sure about a design decision?**
- Refer to `FIGMA_DESIGN_BRIEF.md`
- Check healthcare design patterns
- I can provide recommendations

---

## ✅ Start Now!

1. Open Figma
2. Create new file
3. Import `design-tokens.json`
4. Start with buttons and cards
5. Share link when you have 2-3 components done

**I'll be ready to code as soon as you share the link!** 🚀

---

**File Locations:**
- Design Tokens: `C:\Users\jeffr\IRB try 2\design-tokens.json`
- Logo: Download from Wikipedia link above
- Design Brief: `C:\Users\jeffr\IRB try 2\FIGMA_DESIGN_BRIEF.md`
