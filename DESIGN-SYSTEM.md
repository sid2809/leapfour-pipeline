# Leapfour Pipeline — Design System

**Include this file in every Claude Code prompt for UI work.**

## Philosophy

Internal data tool. One user. Clean, minimal, data-dense. No decoration. The design stays out of the way and lets the data speak. Think Vercel dashboard meets Linear.

## Color Tokens

Use these exact values in Tailwind classes. Add them to `tailwind.config.ts` under `extend.colors`.

```
Background:    bg         #FAFAFA     → bg-[#FAFAFA] or define as bg-page
Surface:       surface    #FFFFFF     → bg-white
Surface hover: hover      #F5F5F5     → hover:bg-neutral-100
Border:        border     #E5E5E5     → border-neutral-200
Border light:  subtle     #F0F0F0     → border-neutral-100

Text:          primary    #171717     → text-neutral-900
Text:          secondary  #737373     → text-neutral-500
Text:          muted      #A3A3A3     → text-neutral-400

Button/primary:           #171717     → bg-neutral-900 text-white
Accent (links, focus):    #2563EB     → text-blue-600, ring-blue-600
Danger:                   #DC2626     → text-red-600
Success:                  #16A34A     → text-green-600
Warning:                  #D97706     → text-amber-600
```

### Category colors (for badges and charts only)

```
INVISIBLE:          #EF4444   → red-500
REVIEWS-WEAK:       #F97316   → orange-500
SLOW-SITE:          #EAB308   → yellow-500
NO-WEBSITE:         #6B7280   → gray-500
STRONG-BUT-NO-ADS:  #22C55E   → green-500
UNCATEGORIZED:      #A855F7   → purple-500
```

Badge backgrounds use the color at 10% opacity: `bg-red-500/10 text-red-600`.

## Typography

**Font:** System font stack. In Tailwind: `font-sans` (default). Do NOT import Google Fonts or any custom font. The system stack is fast and clean.

**Sizes:**
- Page title: `text-xl font-semibold tracking-tight` (20px)
- Section heading: `text-[15px] font-semibold tracking-tight`
- Body text: `text-sm` (14px)
- Table headers: `text-[11px] font-semibold uppercase tracking-wider text-neutral-500`
- Small labels: `text-xs text-neutral-500` (12px)
- Micro badges: `text-[11px] font-medium uppercase tracking-wide`

**Numbers:** Always use `tabular-nums` on data columns (ratings, counts, scores, dates). In Tailwind: `font-[tabular-nums]` or add `fontVariantNumeric: 'tabular-nums'`.

## Layout

**Sidebar:** Fixed, 220px wide, `bg-neutral-900`. Logo at top, nav links in middle, user/logout at bottom. Active link: `bg-white/10`. Inactive: `text-white/50`.

**Content area:** `bg-[#FAFAFA]`, `px-8 py-5` (32px horizontal padding, 20px vertical).

**Cards:** `bg-white border border-neutral-200 rounded-lg`. No shadow on cards (shadow only on modals/dropdowns). Padding: `p-4` to `p-6`.

**Stats cards row:** CSS Grid, 4 columns. Each card: label (12px, neutral-500), value (24px, font-semibold, tracking-tight), subtitle (11px, neutral-400).

## Tables

- **No zebra striping.** Clean white background.
- Row borders: `border-b border-neutral-100` (the lightest border).
- Row hover: `hover:bg-neutral-50`.
- Row padding: `py-3 px-4`.
- Header row: `text-[11px] font-semibold uppercase tracking-wider text-neutral-500`.
- Clickable rows: `cursor-pointer`.
- Checkboxes: `accent-neutral-900` (dark checkmark).

## Badges

Pill-shaped: `rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide`.

Status badges:
- Ready/Success: `bg-green-50 text-green-600`
- Enriching/Active: `bg-blue-50 text-blue-600`
- Failed: `bg-red-50 text-red-600`
- Exported: `bg-neutral-100 text-neutral-500`
- Parked: `bg-neutral-100 text-neutral-400`

Category badges use their category color at 10% opacity background.

## Status Dots

8px circles next to status text. Pulsing animation when active (SCRAPING, ENRICHING):

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

## Buttons

**Primary:** `bg-neutral-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-neutral-800`.

**Secondary/outline:** `border border-neutral-200 bg-white text-neutral-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-neutral-50`.

**Danger:** `bg-red-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-700`.

**Ghost:** `text-neutral-500 hover:text-neutral-900 text-sm`. No border, no background.

**Small (table actions):** `px-3 py-1.5 text-xs`.

## Inputs

```
border border-neutral-200 rounded-md px-3 py-2 text-sm bg-[#FAFAFA]
focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20
```

- API key inputs: add `font-mono` for monospace.
- Number inputs: add `tabular-nums`.
- Always a light gray background (`bg-[#FAFAFA]`) to distinguish from the white card surface.

## Filter Pills (above tables)

Small rounded pills for quick filtering:

- Active: `bg-neutral-900 text-white border border-neutral-900 rounded-full px-3 py-1 text-xs font-medium`
- Inactive: `border border-neutral-200 text-neutral-500 rounded-full px-3 py-1 text-xs font-medium hover:border-neutral-300`

## Slide-out Panel (Lead Detail)

Use shadcn `Sheet` component opening from the right side.
Width: `max-w-lg` (512px).
Content: sections separated by `border-b border-neutral-100` with `py-4` spacing.
Inline edit: click text → transforms into input → blur saves.

## Modals/Dialogs

Use shadcn `Dialog`. No custom styling needed beyond shadcn defaults. Keep them small and focused.

## Progress Bar

Simple horizontal bar inside a `h-2 bg-neutral-100 rounded-full` track. Fill with `bg-neutral-900 rounded-full` for general progress, or the accent blue for enrichment.

## Toasts

Use shadcn `toast` (Sonner). Dark background, white text. Bottom-right position.

## Empty States

Centered in the content area:
```
<div class="text-center py-12">
  <p class="text-neutral-400 text-sm">No campaigns yet.</p>
  <button class="mt-3 ...primary button styles...">Create your first campaign</button>
</div>
```

## What NOT to do

- No gradients anywhere
- No colored section headers or colored backgrounds on sections
- No shadows on cards (only on floating elements: modals, dropdowns, popovers)
- No rounded-xl or rounded-2xl (max: rounded-lg)
- No decorative icons or illustrations
- No loading spinners — use skeleton loaders (shadcn Skeleton)
- No emoji in the UI
- No "Welcome back!" or greeting messages
- No card-inside-card nesting
- No custom fonts or font imports
