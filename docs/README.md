# Design System Documentation

## 📚 Navigation

This folder contains complete design system documentation for the Tailwind CSS migration project.

---

## 🗂️ Document Index (6 Documents)

### 1. **[`design-system-overview.md`](./design-system-overview.md)** 🎯 START HERE

### WHAT & WHY

Quick overview of the project:

- Current problems (typography chaos, color inconsistency, shadows, spacing)
- Solution approach (semantic classes + professional design tokens)
- 7-week timeline
- Success criteria
- FAQ

**Audience**: Everyone (10 min read)

---

### 2. **[`implementation-reference.md`](./implementation-reference.md)** 📦 CODE REFERENCE

### ALL CODE & CONFIGURATION

Single source of truth for all code:

- Complete `tailwind.config.js` (Week 1)
- Complete `globals.css` with semantic classes (Week 1)
- Class reference guide (typography, buttons, cards, badges, layout)
- Anti-patterns and migration patterns

**Audience**: Developers (daily reference), AI agents

---

### 3. **[`reference-data.md`](./reference-data.md)** 📊 LOOKUP TABLES

### PURE DATA

All lookup tables in one place:

- Gray-to-semantic mapping table (112 instances)
- Component inventory with priorities (88 components)
- Per-file checklists
- Weekly targets

**Audience**: Developers (Week 3 colors), AI agents

---

### AI-SPECIFIC WORKFLOW

Batch workflow for AI implementation:

- AI implements → User verifies → Iterate
- Per-batch output template
- References to other docs (not duplication)
- AI-specific tips (context retention, error handling)

**Audience**: AI agents (primary)

---

### 5. **[`.github/copilot-instructions.md`](../.github/copilot-instructions.md)** 🛡️ AI RULES

### MANDATORY FOR AI AGENTS

Section 20: Design System Conventions

- Typography, colors, buttons, cards rules
- Forbidden patterns
- Examples

**Audience**: AI agents (auto-enforced)

---

## 🚀 Quick Start

### For Developers Starting Migration

1. Read: **design-system-overview.md** (10 min) - Understand WHAT & WHY
2. Reference: **implementation-reference.md** (bookmark) - Get code for Week 1
3. Lookup: **reference-data.md** - Gray mappings, component priorities

### For AI Agents

1. **Reference**: **implementation-reference.md** - Get all code
2. **Lookup**: **reference-data.md** - Gray mappings, component inventory
3. **Rules**: **.github/copilot-instructions.md** Section 20 - Mandatory design system rules

---

## 📋 Single Source of Truth

Each topic has ONE authoritative document:

| Topic         | Source of Truth                 | Other Docs          |
| ------------- | ------------------------------- | ------------------- |
| WHAT & WHY    | design-system-overview.md       | -                   |
| ALL CODE      | implementation-reference.md     | Others reference it |
| LOOKUP TABLES | reference-data.md               | Others link to it   |
| AI RULES      | .github/copilot-instructions.md | -                   |

**Zero duplication**: Update one place, reflects everywhere.

---

## 🎯 Key Metrics

### Implementation Effort

- **Timeline**: 7 weeks (1 week pre-flight + 6 weeks implementation)
- **Components**: 88 components to migrate
- **Gray Instances**: 112 to replace with semantic colors
- **Quick Wins**: 3 hours (Week 1) for professional design

### Success Criteria

- ✅ 88/88 components migrated
- ✅ 0 generic gray classes
- ✅ All tests passing
- ✅ 30% reduction in className length
- ✅ Professional shadows, spacing, transitions
- ✅ Visual quality: C+ → A

---

## 📖 Documentation Structure

```text
README.md (this file - navigation)
│
├── design-system-overview.md (WHAT & WHY)
│   └── Problems, solution, timeline, FAQ
│
├── implementation-reference.md (ALL CODE)
│   └── tailwind.config.js, globals.css, class reference
│
├── reference-data.md (LOOKUP TABLES)
│   └── Gray mappings, component inventory
│
├── .github/copilot-instructions.md (AI PROCESS & RULES)
│   ├── Batch workflow, templates, tips
│   └── Section 20: Design system conventions
```

---

## 🆘 Need Help?

1. **Don't know where to start?** → Read design-system-overview.md
2. **Need Week 1 code?** → See implementation-reference.md
3. **Looking for gray mapping?** → Check reference-data.md

---

## 📊 Before/After Consolidation

### OLD Structure (9 documents, ~7,800 lines)

- ⚠️ High duplication (Week 0 in 3 places)
- ⚠️ Unclear which doc is source of truth
- ⚠️ Maintenance overhead (update 3-4 docs per change)

### NEW Structure (6 documents, ~2,900 lines)

- ✅ Zero duplication
- ✅ Clear single source of truth
- ✅ 67% less content
- ✅ Update 1 place per change

---

**Status**: ✅ Consolidated and ready for implementation  
**Last Updated**: October 2025

---

## 🔒 Guardrails (Enforcement)

- CI must pass: `yarn typecheck && yarn lint && yarn test`.
- Failure criteria:
  - Any usage of `text-gray-*`, `bg-gray-*`, `border-gray-*` in app/components.
  - Repetitive flex patterns not replaced by semantic utilities where available.
  - Long button class strings instead of `.btn-*` or `<Button variant="...">`.
- Quick checks:
  - Count gray usage: see commands in `reference-data.md`.
  - Count semantic usage: see commands in `reference-data.md`.
- Phased enforcement:
  - Week 3+: error on `gray-*` in changed files via CI grep (see `reference-data.md`).
  - Week 7+: repo-wide enforcement; PR removes legacy aliases.

## 🖼️ Visual Regression Testing

- Tool: Playwright screenshots (already in repo).
- Week 0: record baselines for 10 key pages.
- Per PR: compare against baseline; diffs must be acknowledged or fixed.

## 🧭 Decisions (Canonical)

- Color tokens: `background`, `foreground`, `foreground-strong`, `muted`, `border`, `primary-foreground`.
- Legacy aliases (during migration only): `whiteCorp`, `darkCorp`, `blackCorp`, `fullBlackCorp`, `bColor`.
- Primary dark token: `primary-dark` (hyphen).
- Stack spacing: `.stack = flex flex-col gap-element-gap`.
- Border radius tokens: button 8px, card 12px, input 8px, badge full.

## 🔗 Quick Links

- Change tokens: `tailwind.config.js` (see `implementation-reference.md`).
- Add semantic classes: `styles/globals.css` (see `implementation-reference.md`).
