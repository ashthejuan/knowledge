# UI Style Guide

Reference template for the Knowledge Base frontend. All UI work must follow these conventions.

![Design Reference](./assets/c__Users_ashth_AppData_Roaming_Cursor_User_workspaceStorage_3a2c51b0c590393fe9dd67d09eaf38c1_images_Screenshot_2026-06-02_151515-b8599400-5297-48da-9b35-ce0f41f7d7b0.png)

## Stack

| Layer          | Technology                                  |
| -------------- | ------------------------------------------- |
| Framework      | Next.js 16 (App Router, React Server Components) |
| Styling        | Tailwind CSS v4 (`@theme inline` blocks)    |
| Components     | shadcn/ui (Radix primitives, Mira style)    |
| Icons          | Phosphor (`@phosphor-icons/react`)          |
| Package runner | `npm` / `npx shadcn@latest`                |

## Preset

| Setting       | Value            |
| ------------- | ---------------- |
| Style         | Mira             |
| Base          | Radix            |
| Base Color    | Mist             |
| Theme         | Indigo           |
| Chart Color   | Indigo           |
| Heading Font  | Merriweather     |
| Body Font     | Merriweather     |
| Radius        | Default          |
| Menu Color    | Default          |
| Menu Accent   | Subtle           |
| Preset Code   | `b38oTUyJk`      |

Apply or restore the preset with:

```bash
npx shadcn@latest apply b38oTUyJk
```

## Color System

Use **semantic tokens only** — never raw color values like `bg-blue-500` or `text-gray-400`.

### Core Tokens

| Purpose              | Token                      |
| -------------------- | -------------------------- |
| Page background      | `bg-background`            |
| Primary text         | `text-foreground`          |
| Muted/secondary text | `text-muted-foreground`    |
| Card surface         | `bg-card`                  |
| Card text            | `text-card-foreground`     |
| Primary accent       | `bg-primary` / `text-primary` |
| On primary           | `text-primary-foreground`  |
| Secondary surface    | `bg-secondary`             |
| Borders              | `border-border`            |
| Input borders        | `border-input`             |
| Focus ring           | `ring-ring`                |
| Destructive actions  | `bg-destructive` / `text-destructive` |

### Status Colors

Use `Badge` variants or semantic classes — never hardcoded hex/tailwind colors.

| Status    | Approach                              |
| --------- | ------------------------------------- |
| Positive  | `<Badge variant="secondary">` or semantic success token |
| Negative  | `<Badge variant="destructive">`       |
| Neutral   | `<Badge variant="outline">`           |
| Info      | `<Badge variant="default">`           |

### Dark Mode

The template is a **dark-first design**. Do not add manual `dark:` overrides — the semantic tokens handle both modes automatically. The Mist base color provides the grey tint spectrum.

## Typography

| Element          | Font           | Weight    | Class Guidance                                   |
| ---------------- | -------------- | --------- | ------------------------------------------------ |
| Headings (h1-h4) | Merriweather   | Semibold+ | `font-heading` with `text-3xl`/`2xl`/`xl`/`lg`  |
| Body text        | Merriweather   | Regular   | `font-body` or default sans                      |
| Mono / code      | Geist Mono     | Regular   | `font-mono`                                      |
| Small labels     | Merriweather   | Medium    | `text-sm text-muted-foreground`                  |
| Large numbers    | Merriweather   | Bold      | `text-4xl font-bold tracking-tight`              |

Keep hierarchy clear: one `h1` per page, use `text-muted-foreground` for supporting text, and `text-foreground` for primary content.

## Layout Patterns

### Page Structure

```
┌─────────────────────────────────────────────┐
│  Sidebar  │         Main Content            │
│  (fixed)  │  ┌──────┐ ┌──────┐ ┌──────┐    │
│           │  │ Card │ │ Card │ │ Card │    │
│  nav      │  └──────┘ └──────┘ └──────┘    │
│  items    │  ┌────────────────────────────┐  │
│           │  │      Full-width Card       │  │
│           │  └────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

- Use `Sidebar` component for navigation
- Main content area uses responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Each content section is a `Card`
- Full-width sections span columns: `col-span-full` or `md:col-span-2`

### Spacing

Always use `gap-*` with flex/grid — never `space-x-*` or `space-y-*`.

| Context                 | Gap        |
| ----------------------- | ---------- |
| Between cards in grid   | `gap-4`    |
| Inside card content     | `gap-3`    |
| Between form fields     | `gap-4`    |
| Inline items (row)      | `gap-2`    |
| Page padding            | `p-4` to `p-6` |
| Section vertical rhythm | `gap-6`    |

### Cards

Use full `Card` composition for every content block:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>Supporting text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content here */}
  </CardContent>
  <CardFooter>
    {/* Actions here */}
  </CardFooter>
</Card>
```

Cards are the primary container for everything: charts, forms, tables, stats, settings panels.

## Component Conventions

### Buttons

```tsx
<Button>Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Tertiary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Danger</Button>
```

Icons in buttons always use `data-icon`:

```tsx
<Button>
  <PlusIcon data-icon="inline-start" />
  Add Item
</Button>
```

Never add sizing classes to icons inside components — the component handles sizing via CSS.

### Forms

Use `FieldGroup` and `Field` for layout, not raw divs:

```tsx
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="amount">Amount to Invest</FieldLabel>
    <Input id="amount" type="number" placeholder="$ 1,000.00" />
  </Field>
  <Field>
    <FieldLabel htmlFor="type">Order Type</FieldLabel>
    <Select>
      <SelectTrigger id="type">
        <SelectValue placeholder="Market Order" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="market">Market Order</SelectItem>
          <SelectItem value="limit">Limit Order</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </Field>
</FieldGroup>
```

Validation uses `data-invalid` on `Field` and `aria-invalid` on the control.

### Tables

Use the `Table` component for transaction lists and tabular data:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Description</TableHead>
      <TableHead>Date</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Blue Bottle Coffee</TableCell>
      <TableCell className="text-muted-foreground">Today, 10:24 AM</TableCell>
      <TableCell className="text-right">-$6.50</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Charts

Charts use the Indigo palette. Wrap Recharts with the `Chart` component. Bar charts and progress indicators are the primary visualization types in this template.

### Overlays

| Need              | Component     |
| ----------------- | ------------- |
| Modal dialog      | `Dialog`      |
| Side panel        | `Sheet`       |
| Bottom sheet      | `Drawer`      |
| Confirmation      | `AlertDialog` |
| Toast / feedback  | `sonner`      |

Every overlay must include a `Title` component (use `className="sr-only"` if visually hidden).

### Navigation

- `Sidebar` for primary nav (left rail)
- `Tabs` for in-page section switching (e.g., Overview / Payments tabs)
- `Breadcrumb` for hierarchical context
- Active nav items use the primary accent color

### Empty & Loading States

- Use `Skeleton` for loading placeholders
- Use `Empty` for zero-data states
- Use `Spinner` for inline loading indicators

## Sizing Shortcuts

- Equal width/height: use `size-*` (e.g., `size-10`) not `w-10 h-10`
- Truncation: use `truncate` not `overflow-hidden text-ellipsis whitespace-nowrap`
- Conditional classes: use `cn()` from `@/lib/utils` not template literal ternaries

## Imports

Use the `@/` alias for all project imports:

```tsx
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

Icons come from Phosphor:

```tsx
import { Plus, MagnifyingGlass, Gear } from "@phosphor-icons/react"
```

## React Server Components

This project uses `rsc: true`. Any component that uses `useState`, `useEffect`, event handlers, or browser APIs needs `"use client"` at the top of the file. Server Components are the default.

## Do / Don't Quick Reference

| Do                                           | Don't                                        |
| -------------------------------------------- | -------------------------------------------- |
| `bg-primary`, `text-muted-foreground`        | `bg-indigo-600`, `text-gray-400`             |
| `flex flex-col gap-4`                        | `space-y-4`                                  |
| `size-10`                                    | `w-10 h-10`                                  |
| `<Badge variant="secondary">`               | `<span className="text-emerald-600">`        |
| `<Separator />`                              | `<hr>` or `<div className="border-t">`       |
| `<Skeleton />`                               | Custom `animate-pulse` div                   |
| `cn("base", condition && "extra")`           | `` `base ${condition ? "extra" : ""}` ``     |
| `<Alert>` for callouts                       | Custom styled div for notices                |
| `toast()` from sonner                        | Custom toast implementation                  |
| Icons with `data-icon` in buttons            | Manual icon sizing classes inside components |
