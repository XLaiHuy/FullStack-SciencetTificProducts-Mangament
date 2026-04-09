# 🎨 MODERN UI QUICK REFERENCE CARD

> Keep this handy while refactoring pages!

---

## Color Usage Patterns

### For Buttons
```jsx
// Primary Action
<button className="btn-primary">Lưu</button>

// Secondary Action
<button className="btn-secondary">Hủy</button>

// Danger Action
<button className="bg-error-500 hover:bg-error-600 text-white ...">Xóa</button>
```

### For Status/Badges
```jsx
<ModernBadge status="success" label="Hoàn thành" />
<ModernBadge status="warning" label="Cảnh báo" />
<ModernBadge status="error" label="Lỗi" />
<ModernBadge status="info" label="Thông tin" animate />
```

### For Text
```jsx
<h1 className="text-display-lg font-bold">Main Title</h1>
<h2 className="text-h2 font-semibold">Sub Title</h2>
<p className="text-body-md text-gray-700">Body text</p>
<p className="text-body-sm text-gray-500">Secondary text</p>
```

### For Backgrounds
```jsx
<div className="bg-white">               {/* Cards, containers */}
<div className="bg-gray-50">             {/* Subtle backgrounds */}
<div className="bg-primary-50">          {/* Light brand color */}
<div className="bg-primary-500">         {/* Dark brand color */}
```

---

## Component Imports

```tsx
import {
  ModernButton,      // Buttons with variants
  ModernCard,        // Card container
  ModernInput,       // Text input
  ModernSelect,      // Dropdown
  ModernBadge,       // Status labels
  ModernTable,       // Data tables
  ModernModal,       // Dialogs
  ModernAlert,       // Notifications
  ModernSpinner,     // Loading spinner
  ModernSkeleton,    // Loading skeleton
} from './components/ModernComponents';
```

---

## Common Patterns

### Form Layout
```tsx
<div className="space-y-6">
  <ModernCard>
    <h2 className="text-h2 mb-6">Form Title</h2>
    <div className="space-y-4">
      <ModernInput label="Field 1" />
      <ModernInput label="Field 2" />
      <ModernSelect label="Dropdown" options={opts} />
      
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <ModernButton variant="secondary">Cancel</ModernButton>
        <ModernButton variant="primary">Submit</ModernButton>
      </div>
    </div>
  </ModernCard>
</div>
```

### List/Table Layout
```tsx
<div className="space-y-4">
  <ModernCard>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-h2">Items</h2>
      <ModernButton variant="primary">+ Add</ModernButton>
    </div>
    
    <div className="mb-4 flex gap-3">
      <ModernInput placeholder="Search..." />
      <ModernSelect options={filterOpts} />
    </div>
    
    <ModernTable columns={cols} data={items} />
  </ModernCard>
</div>
```

### Dashboard Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <ModernCard>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-600">Label</p>
        <p className="text-2xl font-bold mt-2">42</p>
      </div>
      <span className="text-2xl">📊</span>
    </div>
  </ModernCard>
</div>
```

---

## Typography Scale

```
Display Large:  48px | h-96 | font-bold      (Page titles)
Display Medium: 36px | h-72 | font-bold
Display Small:  28px | h-56 | font-bold

Heading 1:      24px | h1 | font-bold       (Section headers)
Heading 2:      20px | h2 | font-semibold
Heading 3:      16px | h3 | font-semibold
Heading 4:      14px | h4 | font-semibold

Body Large:     16px | text-body-lg | font-normal  (Main content)
Body Medium:    14px | text-body-md | font-normal
Body Small:     12px | text-body-sm | font-normal
Body Tiny:      11px | text-body-xs | font-normal

Label:          13px | label-md | font-medium     (UI labels)
```

---

## Spacing Grid

```
2px   → xs (fine details)
4px   → sm (tight grouping)
8px   → md (base unit - most common)
12px  → lg (medium spacing)
16px  → xl (standard spacing)
20px  → 2xl (large grouping)
24px  → 3xl (section breaks)
32px  → 4xl (major sections)
48px  → 6xl (page margins)

Usage:
p-4       (padding 16px)
gap-6     (column gap 24px)
space-y-4 (row gap 16px)
mb-6      (margin-bottom 24px)
```

---

## Shadow Elevation

```jsx
shadow-xs  → Fine lines / subtle          (1px border effect)
shadow-sm  → Default for cards            (Light elevation)
shadow-md  → Hover states / lifted        (Medium elevation)
shadow-lg  → Modals / dropdowns           (Heavy elevation)
shadow-xl  → Floating elements
shadow-2xl → Maximum elevation
```

**Usage:**
```jsx
<div className="shadow-card">           {/* Default card shadow */}
<div className="shadow-sm hover:shadow-md"> {/* Hover lift */}
<div className="shadow-lg">             {/* Modal/dropdown */}
```

---

## Responsive Breakpoints

```jsx
// Single column on mobile, 2 on tablet, 3 on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Hide on mobile, show on desktop
<div className="hidden lg:block">

// 100% on mobile, fixed width on desktop
<div className="w-full lg:w-96">

// Padding scales
<div className="px-4 md:px-8 lg:px-16">
```

---

## Animation Utilities

```jsx
// Fade in
className="animate-in fade-in duration-300"

// Slide up
className="animate-in slide-in-from-bottom-4 duration-300"

// Scale in
className="animate-in zoom-in-95 duration-300"

// Pulse (for status indicators)
className="animate-pulse"

// Spin (for loading)
className="animate-spin"
```

---

## State Classes

```jsx
// Hover
hover:bg-primary-600
hover:shadow-md
hover:scale-105
hover:text-primary-700

// Focus
focus:outline-none
focus:ring-2
focus:ring-primary-300

// Disabled
disabled:opacity-50
disabled:cursor-not-allowed
disabled:bg-gray-300

// Loading
aria-busy="true"
[aria-busy="true"]:opacity-50
```

---

## Common Mistakes ❌

```jsx
❌ Don't mix old + new colors
<button className="bg-blue-500">        {/* Old config */}
<button className="btn-primary">        {/* New component */}

❌ Don't create custom shadow values
<div className="shadow-[0_4px_6px]">    {/* Wrong */}
<div className="shadow-md">             {/* Right */}

❌ Don't hardcode hex colors
<div style={{ backgroundColor: '#0ea5e9' }}>  {/* Wrong */}
<div className="bg-primary-500">              {/* Right */}

❌ Don't use margin for spacing between components
<div className="mb-8 space-y-4">        {/* Wrong - conflicting */}
<div>Flex container</div>
<div>Child with gap</div>

<div className="flex flex-col gap-3">   {/* Right */}
  ...
</div>
```

---

## Quick Search

### "I need a..."

| Need | Code |
|------|------|
| Button | `<ModernButton variant="primary">` |
| Card | `<ModernCard>` |
| Input | `<ModernInput label="" />` |
| Dropdown | `<ModernSelect options={} />` |
| Badge | `<ModernBadge status="success" />` |
| Table | `<ModernTable columns={} data={} />` |
| Modal | `<ModernModal isOpen={} />` |
| Alert | `<ModernAlert type="success" />` |
| Spinner | `<ModernSpinner size="md" />` |
| Skeleton | `<ModernSkeleton lines={3} />` |
| Blue button | `className="btn-primary"` |
| Success text | `className="text-success-600"` |
| Error background | `className="bg-error-50"` |
| Card with hover | `<ModernCard clickable />` |
| Disabled button | `<ModernButton disabled />` |
| Loading button | `<ModernButton loading />` |
| Red delete button | `<ModernButton variant="danger">` |

---

## Accessibility Checklist ✅

- [ ] All interactive elements have focus rings (`focus:ring-2`)
- [ ] All buttons have sufficient color contrast (WCAG AA)
- [ ] Images have alt text
- [ ] Form fields have associated labels
- [ ] Error messages are clearly visible
- [ ] Loading states are announced
- [ ] Keyboard navigation works
- [ ] Touch targets are ≥44x44px

---

## Performance Tips ⚡

```jsx
// ✅ Good - Memoize expensive components
const MemoCard = React.memo(ModernCard);

// ✅ Good - Use loading skeletons
{loading ? <ModernSkeleton /> : <Content />}

// ✅ Good - Lazy load modals
const Modal = React.lazy(() => import('./ModernModal'));

// ❌ Bad - Inline styles
style={{ backgroundColor: colors[i] }}

// ❌ Bad - Render list without keys
{items.map(item => <Item />)}
```

---

## Browser DevTools Tips 🔧

### Debug Spacing
```js
// In console: visualize all p-4 elements
document.querySelectorAll('[class*="p-4"]').forEach(el => {
  el.style.outline = '1px solid red';
});
```

### Check Color
```js
// Get computed color of element
window.getComputedStyle(element).backgroundColor
```

### Tailwind Debug
```js
// Show all available utilities
console.log(window.tailwindcss?.version)
```

---

## Last Minute Changes 🚨

**Need quick tweaks before launch?**

### Override with utility class (if absolutely necessary)
```jsx
// Instead of creating new component
<div className="shadow-md lg:shadow-lg 2xl:shadow-xl">
```

### Use important modifier (last resort only)
```jsx
<div className="!bg-primary-500">  {/* Forces color */}
```

### Inline style for dynamic values only
```jsx
const itemColor = getColorForStatus(status);
<div style={{ backgroundColor: itemColor }} />
```

---

## Quick Deploy Checklist 🚀

- [ ] Run `npm run build` - no errors
- [ ] Check console - no warnings
- [ ] Test on mobile - responsive ✓
- [ ] Test dark backgrounds - contrast OK
- [ ] Check loading states
- [ ] Test error states
- [ ] Verify button interactions
- [ ] Screenshot for stakeholders

---

**Print this page or bookmark for quick reference!** 📌
