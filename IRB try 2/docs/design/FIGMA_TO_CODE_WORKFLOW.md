# Figma to Code Workflow Guide
## How to Design in Figma and Get Claude Code to Implement It

---

## 🎯 Quick Workflow

1. **Design in Figma** → 2. **Export/Screenshot** → 3. **Share with Claude** → 4. **Review Implementation**

---

## 📋 Step-by-Step Process

### Step 1: Design in Figma

**Use the existing design system:**
- Location: `docs/design/FIGMA_DESIGN_BRIEF.md`
- Design tokens: `docs/design/design-tokens.json`

**Key things to include in your Figma design:**

1. **Use frames with clear names:**
   - `Dashboard - Desktop`
   - `Studies List - Desktop`
   - `Study Detail - Desktop`
   - `Dashboard - Mobile`

2. **Add annotations/notes in Figma:**
   - "This button should navigate to /studies/new"
   - "Stat card should pull from API endpoint /api/dashboard/stats"
   - "This section scrolls independently"

3. **Use the Mount Sinai color variables:**
   - Already in `design-tokens.json`
   - Import these into Figma as variables

4. **Design all states:**
   - Default state
   - Hover state
   - Active/selected state
   - Loading state
   - Error state
   - Empty state

---

### Step 2: Export Your Designs

**Option A: Screenshots (Recommended for now)**

1. In Figma, select the frame you want to implement
2. Press `Shift + Cmd/Ctrl + E` to export
3. Choose PNG or JPG
4. Save to: `C:\Users\jeffr\OneDrive\Pictures\Screenshots 1\`
5. Use a clear naming convention:
   - `dashboard-desktop-2025-01-23.png`
   - `studies-list-desktop-2025-01-23.png`
   - `study-detail-modal-2025-01-23.png`

**Option B: Figma Link (If you want to share the whole file)**

1. Click "Share" in Figma
2. Set to "Anyone with the link can view"
3. Copy the link
4. Share it with Claude

**Option C: Figma Dev Mode Export (Advanced)**

1. Turn on Dev Mode in Figma (top right)
2. Select component
3. Copy CSS/Tailwind code
4. Share the code with Claude for refinement

---

### Step 3: Share with Claude Code

**Format for sharing:**

```
Claude, I have a new design for [PAGE NAME].

Screenshot: C:\Users\jeffr\OneDrive\Pictures\Screenshots 1\[filename].png

Key features to implement:
- [Feature 1]
- [Feature 2]
- [Feature 3]

This should replace: [current file path or create new]

API endpoints to connect:
- [endpoint 1]
- [endpoint 2]
```

**Example:**

```
Claude, I have a new design for the Studies List page.

Screenshot: C:\Users\jeffr\OneDrive\Pictures\Screenshots 1\studies-list-2025-01-23.png

Key features to implement:
- Grid view with card-based layout
- Search bar at top
- Filter chips for status (Active, Pending, Approved)
- Each card shows: Title, Protocol ID, Status badge, Participant count, Last updated
- "New Study" button in top right

This should replace: app/studies/page.tsx

API endpoints to connect:
- GET /api/studies (for study list)
- POST /api/studies (for new study creation)
```

---

### Step 4: Review & Iterate

**After Claude implements:**

1. **Check the live site** (usually http://localhost:3000)
2. **Test functionality:**
   - Does it match the design?
   - Do all interactions work?
   - Are colors/spacing correct?

3. **Provide feedback:**
   - "The spacing between cards should be larger"
   - "The button should be cyan (#06ABEB) not blue"
   - "Add a hover state to the cards"

4. **Iterate:**
   - Claude will make adjustments
   - Repeat until it matches your vision

---

## 📸 Best Practices for Screenshots

### What Makes a Good Screenshot?

✅ **DO:**
- Show the full screen/frame
- Include annotations in Figma (add text boxes with notes)
- Export at 2x resolution for clarity
- Show different states (hover, active, etc.) in separate screenshots
- Include spacing/measurements (Figma's measurement tool)

❌ **DON'T:**
- Crop important parts of the design
- Share blurry or low-resolution images
- Forget to show mobile versions
- Leave out interactive states

### Annotation Examples in Figma:

Add text boxes in your Figma design with notes like:
- "Card height: 200px"
- "On click: navigate to /studies/[id]"
- "API: GET /api/studies?status=active"
- "Hover: lift shadow, border changes to cyan"
- "Empty state: Show 'No studies found' message"

---

## 🎨 Using the Design System

### Colors (Already in Tailwind)

Your design should use these classes:
- `bg-brand-primary` - Cyan (#06ABEB)
- `bg-brand-accent` - Magenta (#DC298D)
- `bg-brand-heading` - Navy (#212070)
- `text-status-success` - Green
- `text-status-warning` - Orange
- `text-status-error` - Red

### Typography

- Headings: `text-h1`, `text-h2`, `text-h3`, `text-h4`
- Body: `text-body-large`, `text-body`, `text-body-small`
- Labels: `text-caption`, `text-overline`

### Spacing

- Use Tailwind spacing: `p-4`, `p-6`, `p-8`, `gap-4`, `gap-6`
- Already configured to match design tokens

---

## 🔄 Alternative: Figma Inspect Mode

If you want to be more precise:

1. **Turn on Dev Mode** in Figma (top right toggle)
2. **Select any element**
3. **Copy specs:**
   - Click "CSS" or "Tailwind" in the right panel
   - Copy the generated code
4. **Share with Claude:**
   ```
   Claude, here are the Figma specs for the stat card:

   [paste CSS/Tailwind code here]

   Please create a React component with these styles
   ```

---

## 📝 Template: Figma Design Handoff Document

Save this template and fill it out for each design:

```markdown
# Design Handoff: [PAGE/COMPONENT NAME]

## Overview
- **Page/Component:** [name]
- **File to modify:** [path]
- **Figma Screenshot:** [path to screenshot]
- **Priority:** [High/Medium/Low]

## Visual Design
- **Layout:** [Grid, Flexbox, etc.]
- **Colors:** [List specific colors used]
- **Typography:** [Font sizes, weights]
- **Spacing:** [Key spacing values]

## Interactive Elements
- **Buttons:** [What happens on click]
- **Links:** [Navigation targets]
- **Hover states:** [Describe changes]
- **Loading states:** [What shows while loading]

## Data Sources
- **API Endpoints:** [List all endpoints needed]
- **Static Data:** [Any hardcoded content]
- **User Inputs:** [Forms, search, filters]

## Responsive Behavior
- **Desktop:** [Description]
- **Tablet:** [Description]
- **Mobile:** [Description]

## Special Notes
- [Any tricky interactions]
- [Performance considerations]
- [Accessibility requirements]
```

---

## 🚀 Quick Reference Commands

**To share a screenshot with Claude:**
```
& 'C:\Users\jeffr\OneDrive\Pictures\Screenshots 1\[filename].png'
```

**To ask Claude to implement a design:**
```
Claude, implement this Figma design:
[screenshot path]

Replace: [file path]
Key features: [list]
```

**To ask for design adjustments:**
```
Claude, the implementation looks good but:
- Make the buttons bigger
- Change color to cyan
- Add more spacing between cards
```

---

## 💡 Pro Tips

1. **Start with one page/component at a time** - Don't try to redesign the whole app at once

2. **Design mobile and desktop together** - Show both in your screenshots

3. **Include edge cases** - Empty states, loading states, error states

4. **Annotate interactions** - Don't assume Claude knows what should happen on click

5. **Reference existing components** - "This should look like the stat cards on the dashboard"

6. **Test iteratively** - Implement → Test → Adjust → Repeat

7. **Keep design tokens consistent** - Always use the Mount Sinai color palette

---

## 📚 Resources

**In this project:**
- Design Brief: `docs/design/FIGMA_DESIGN_BRIEF.md`
- Design Tokens: `docs/design/design-tokens.json`
- Tailwind Config: `tailwind.config.js`

**External:**
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Figma Dev Mode](https://help.figma.com/hc/en-us/articles/360041542593)

---

## 🎯 Example Workflow (Real)

**What you did that worked:**

1. ✅ Designed dashboard in Figma
2. ✅ Took screenshot: `Screenshot 2025-10-23 055907.png`
3. ✅ Shared with Claude: `& 'c:\Users\jeffr\OneDrive\Pictures\Screenshots 1\Screenshot 2025-10-23 055907.png'`
4. ✅ Claude analyzed and implemented
5. ❌ You decided to revert (which is fine - iteration is part of the process!)

**For next time:**
- Before implementing, we can discuss the changes
- I can show you a preview of the code structure
- You can approve before I make changes
- Or I can create it as a separate file first for you to review

---

**Questions?** Just ask Claude!
