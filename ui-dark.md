# Aether Design System

# Dark Mode Specification

Version 1.0

Companion to the Aether Design System

---

# Dark Mode Philosophy

Dark mode is not:

* Inverted light mode
* Pure black interfaces
* Neon cyberpunk aesthetics
* Gamer UI design

Dark mode should feel:

* Focused
* Professional
* Calm
* Technical
* Premium

The user should feel:

> "The interface disappears and lets me think."

The design goal is prolonged usage without fatigue.

Inspired by:

* Cursor
* Stripe Dashboard
* Linear
* Mistral
* Vercel
* GitHub Dark
* Raycast

---

# Core Principles

## 1. Darkness Creates Hierarchy

In light mode, hierarchy is created using shadows.

In dark mode, hierarchy is created using layers of brightness.

Think in surfaces rather than shadows.

---

## 2. Avoid Pure Black

Never use:

#000000

Pure black creates:

* Harsh contrast
* Eye strain
* Loss of depth

Instead use layered charcoal surfaces.

---

## 3. Contrast Must Be Controlled

Higher contrast does not equal better readability.

Too much contrast creates fatigue.

Use:

* Soft whites
* Layered grays
* Subtle separation

instead of extreme brightness.

---

## 4. Depth Through Elevation

Every elevation level should become slightly lighter.

Not darker.

Users should feel physical depth through brightness.

---

# Dark Theme Color System

## Foundation Layer

Primary Background

#0A0A0B

---

Secondary Background

#0F1115

---

Tertiary Background

#141821

---

Elevated Surface

#181D27

---

Highest Elevation

#202736

---

# Text System

## Primary Text

#F5F7FA

Used for:

* Headlines
* Important content
* Key metrics

---

## Secondary Text

#B6BEC9

Used for:

* Body text
* Descriptions
* Labels

---

## Tertiary Text

#7D8794

Used for:

* Metadata
* Timestamps
* Supporting information

---

## Disabled Text

#596273

---

# Border System

Subtle Border

#252D3D

---

Standard Border

#2F3746

---

Strong Border

#3B465A

---

# Accent Color Philosophy

Accent colors appear brighter in dark mode.

Reduce saturation slightly.

Never use neon colors.

---

## Primary Accent

Recommended:

#6E7BFF

Alternative:

#5B8CFF

---

## Accent Rules

Accent colors should occupy:

Less than 10% of the viewport

Purpose:

* Primary actions
* Active states
* Links
* Focus indicators

Not:

* Entire cards
* Large backgrounds
* Decorative effects

---

# Semantic Colors

Success

#2BC870

---

Warning

#F5B544

---

Error

#F05D5E

---

Info

#4A9EFF

---

# Surface Hierarchy

## Layer 0

Application background

#0A0A0B

---

## Layer 1

Panels

#0F1115

---

## Layer 2

Cards

#141821

---

## Layer 3

Dialogs

#181D27

---

## Layer 4

Command Menus

#202736

---

Every layer should be visually distinguishable.

---

# Typography

Typography remains identical to Light Mode.

Font:

Inter

Optional:

Inter + Geist

---

# Typography Rules

In dark mode:

Use fewer bold weights.

Prefer:

400
500
600

Avoid excessive 700 usage.

Heavy text appears visually heavier against dark surfaces.

---

# Shadows

Dark mode requires minimal shadows.

Instead use:

* Surface elevation
* Borders
* Brightness changes

---

## Small Shadow

0 2px 8px rgba(0,0,0,0.2)

---

## Medium Shadow

0 8px 24px rgba(0,0,0,0.25)

---

## Large Shadow

0 16px 48px rgba(0,0,0,0.3)

---

Use sparingly.

---

# Glow System

Glow should be functional.

Not decorative.

Allowed:

* Focus states
* AI processing indicators
* Active inputs

Forbidden:

* Decorative card glows
* Constant animations
* Neon effects

---

## Focus Glow

rgba(110,123,255,0.25)

Blur:

8px

---

# Buttons

## Primary

Background:

#6E7BFF

Text:

#FFFFFF

Hover:

#7D88FF

---

## Secondary

Background:

Transparent

Border:

#2F3746

Text:

#F5F7FA

Hover:

#141821

---

## Ghost

Transparent

Hover:

rgba(255,255,255,0.04)

---

# Inputs

Input Background

#141821

Border

#2F3746

Text

#F5F7FA

Placeholder

#7D8794

---

Focused Input

Border

#6E7BFF

Glow

rgba(110,123,255,0.15)

---

# Cards

Cards should feel:

Contained

Not floating

---

Default Card

Background

#141821

Border

#252D3D

Radius

16px

---

Hover Card

Background

#181D27

Border

#3B465A

---

# Tables

Dark mode tables must prioritize scanability.

---

Header

#181D27

---

Rows

Transparent

---

Hover

rgba(255,255,255,0.03)

---

Selected

rgba(110,123,255,0.08)

---

Avoid zebra striping.

Use spacing and borders instead.

---

# Sidebar Design

Sidebar Background

#0F1115

---

Active Item

#141821

Border Left

#6E7BFF

---

Hover Item

rgba(255,255,255,0.04)

---

# Navigation

Navigation should recede into the background.

Content should dominate.

Use:

Muted colors

Thin dividers

Minimal emphasis

---

# Command Palette

Inspired by:

* Cursor
* Raycast
* Linear

---

Background

#181D27

---

Border

#2F3746

---

Search Input

#202736

---

Selected Item

rgba(110,123,255,0.10)

---

# AI Interface Design

Dark mode is ideal for AI experiences.

Prioritize:

* Reading comfort
* Streaming output
* Source visibility
* Long-session usability

---

AI Responses

Background

Transparent

---

Sources

#7D8794

---

Reasoning Panels

#141821

---

Processing States

#6E7BFF

Opacity:

20%

---

# Charts & Analytics

Avoid bright chart colors.

Use:

Muted professional palette

---

Recommended Sequence

#6E7BFF

#4A9EFF

#2BC870

#F5B544

#F05D5E

#A78BFA

---

Grid Lines

rgba(255,255,255,0.08)

---

Axis Labels

#7D8794

---

# Motion

Motion rules remain identical.

Micro:
100ms

Standard:
200ms

Complex:
300ms

Maximum:
400ms

---

# Empty States

Dark mode should feel quieter.

Avoid:

Large illustrations

Use:

Simple iconography
Concise explanations
Single call-to-action

---

# Visual Effects

Allowed

✓ Soft gradients
✓ Subtle blur
✓ Layer elevation
✓ Focus glow
✓ Smooth transitions

---

Avoid

✗ Glassmorphism
✗ Neon glows
✗ RGB effects
✗ Cyberpunk aesthetics
✗ Heavy transparency

---

# Marketing Pages

Marketing pages may use richer gradients.

However:

Dashboard dark mode should remain restrained.

Separate marketing visuals from product visuals.

---

# Dark Mode Accessibility

Minimum Contrast

WCAG AA

---

Text should never fall below:

4.5:1 contrast ratio

---

Focus states must always be visible.

Keyboard users should never lose context.

---

# Dark Mode Design Rules

## The Cursor Rule

Focus over decoration.

---

## The Stripe Rule

Sophisticated restraint.

---

## The Linear Rule

Every pixel should serve a purpose.

---

## The GitHub Rule

Optimize for long working sessions.

---

## The Mistral Rule

Technical excellence through simplicity.

---

## The Aether Rule

Darkness should create calm.

Not drama.

---

# Final Validation Test

When a user opens dark mode, they should think:

> "This feels like software I can comfortably use for ten hours straight."

The interface should feel:

* Intelligent
* Focused
* Premium
* Trustworthy
* Effortless

Never flashy.

Never loud.

Never distracting.

Simply invisible.
