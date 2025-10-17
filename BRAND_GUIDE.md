# TreeHouseBooks Philadelphia Brand Guide

## 🎨 Color Palette

### Primary Colors

**Teal** `#2B7A78`
```
█████████████████████████
█████████████████████████  Primary Brand Color
█████████████████████████  Use for: Headers, primary buttons, links, titles
█████████████████████████
```
CSS: `var(--thb-primary)`

**Dark Teal** `#1F5856`
```
█████████████████████████
█████████████████████████  Hover State
█████████████████████████  Use for: Button hover, active states
█████████████████████████
```
CSS: `var(--thb-primary-dark)`

**Light Teal** `#3AAFA9`
```
█████████████████████████
█████████████████████████  Secondary Actions
█████████████████████████  Use for: Secondary buttons, borders, icons
█████████████████████████
```
CSS: `var(--thb-secondary)`

### Background Colors

**Very Light Teal** `#DEF2F1`
```
█████████████████████████
█████████████████████████  Soft Background
█████████████████████████  Use for: Card backgrounds, hover states, sections
█████████████████████████
```
CSS: `var(--thb-accent)`

**Warm White** `#FEFFFF`
```
█████████████████████████
█████████████████████████  Main Background
█████████████████████████  Use for: Page background, cards
█████████████████████████
```
CSS: `var(--thb-warm)`

### Accent Colors

**Orange** `#FF6B35`
```
█████████████████████████
█████████████████████████  Call to Action
█████████████████████████  Use for: Important buttons, badges, highlights
█████████████████████████
```
CSS: `var(--thb-orange)`

### Semantic Colors

**Success Green** `#52B788`
```
█████████████████████████
█████████████████████████  Success / Positive
█████████████████████████  Use for: Success messages, confirmations
█████████████████████████
```
CSS: `var(--thb-success)`

**Danger Red** `#E74C3C`
```
█████████████████████████
█████████████████████████  Error / Destructive
█████████████████████████  Use for: Errors, delete actions, warnings
█████████████████████████
```
CSS: `var(--thb-danger)`

**Info Blue** `#4A90E2`
```
█████████████████████████
█████████████████████████  Information
█████████████████████████  Use for: Info messages, help text
█████████████████████████
```
CSS: `var(--thb-info)`

**Warning Orange** `#F39C12`
```
█████████████████████████
█████████████████████████  Warning / Caution
█████████████████████████  Use for: Warning messages, pending states
█████████████████████████
```
CSS: `var(--thb-warning)`

---

## 🎯 Usage Guidelines

### When to Use Each Color

#### Primary Teal (#2B7A78)
✅ **DO:**
- Main navigation bar
- Primary action buttons ("Save", "Submit", "Create")
- Page headers and titles
- Active menu items
- Important links

❌ **DON'T:**
- Overuse - balance with white space
- Use for warning/error states
- Use on dark backgrounds

#### Light Teal (#3AAFA9)
✅ **DO:**
- Secondary buttons
- Icon colors
- Border highlights
- Hover states
- Subtle accents

❌ **DON'T:**
- Use as main background
- Use for text (poor contrast)

#### Orange (#FF6B35)
✅ **DO:**
- "New" or "Popular" badges
- Call-to-action buttons
- Limited highlights
- Special promotions

❌ **DON'T:**
- Overuse - save for special emphasis
- Use as primary color
- Mix with red error states

---

## 📐 Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

### Text Colors
- **Primary Text:** `#2B2B2B` (Dark Gray)
- **Secondary Text:** `#6B6B6B` (Light Gray)
- **Muted Text:** `#999999`
- **Link Text:** `#2B7A78` (Primary Teal)

### Headings
```
H1: 2rem (32px) - Bold - Teal
H2: 1.5rem (24px) - Semi-bold - Teal
H3: 1.25rem (20px) - Semi-bold - Dark Gray
H4: 1.1rem (18px) - Medium - Dark Gray
```

---

## 🎨 Component Styling

### Buttons

**Primary Button**
```html
<button class="btn btn-primary">Primary Action</button>
```
- Background: Teal
- Text: White
- Hover: Dark Teal + Lift Effect
- Use for: Main actions (Save, Submit, Create)

**Secondary Button**
```html
<button class="btn btn-outline-primary">Secondary Action</button>
```
- Border: Teal
- Text: Teal
- Hover: Teal background + White text
- Use for: Alternative actions (Cancel, Back)

**Success Button**
```html
<button class="btn btn-success">Confirm</button>
```
- Background: Green
- Text: White
- Use for: Confirmations, completions

**Danger Button**
```html
<button class="btn btn-danger">Delete</button>
```
- Background: Red
- Text: White
- Use for: Destructive actions

### Cards

**Standard Card**
```html
<div class="card">
  <div class="card-header">Card Title</div>
  <div class="card-body">
    Content here
  </div>
</div>
```
- Background: White
- Border: None
- Shadow: Soft (0 2px 8px)
- Radius: 0.75rem
- Hover: Lift + Shadow increase

### Alerts

**Success Alert**
```html
<div class="alert alert-success">
  Success message
</div>
```
- Background: Light green tint
- Border: Green
- Icon: Check circle

**Info Alert**
```html
<div class="alert alert-info">
  Information message
</div>
```
- Background: Light blue tint
- Border: Blue
- Icon: Info circle

---

## 🎭 Design Patterns

### Navigation Bar
- Background: Teal gradient (Primary → Secondary)
- Text: White
- Logo: White with teal icon
- Dropdowns: White background
- Hover: Light overlay

### Dashboard Layout
- Background: Gradient (Light Teal → White)
- Cards: White with shadow
- Spacing: Consistent 1rem gaps
- Grid: Responsive auto-fit

### Forms
- Labels: Dark gray, medium weight
- Inputs: White background, teal focus
- Required: Red asterisk
- Help text: Light gray

### Tables
- Header: Light teal background
- Rows: White
- Hover: Light teal background
- Borders: Minimal

---

## ♿ Accessibility

### Color Contrast Ratios

**Text on Backgrounds:**
- Dark Gray (#2B2B2B) on White: 14.5:1 ✅ (AAA)
- Primary Teal (#2B7A78) on White: 4.7:1 ✅ (AA)
- White on Primary Teal: 4.5:1 ✅ (AA)
- Light Gray (#6B6B6B) on White: 5.7:1 ✅ (AA)

**Do Not Use:**
- Light Teal text on white (poor contrast)
- Orange text on white (poor contrast)
- Gray text smaller than 14px

### Best Practices
- ✅ Always pair icons with text labels
- ✅ Provide text alternatives for visual elements
- ✅ Ensure keyboard navigation works
- ✅ Use semantic HTML
- ✅ Test with screen readers

---

## 📱 Responsive Design

### Breakpoints
- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### Mobile Adjustments
- Navigation collapses to hamburger menu
- Cards stack vertically
- Font sizes reduce 10-15%
- Touch targets minimum 44x44px
- Reduced spacing

---

## 🎨 Quick Reference

### CSS Variables
```css
:root {
  --thb-primary: #2B7A78;
  --thb-primary-dark: #1F5856;
  --thb-secondary: #3AAFA9;
  --thb-accent: #DEF2F1;
  --thb-warm: #FEFFFF;
  --thb-orange: #FF6B35;
  --thb-text: #2B2B2B;
  --thb-text-light: #6B6B6B;
  --thb-success: #52B788;
  --thb-danger: #E74C3C;
  --thb-warning: #F39C12;
  --thb-info: #4A90E2;
}
```

### Common Classes
```html
<!-- Buttons -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-outline-primary">Outline</button>
<button class="btn btn-success">Success</button>

<!-- Text Colors -->
<span class="text-primary">Teal text</span>
<span class="text-muted">Gray text</span>

<!-- Backgrounds -->
<div class="bg-light">Light background</div>
<div class="thb-gradient-bg">Gradient background</div>

<!-- Cards -->
<div class="card thb-card-hover">Hoverable card</div>

<!-- Badges -->
<span class="badge bg-primary">Badge</span>
<span class="feature-badge">New</span>
```

---

## 🎯 Design Checklist

When creating a new page or component:

- [ ] Uses TreeHouseBooks color palette
- [ ] Includes navigation menu (`<%- include('partials/nav') %>`)
- [ ] Has consistent spacing (rem units)
- [ ] Text is readable (proper contrast)
- [ ] Buttons have clear labels
- [ ] Icons have descriptive text
- [ ] Works on mobile devices
- [ ] Has hover states on interactive elements
- [ ] Uses semantic HTML
- [ ] Includes help/tooltips where needed
- [ ] Matches existing pages in style
- [ ] Tested with keyboard navigation

---

## 🌟 Brand Personality

**TreeHouseBooks is:**
- 🌳 **Community-focused** - Philadelphia roots
- 📚 **Educational** - Literacy and learning
- 💙 **Welcoming** - Warm, friendly, accessible
- 🎯 **Mission-driven** - Free books for children
- 🤝 **Collaborative** - Staff, volunteers, families

**Visual Expression:**
- Teal represents growth, education, community
- Orange adds warmth and energy
- Clean, modern design shows professionalism
- Soft shadows and rounded corners feel friendly
- Consistent spacing feels organized and reliable

---

## 📚 Resources

- **Brand Styles:** `/public/css/treehouse-brand.css`
- **Navigation:** `/views/partials/nav.ejs`
- **Quick Actions:** `/views/partials/quickActions.ejs`
- **Full Documentation:** `UI_UX_ENHANCEMENTS.md`

---

**Designed for**: TreeHouseBooks Philadelphia
**Purpose**: Giving Library and Literacy Center
**Mission**: Providing free books and literacy programs to children in North Philadelphia

**Status**: ✅ BRAND GUIDE COMPLETE
