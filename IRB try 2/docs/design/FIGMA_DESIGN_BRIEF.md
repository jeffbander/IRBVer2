# COMPREHENSIVE FIGMA DESIGN PROMPT
## IRB Management System Redesign for Mount Sinai Health System

---

## 1. BRAND GUIDELINES & VISUAL IDENTITY

### Mount Sinai Brand Colors

**Primary Palette:**
- **Vivid Cerulean (Primary Blue)**: #06ABEB | RGB(6, 171, 235) | PMS 2995 C
  - Use for: Primary CTAs, interactive elements, active states, links
  - Represents: Innovation, trust, healthcare professionalism

- **Barbie Pink (Accent Magenta)**: #DC298D | RGB(220, 41, 141) | PMS PINK C
  - Use for: Secondary CTAs, highlights, important notifications, status indicators
  - Represents: Energy, forward momentum, urgency

- **St. Patrick's Blue (Dark Blue)**: #212070 | RGB(33, 32, 112) | PMS 2372 C
  - Use for: Headers, navigation, primary text, authority elements
  - Represents: Stability, trust, medical authority

- **Cetacean Blue (Navy)**: #00002D | RGB(0, 0, 45) | PMS 296 C
  - Use for: Text, footer, high-contrast elements
  - Represents: Depth, seriousness, medical professionalism

**Current Implementation Colors (to be replaced):**
- Current: #003F6C (Mount Sinai Blue) and #2E8B57 (Mount Sinai Green)
- Replace with official brand palette above

**Secondary/Support Palette:**
- **Success Green**: #10B981 (for approvals, completed statuses)
- **Warning Amber**: #F59E0B (for pending reviews, cautions)
- **Error Red**: #EF4444 (for rejections, critical alerts)
- **Neutral Grays**:
  - Gray 50: #F9FAFB (backgrounds)
  - Gray 100: #F3F4F6 (secondary backgrounds)
  - Gray 200: #E5E7EB (borders)
  - Gray 400: #9CA3AF (disabled states)
  - Gray 600: #4B5563 (secondary text)
  - Gray 800: #1F2937 (primary text)
  - Gray 900: #111827 (headings)

### Logo Usage
- Mount Sinai logo features intersecting lines in cyan and magenta that overlap to create violet
- Visual identity communicates forward momentum and integration
- Logo should appear in header at 40-48px height
- Maintain clear space around logo (minimum 2x logo height)
- Use full-color version on light backgrounds
- Access official assets from Mount Sinai Brand Center

### Typography System

**Primary Font Family: Inter** (System fallbacks: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)

**Type Scale:**
- **Display Large**: 60px / 72px line-height, Weight 700, for marketing pages
- **Heading 1**: 36px / 44px, Weight 700, for page titles
- **Heading 2**: 30px / 38px, Weight 600, for section headers
- **Heading 3**: 24px / 32px, Weight 600, for subsections
- **Heading 4**: 20px / 28px, Weight 600, for card headers
- **Body Large**: 18px / 28px, Weight 400, for intro paragraphs
- **Body Regular**: 16px / 24px, Weight 400, for primary text
- **Body Small**: 14px / 20px, Weight 400, for secondary text
- **Caption**: 12px / 16px, Weight 500, for labels, badges
- **Overline**: 11px / 16px, Weight 600, uppercase, tracking 0.5px, for category labels

**Font Weights:**
- Regular: 400 (body text)
- Medium: 500 (emphasis, labels)
- Semibold: 600 (subheadings, buttons)
- Bold: 700 (headings, primary CTAs)

### Design Principles for Healthcare

1. **Trust Through Clarity**: Information must be immediately scannable and understandable
2. **Accessibility First**: WCAG 2.1 AA minimum, aim for AAA where possible
3. **Progressive Disclosure**: Show essential information first, detailed data on demand
4. **Error Prevention**: Design to prevent mistakes before they happen
5. **Calm Design**: Avoid aggressive colors (harsh reds), cluttered layouts, flashing alerts
6. **Compliance Visibility**: Make regulatory compliance obvious and trackable
7. **Multi-User Awareness**: Design for different user personas with varying stress levels

---

## 2. USER PERSONAS & JOURNEYS

### Key User Personas

**Dr. Sarah Chen - Principal Investigator (PI)**
- Age: 42, Cardiology Research Director
- Needs: Submit protocols quickly, track status, manage enrollment
- Pain Points: Complex forms, unclear timelines, document management
- Journey: Create Study → Upload Docs → Submit → Track → Respond to Feedback → Approval

**Dr. Michael Rodriguez - IRB Reviewer**
- Age: 55, IRB Board Member
- Needs: Review efficiently, provide structured feedback, track deadlines
- Pain Points: Scattered documents, manual processes, no AI assistance
- Journey: Review Queue → Select Protocol → Review Docs → Comment → Approve/Reject

**Jennifer Martinez - Research Coordinator**
- Age: 29, Clinical Research Coordinator
- Needs: Enroll participants, upload documents, track compliance
- Pain Points: Repetitive data entry, limited mobile access, poor search
- Journey: Enroll Participant → Upload Consent → Schedule Visits → Track Status

**Linda Thompson - IRB Administrator**
- Age: 48, IRB Manager
- Needs: Assign reviewers, monitor timelines, generate reports
- Pain Points: Manual assignments, limited analytics, compliance tracking
- Journey: Assign Reviews → Monitor Progress → Generate Reports → Audit Logs

---

## 3. KEY SCREENS TO DESIGN

### Priority 1 (Must-Have)

1. **Login Page** - Mount Sinai branded, SSO integration
2. **Dashboard** - Role-based with stats, quick actions, activity feed
3. **Studies List** - Search, filters, grid/list views
4. **Create New Study** - Multi-step wizard with progress indicator
5. **Study Detail** - Tabs for overview, documents, participants, history
6. **Review Queue** - Prioritized list with deadline indicators
7. **Protocol Review Interface** - Split view: document + review panel
8. **Participants List** - With search, filters, enrollment tracking
9. **Document Library** - Upload, preview, OCR, AI analysis

### Priority 2 (Important)

10. **Mobile Responsive Views** - Dashboard, studies list, document upload
11. **Reports Dashboard** - Pre-built and custom reports
12. **Calendar View** - Study deadlines, reviews, participant visits
13. **User Management** - Users list, roles, permissions
14. **Audit Log** - Searchable compliance tracking
15. **Settings** - Profile, notifications, system config

---

## 4. COMPONENT LIBRARY SPECIFICATIONS

### Buttons

**Primary Button:**
- Background: Linear gradient from #06ABEB to #0891C7
- Text: White, 16px, Weight 600
- Height: 44px, Padding: 12px 24px, Border-radius: 8px
- Shadow: 0 2px 4px rgba(6, 171, 235, 0.2)
- Hover: Gradient shift + lift, Active: Scale 0.98

**States:** Default, Hover, Active, Disabled, Loading

### Form Inputs

**Text Input:**
- Height: 44px, Padding: 10px 16px
- Border: 1px solid Gray-300, Border-radius: 8px
- Focus: Border #06ABEB (2px), shadow ring
- Error: Border #EF4444, Success: Border #10B981

**File Upload:**
- Drag-and-drop zone with dashed border
- Hover: Background #06ABEB10, border solid #06ABEB
- File preview cards with remove button

### Cards

**Standard Card:**
- Background: White, Border: 1px Gray-200
- Border-radius: 12px, Padding: 24px
- Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Hover: Shadow lift

**Stat Card (Dashboard):**
- Gradient backgrounds (Blue, Pink, Navy, Green)
- White text, large number (48px Bold)
- Icon in 56x56px circle

### Badges & Status Indicators

**Status Badge:**
- Padding: 4px 12px, Border-radius: 12px (pill)
- Font: 12px Weight 600
- Colors: Draft (Gray), Pending (Amber), Approved (Green), Active (Blue), Rejected (Red)

### Tables

- Header: Gray-50 background, 12px uppercase
- Rows: 14px Regular, hover Gray-50
- Sortable columns with icons
- Inline actions aligned right

### Navigation

**Top Nav Bar:**
- Height: 64px, White background, border-bottom
- Logo 40px, Nav items 16px Medium
- Active: Blue underline + text

**Sidebar:**
- Width: 280px (expanded), 64px (collapsed)
- Background: Gray-50, border-right
- Nav items 44px height, hover White background

---

## 5. UX FLOW IMPROVEMENTS

### Study Submission Flow
**Before:** Single overwhelming form
**After:** Multi-step wizard with:
- Progress stepper
- Auto-save
- Contextual help
- Step validation
- Review & submit summary

### Review Process
**Before:** Basic review interface
**After:** Rich experience with:
- AI-generated protocol summary
- Side-by-side document viewer
- Inline annotations
- Structured feedback forms
- Compliance checklist

### Document Management
**Before:** Basic list
**After:** Enhanced with:
- Drag-and-drop upload
- OCR preview
- AI analysis tab
- Version control visualization
- Advanced search with filters

### Mobile Experience
**New:** Mobile-first features:
- Bottom tab navigation
- Camera capture for documents
- Touch-optimized forms (48x48px targets)
- Swipe gestures
- Offline capability

---

## 6. ACCESSIBILITY REQUIREMENTS (WCAG 2.1 AA)

### Color Contrast
- Text: 4.5:1 minimum (AA), 7:1 preferred (AAA)
- Large text (18px+): 3:1 minimum
- UI components: 3:1 minimum
- Verified combinations:
  - #212070 on White: 10.5:1 (AAA) ✅
  - #00002D on White: 21:1 (AAA) ✅
  - White on #212070: 10.5:1 (AAA) ✅

### Keyboard Navigation
- All interactive elements keyboard accessible
- Visible focus indicators (2px solid #06ABEB outline)
- Logical tab order
- Skip to main content link

### Screen Reader Support
- Semantic HTML5
- ARIA labels where needed
- Descriptive link text
- Alt text for all images
- Form labels properly associated

### Additional Features
- Minimum touch target: 44x44px
- Zoom to 200% without content loss
- High contrast mode support
- Dark mode toggle (optional)

---

## 7. MOBILE RESPONSIVENESS

### Breakpoints
- **Mobile**: 320px - 640px (single column, hamburger nav, cards instead of tables)
- **Tablet**: 641px - 1024px (2 columns, toggleable sidebar, horizontal scroll tables)
- **Desktop**: 1025px+ (multi-column, persistent sidebar, full tables)

### Mobile-Specific Features
- Bottom tab bar navigation
- Native date pickers
- Camera capture for documents
- Swipe gestures (left to reveal actions)
- Pull to refresh
- Full-screen modals
- Sticky action buttons

---

## 8. DESIGN SYSTEM DELIVERABLES

### Figma File Structure

```
Mount Sinai IRB System
│
├── 📄 Cover Page (project overview)
├── 🎨 Design System
│   ├── Colors (variables)
│   ├── Typography (text styles)
│   ├── Spacing (tokens)
│   ├── Components Library
│   └── Patterns
├── 👤 User Personas
├── 🗺️ User Flows
├── 🖥️ Desktop Designs (all screens)
├── 📱 Mobile Designs
├── 🔄 Interactive Prototype
└── 📋 Handoff Documentation
```

### Components to Build

**Base Components:**
- Buttons (6 variants × 4 states)
- Form inputs (text, select, textarea, checkbox, radio, file upload)
- Cards (standard, stat, protocol)
- Badges (8 status variants)
- Modals (small, large, full-screen)
- Tables (sortable, filterable)
- Navigation (top bar, sidebar, breadcrumbs)
- Alerts (toast, inline)
- Progress indicators (bar, stepper, spinner)

**Patterns:**
- Empty states
- Loading states
- Error pages
- Multi-step forms
- Data visualization
- Timeline views
- Comment systems

---

## 9. HEALTHCARE DESIGN REFERENCES

### Inspiration Sources

**Healthcare Dashboards:**
- Epic MyChart (clean information hierarchy)
- Cerner PowerChart (clinical documentation)
- Medable (modern clinical trial management)
- Medidata Rave (robust data entry)

**Design Systems:**
- IBM Carbon Design System (healthcare patterns)
- Salesforce Lightning (enterprise patterns)
- Material Design 3 (modern components)
- Ant Design (complex forms, data viz)

**Healthcare UX:**
- Nielsen Norman Group Healthcare UX
- HIMSS UX Community
- FDA Human Factors Guidance

### Figma Plugins to Use

1. **Stark** - Accessibility checking, contrast ratios
2. **A11y - Color Contrast Checker** - WCAG compliance
3. **Iconify** - Icon libraries
4. **Content Reel** - Realistic content generation
5. **Auto Layout** - Responsive components

---

## 10. IMPLEMENTATION NOTES

### Timeline Suggestion

- **Week 1**: Design system and component library
- **Week 2**: Main dashboard and study screens
- **Week 3**: Review queue and participant management
- **Week 4**: Admin, reports, mobile versions
- **Week 5**: Prototype, polish, documentation
- **Week 6**: User testing and iteration

### Developer Handoff

- Enable Figma inspect mode
- Export design tokens (JSON)
- Share component library
- Provide Tailwind config
- Document animations and interactions
- Include accessibility notes

### Success Criteria

✅ Seamless study submission process
✅ Efficient review workflows with AI assistance
✅ Comprehensive participant management
✅ Robust document handling with OCR
✅ Real-time status tracking and notifications
✅ Full WCAG 2.1 AA accessibility compliance
✅ Responsive design (mobile, tablet, desktop)
✅ Mount Sinai brand consistency
✅ Regulatory compliance (HIPAA, 21 CFR Part 11)
✅ Intuitive UX that reduces cognitive load

---

## ADDITIONAL CONTEXT

### Current Tech Stack
- Next.js 14, React, Tailwind CSS
- PostgreSQL database
- Aigents AI integration for document analysis
- OCR capability (Mistral AI)

### Existing Features to Enhance
- Study management
- Document upload and review
- Participant enrollment
- IRB review queue
- Audit logging
- User management
- Reporting

### Key Workflows
1. PI submits protocol → Admin assigns reviewer → Reviewer provides feedback → PI revises → Approval
2. Coordinator enrolls participant → Uploads consent → Schedules visits → Tracks compliance
3. System generates audit trail → Admin reviews compliance → Generates regulatory reports

---

## QUESTIONS FOR CLARIFICATION

Before starting, please clarify:
1. Are there specific Mount Sinai photography or graphics to incorporate?
2. Is there an existing Mount Sinai design system to reference?
3. What are the must-have features for Phase 1 vs. Phase 2?
4. Will there be integration with other Mount Sinai systems (visual consistency needed)?
5. Are there brand guidelines beyond colors (tone, voice, imagery style)?

---

## FINAL NOTES

The design should feel:
- **Modern** - Contemporary aesthetics without trends that will quickly date
- **Trustworthy** - Professional, reliable, compliant
- **Efficient** - Reduces clicks, streamlines workflows
- **Calm** - Not overwhelming, progressive disclosure
- **Accessible** - Works for all users, all abilities
- **Responsive** - Seamless across devices

The goal is to create an IRB Management System that empowers researchers to focus on their important work while ensuring ethical oversight and compliance—all wrapped in a delightful user experience that reflects Mount Sinai's commitment to innovation and excellence in healthcare.

---

**Created for:** Mount Sinai IRB Management System Redesign
**Date:** October 2025
**Contact:** Development Team at C:\Users\jeffr\IRB try 2
