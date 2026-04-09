# 🎨 NCKH Modern Design System v2.0

Comprehensive professional UI/UX redesign inspired by **Notion, Linear, Figma, GitHub**.

---

## 📐 1. COLOR PALETTE (Modern & Professional)

### Primary Colors
```css
/* Professional Blue (Trust & Tech) */
--primary-50:  #f0f7ff    /* Lightest background tints */
--primary-100: #e0effe
--primary-200: #bae6fd
--primary-300: #7dd3fc
--primary-400: #38bdf8
--primary-500: #0ea5e9    /* Main brand color */
--primary-600: #0284c7
--primary-700: #0369a1
--primary-800: #075985
--primary-900: #0c3d66

/* Modern Gradients */
--gradient-primary: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)
--gradient-accent: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)
```

### Secondary Colors (By Function)
```css
/* Success - Modern Green */
--success-50:  #f0fdf4
--success-500: #22c55e
--success-600: #16a34a
--success-700: #15803d

/* Warning - Amber */
--warning-50:  #fffbeb
--warning-500: #f59e0b
--warning-600: #d97706
--warning-700: #b45309

/* Error - Modern Red */
--error-50:   #fef2f2
--error-500:  #ef4444
--error-600:  #dc2626
--error-700:  #b91c1c

/* Info - Cyan */
--info-50:    #ecf0ff
--info-500:   #06b6d4
--info-600:   #0891b2
--info-700:   #0e7490

/* Neutral - Professional Gray */
--gray-50:    #f9fafb
--gray-100:   #f3f4f6
--gray-200:   #e5e7eb
--gray-300:   #d1d5db
--gray-400:   #9ca3af
--gray-500:   #6b7280
--gray-600:   #4b5563
--gray-700:   #374151
--gray-800:   #1f2937
--gray-900:   #111827
```

---

## 🔤 2. TYPOGRAPHY

### Font Stack
```
Font Family: "Inter", "Segoe UI", -apple-system, sans-serif
(Modern, clean, excellent readability)
```

### Type Scale
```css
Display Large   | 48px | Font-weight: 700 | Line-height: 1.2  (Page titles)
Display Medium  | 36px | Font-weight: 700 | Line-height: 1.2
Display Small   | 28px | Font-weight: 700 | Line-height: 1.3

Heading 1       | 24px | Font-weight: 700 | Line-height: 1.4  (Section headers)
Heading 2       | 20px | Font-weight: 600 | Line-height: 1.4
Heading 3       | 16px | Font-weight: 600 | Line-height: 1.5
Heading 4       | 14px | Font-weight: 600 | Line-height: 1.5

Body Large      | 16px | Font-weight: 400 | Line-height: 1.6  (Main content)
Body Medium     | 14px | Font-weight: 400 | Line-height: 1.6
Body Small      | 12px | Font-weight: 400 | Line-height: 1.6
Body Tiny       | 11px | Font-weight: 400 | Line-height: 1.5

Label Medium    | 13px | Font-weight: 500 | Line-height: 1.5  (UI labels)
Label Small     | 12px | Font-weight: 500 | Line-height: 1.5

Mono Code       | 12px | Font-family: Monaco, monospace
```

---

## 📦 3. SPACING SYSTEM

```css
2px   (xs)      | Fine details
4px   (sm)      | Tight grouping
8px   (md)      | Base unit (most common)
12px  (lg)      | Medium spacing
16px  (xl)      | Standard spacing
20px  (2xl)     | Large collections
24px  (3xl)     | Section breaks
32px  (4xl)     | Major sections
48px  (6xl)     | Page margins
```

---

## 🎯 4. COMPONENT LIBRARY (NEW DESIGNS)

### 4.1 Buttons

#### Primary Button
```jsx
// High emphasis, main call-to-action
<button className="px-4 py-2.5 bg-primary-500 text-white rounded-lg 
                   font-semibold text-sm
                   hover:bg-primary-600 active:bg-primary-700
                   transition-colors shadow-sm
                   hover:shadow-md focus:ring-2 focus:ring-primary-300">
  Thực hiện
</button>
```

#### Secondary Button
```jsx
// Medium emphasis, alternative actions
<button className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg
                   font-semibold text-sm border border-gray-200
                   hover:bg-gray-200 active:bg-gray-300
                   transition-colors focus:ring-2 focus:ring-gray-300">
  Hủy bỏ
</button>
```

#### Tertiary Button (Text Only)
```jsx
// Low emphasis, secondary options
<button className="px-4 py-2.5 text-primary-600 rounded-lg
                   font-semibold text-sm
                   hover:bg-primary-50 active:bg-primary-100
                   transition-colors">
  Tìm hiểu thêm
</button>
```

#### Button States
- **Disabled**: `opacity-50 cursor-not-allowed`
- **Loading**: Spinner icon + disabled state
- **Success**: Green checkmark + animation
- **Error**: Red background + shake animation

---

### 4.2 Cards

#### Standard Card (Content Container)
```jsx
<div className="bg-white rounded-xl border border-gray-200
                p-6 shadow-sm hover:shadow-md
                transition-all">
  {/* Content */}
</div>
```

#### Interactive Card (Hover effect)
```jsx
<div className="bg-white rounded-xl border border-gray-200
                p-6 shadow-sm
                hover:shadow-lg hover:border-primary-200
                cursor-pointer transition-all duration-200">
  {/* Clickable content */}
</div>
```

#### Status Card (Highlight with color left border)
```jsx
<div className="bg-white rounded-xl border-l-4 border-l-primary-500
                border border-gray-200 p-6 shadow-sm">
  {/* Status content */}
</div>
```

---

### 4.3 Input Fields

#### Modern Input with Icon
```jsx
<div className="relative">
  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
  <input
    type="text"
    placeholder="Tìm kiếm..."
    className="w-full pl-10 pr-4 py-2.5 rounded-lg
               border border-gray-200 bg-white
               text-sm font-medium
               placeholder:text-gray-400
               focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500
               transition-all"
  />
</div>
```

#### Select / Dropdown (Custom styled)
```jsx
<select className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white
                   text-sm font-medium
                   focus:outline-none focus:ring-2 focus:ring-primary-300
                   appearance-none cursor-pointer
                   bg-[url('data:image/svg+xml;...')] bg-no-repeat bg-right">
  <option>Chọn một tùy chọn</option>
</select>
```

---

### 4.4 Badges & Status Indicators

#### Status Badges (Dot + Label)
```jsx
// Success
<span className="inline-flex items-center gap-2 px-3 py-1.5
                 bg-success-50 text-success-700 rounded-full
                 text-xs font-semibold">
  <span className="w-2 h-2 rounded-full bg-success-500" />
  Hoàn thành
</span>

// In Progress (with animation)
<span className="inline-flex items-center gap-2 px-3 py-1.5
                 bg-info-50 text-info-700 rounded-full
                 text-xs font-semibold">
  <span className="w-2 h-2 rounded-full bg-info-500 animate-pulse" />
  Đang xử lý
</span>

// Error
<span className="inline-flex items-center gap-2 px-3 py-1.5
                 bg-error-50 text-error-700 rounded-full
                 text-xs font-semibold">
  <span className="w-2 h-2 rounded-full bg-error-500" />
  Lỗi
</span>
```

---

### 4.5 Tables (Professional)

#### Modern Table Design
```jsx
<div className="overflow-x-auto rounded-xl border border-gray-200">
  <table className="w-full">
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
          Tên Cột
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 text-sm text-gray-700">
          Dữ liệu
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### 4.6 Modal / Dialog

#### Professional Modal
```jsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm
                flex items-center justify-center p-4 z-50">
  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8
                  animate-in fade-in zoom-in-95 duration-300">
    <h2 className="text-xl font-bold text-gray-900">Tiêu đề Modal</h2>
    <p className="text-gray-600 mt-2 text-sm">Nội dung mô tả</p>
    <div className="mt-8 flex gap-3">
      <button className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200
                         text-gray-700 font-semibold hover:bg-gray-50">
        Hủy
      </button>
      <button className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500
                         text-white font-semibold hover:bg-primary-600">
        Xác nhận
      </button>
    </div>
  </div>
</div>
```

---

### 4.7 Sidebar Navigation (Redesigned)

```jsx
<aside className="w-72 bg-gradient-to-b from-gray-50 to-white
                  border-r border-gray-200 flex flex-col
                  h-screen fixed overflow-y-auto">
  
  {/* Brand Header */}
  <div className="p-6 border-b border-gray-200">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gradient-primary
                      flex items-center justify-center text-white
                      text-sm font-bold shadow-lg">N</div>
      <div>
        <h1 className="font-bold text-gray-900">NCKH 2026</h1>
        <p className="text-xs text-gray-500">Research Portal</p>
      </div>
    </div>
  </div>

  {/* Navigation */}
  <nav className="flex-1 px-3 py-4 space-y-1">
    {/* Group 1 */}
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase px-3 py-2">Quản Lý</p>
      <NavLink to="/dashboard"
               className={({ isActive }) => `
                 flex items-center gap-3 px-4 py-2.5 rounded-lg
                 text-sm font-medium transition-all
                 ${isActive 
                   ? 'bg-primary-500 text-white shadow-md' 
                   : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
               `}>
        📊 Bảng Điều Khiển
      </NavLink>
    </div>
  </nav>

  {/* User Profile Bottom */}
  <div className="p-4 border-t border-gray-200">
    <div className="flex items-center gap-3 p-3 rounded-lg
                    hover:bg-gray-100 cursor-pointer transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary-500
                      flex items-center justify-center text-white
                      text-sm font-bold">NH</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">Người Dùng</p>
        <p className="text-xs text-gray-500">research_staff</p>
      </div>
    </div>
  </div>
</aside>
```

---

### 4.8 Data Tables with Advanced Features

```jsx
// Sortable, filterable table with modern styling
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <div className="p-6 border-b border-gray-100 flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-gray-900">Danh Sách Đề Tài</h3>
      <button className="px-4 py-2 bg-primary-500 text-white rounded-lg
                         text-sm font-semibold hover:bg-primary-600">
        + Thêm Mới
      </button>
    </div>
    
    {/* Filters */}
    <div className="flex gap-3 items-center">
      <input placeholder="Tìm kiếm..." 
             className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm" />
      <select className="px-4 py-2 rounded-lg border border-gray-200 text-sm">
        <option>Tất cả trạng thái</option>
      </select>
    </div>
  </div>

  {/* Table */}
  <table className="w-full">
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
          Mã Đề Tài
        </th>
        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
          Tên Đề Tài
        </th>
        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">
          Trạng Thái
        </th>
        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">
          Hành Động
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 text-sm font-medium text-gray-900">DT-2024-001</td>
        <td className="px-6 py-4 text-sm text-gray-700">Phân tích AI...</td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1
                           bg-success-50 text-success-700 rounded-full
                           text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
            Đang thực hiện
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            Xem
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 🎬 5. ANIMATIONS & INTERACTIONS

### Transitions
```css
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);  /* Material Motion */
```

### Hover Effects
```jsx
// Subtle scale + shadow elevation
hover:shadow-md hover:scale-[1.02] transition-all

// Color transition
hover:bg-gray-100 hover:text-gray-900 transition-colors

// Icon rotation
hover:rotate-45 transition-transform
```

### Loading States
```jsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
</div>
```

### Page Transitions
```jsx
// Fade in animation
className="animate-in fade-in duration-300"

// Slide up
className="animate-in slide-in-from-bottom-4 duration-300"
```

---

## 📐 6. LAYOUT PATTERNS

### 6.1 Dashboard Layout
```
┌─────────────────────────────────────────────────┐
│  Logo    │  Search              │ Notifs  User │  Topbar (h-16)
├──────────┼─────────────────────────────────────┤
│          │                                       │
│ Sidebar  │   Main Content (Responsive)          │  Main
│ (Fixed)  │                                       │  Area
│          │                                       │
└──────────┴─────────────────────────────────────┘
```

### 6.2 Card Grid Layout
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
  {/* Auto-responsive */}
</div>
```

---

## 🎨 7. SHADOW SYSTEM

```css
shadow-xs   := 0 1px 2px 0 rgba(0, 0, 0, 0.05);
shadow-sm   := 0 1px 3px 0 rgba(0, 0, 0, 0.1);    /* Default for cards */
shadow-md   := 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* Hover cards */
shadow-lg   := 0 10px 15px -3px rgba(0, 0, 0, 0.1); /* Modals */
shadow-xl   := 0 20px 25px -5px rgba(0, 0, 0, 0.1); /* Dropdowns */
shadow-2xl  := 0 25px 50px -12px rgba(0, 0, 0, 0.25); /* Maximum elevation */
```

---

## 📱 8. RESPONSIVE DESIGN

### Breakpoints
```css
sm: 640px   (tablets)
md: 768px   (small laptops)
lg: 1024px  (standard laptops)
xl: 1280px  (wide screens)
2xl: 1536px (ultra-wide)
```

### Examples
```jsx
{/* Stack vertically on mobile, 2 cols on tablet, 3 cols on desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

{/* Hide on mobile, show on tablet+ */}
<div className="hidden md:block">

{/* 100% width on mobile, fixed on desktop */}
<div className="w-full md:w-96">
```

---

## 🌟 9. DARK MODE (Optional - Future Enhancement)

```jsx
// Add `dark:` variants
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

---

## 📋 10. IMPLEMENTATION PRIORITY

### Phase 1 - HIGH IMPACT (Week 1-2)
1. ✅ Update color palette in Tailwind config
2. ✅ Redesign Sidebar + Topbar
3. ✅ Modern button styles
4. ✅ Card components
5. ✅ Status badges with animations

### Phase 2 - MEDIUM IMPACT (Week 3-4)
6. ✅ Form fields redesign
7. ✅ Table components
8. ✅ Modal dialogs
9. ✅ Data tables with advanced features
10. ✅ Animations & transitions

### Phase 3 - POLISH (Week 5)
11. Dark mode support
12. Accessibility improvements (WCAG AA)
13. Performance optimization
14. Comprehensive component documentation

---

## 🔗 REFERENCES

### Design Systems Analyzed
- **Linear** (Modern SaaS): Clean, minimal, functional
- **Notion**: Card-based, flexible, professional
- **Figma**: Cohesive, modern, developer-friendly
- **GitHub**: Accessible, familiar, technical
- **Stripe**: Premium, sophisticated, data-focused

### Tools & Libraries
- **Tailwind CSS**: Utility-first CSS
- **Headless UI**: Unstyled accessible components
- **Framer Motion**: Animations
- **Radix UI**: Primitive components (advanced)

### Resources
- Tailwind UI Components: https://tailwindui.com
- Design System Patterns: https://designsystem.withgoogle.com
- A11y Guidelines: https://www.w3.org/WAI/

---

✨ **This modern design system will make NCKH look professional, enterprise-grade, and competitive with international research portals.**
