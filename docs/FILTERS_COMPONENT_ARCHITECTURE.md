# Filters Component Architecture Documentation

> **Status:** 📋 ARCHITECTURAL ANALYSIS - Reference Document
> **Purpose:** Detailed analysis of filters component structure and consolidation opportunities
> **Last Updated:** October 4, 2025
> **Note:** This document analyzes potential approaches. Implementation decisions should be documented here once made.

## Overview

The Filters component system is a complex, configuration-driven architecture for handling event filtering across the application. It consists of multiple components with overlapping functionality and significant code duplication.

## Current Component Structure

### Directory Layout

```
components/ui/
├── filters/                    # Server-side filters display
│   ├── index.tsx              # Exports ServerFilters
│   ├── ServerFilters.tsx      # Server-rendered filter display
│   ├── FilterButton.tsx       # Individual filter pill component
│   ├── FilterErrorBoundary.tsx # Error boundary wrapper
│   └── FilterButton.test.tsx  # Unit tests
├── filtersModal/              # Client-side filter modal
│   ├── index.tsx              # Exports NavigationFiltersModal
│   └── NavigationFiltersModal.tsx # Complex modal with form logic
└── domain/Filters/            # Domain component combining display + modal
    ├── index.ts               # Exports Filters component and types
    ├── Filters.tsx            # Client-side domain component
    └── Filters.test.tsx       # Unit tests

config/
└── filters.ts                 # Central filter configuration

utils/
├── filter-operations.ts       # Configuration-driven operations
├── filter-config.ts           # LEGACY - being phased out
├── filter-validation.ts       # Filter validation utilities
└── url-filters.ts             # URL manipulation utilities
```

### Component Responsibilities

| Component                | Purpose                         | Rendering | Key Features                                |
| ------------------------ | ------------------------------- | --------- | ------------------------------------------- |
| `ServerFilters`          | Display active filters for SEO  | Server    | Static filter pills, no interactivity       |
| `NavigationFiltersModal` | Modal form for filter selection | Client    | Complex form state, geolocation, validation |
| `Filters` (domain)       | Complete filtering experience   | Client    | Combines display + modal, accessibility     |
| `FilterButton`           | Individual filter pill          | Both      | Remove action, conditional styling          |
| `FilterErrorBoundary`    | Error handling wrapper          | Both      | Graceful degradation                        |

## Import/Export Patterns

### Current Usage

```typescript
// Main client-side usage (ClientInteractiveLayer)
import Filters from "@components/ui/domain/Filters";

// Server-side usage (if needed)
import ServerFilters from "@components/ui/filters";

// Modal-only usage (rare)
import NavigationFiltersModal from "@components/ui/filtersModal";
```

### Export Structure

- **Domain layer**: `components/ui/domain/Filters/index.ts` - Main public API
- **UI primitives**: `components/ui/filters/index.tsx` - Server component export
- **Modal component**: `components/ui/filtersModal/index.tsx` - Modal export

## Code Analysis: Duplication and Overlap

### Major Duplication Issues

#### 1. Filter State Conversion Logic

**Duplicated in both `ServerFilters.tsx` and `Filters.tsx`:**

```typescript
// Identical in both files (lines 17-25 in ServerFilters, 34-42 in Filters)
const filters = {
  place: segments.place || "catalunya",
  byDate: segments.date || "tots",
  category: segments.category || "tots",
  searchTerm: queryParams.search || "",
  distance: parseInt(queryParams.distance || "50"),
  lat: queryParams.lat ? parseFloat(queryParams.lat) : undefined,
  lon: queryParams.lon ? parseFloat(queryParams.lon) : undefined,
};
```

#### 2. FilterDisplayState Creation

**Duplicated in both components:**

```typescript
const displayState: FilterDisplayState = {
  filters,
  queryParams,
  segments,
  extraData: { categories, placeTypeLabel },
};
```

#### 3. Helper Functions

**Duplicated `isAnyFilterSelected` and `getText` functions:**

```typescript
const isAnyFilterSelected = (): boolean => {
  return FilterOperations.hasActiveFilters(displayState);
};

const getText = (value: string | undefined, defaultValue: string): string =>
  value || defaultValue;
```

#### 4. UI Rendering Logic

**Nearly identical JSX structure** for rendering filter pills, with only minor differences in event handlers and accessibility attributes.

### Configuration vs Implementation Overlap

- **`config/filters.ts`**: Central configuration (good)
- **`utils/filter-operations.ts`**: Operations using config (good)
- **`utils/filter-config.ts`**: Legacy duplicate being phased out (problematic)

## Identified Problems and Architectural Issues

### 1. Code Duplication

- **80% identical logic** between `ServerFilters` and domain `Filters`
- **State conversion logic** repeated across components
- **Helper functions** duplicated unnecessarily

### 2. Inconsistent Component Architecture

- **Three separate directories** for related functionality
- **Mixed concerns**: Domain component handles display + modal state
- **Inconsistent naming**: `ServerFilters` vs `Filters` (domain)

### 3. Legacy Code Accumulation

- **`filter-config.ts`** marked as legacy but still exists
- **Backward compatibility** code cluttering the codebase
- **Migration incomplete** leaving technical debt

### 4. Complex Modal Component

- **`NavigationFiltersModal.tsx`**: 370 lines of complex logic
- **Mixed responsibilities**: Form handling, geolocation, URL manipulation
- **Difficult to test and maintain**

### 5. Tight Coupling

- **Direct imports** between UI components and utilities
- **URL manipulation** logic scattered across components
- **Configuration changes** require updates in multiple places

### 6. Accessibility and UX Issues

- **Focus management** only in domain component
- **Keyboard navigation** not fully implemented
- **Screen reader support** inconsistent

## Potential Consolidation Approaches

### Approach 1: Unified Component with Variants

**Concept**: Create a single `Filters` component that renders in different modes.

**Implementation**:

```typescript
interface FiltersProps {
  mode: 'server' | 'client';
  segments: RouteSegments;
  queryParams: URLQueryParams;
  // ... other props
}

const Filters = ({ mode, ...props }: FiltersProps) => {
  const isServer = mode === 'server';

  // Shared logic here
  const displayState = useFilterDisplayState(props);

  if (isServer) {
    return <ServerFiltersDisplay {...displayState} />;
  }

  return (
    <ClientFiltersWrapper {...displayState}>
      <FiltersDisplay {...displayState} />
      <FiltersModal {...displayState} />
    </ClientFiltersWrapper>
  );
};
```

**Pros**:

- Single source of truth
- Eliminates duplication
- Clear API with mode prop

**Cons**:

- Large component handling multiple concerns
- Hydration complexity
- Breaking change for existing usage

### Approach 2: Extract Shared Logic into Hooks/Utilities

**Concept**: Keep separate components but extract common logic into reusable hooks.

**Implementation**:

```typescript
// New hook for shared display logic
const useFilterDisplayState = (props) => {
  // All the duplicated conversion logic here
  return { displayState, isAnyFilterSelected, getText };
};

// New hook for client state
const useFilterModalState = () => {
  // Modal state management logic
  return { isOpen, openModal, closeModal };
};
```

**Pros**:

- Maintains current component structure
- Reusable logic across components
- Easier testing of individual concerns

**Cons**:

- Still multiple components to maintain
- Hook dependencies and complexity
- Doesn't address architectural issues

### Approach 3: Complete Refactor with Composition

**Concept**: Break down into smaller, focused components with clear separation of concerns.

**New Structure**:

```
components/ui/filters/
├── FiltersProvider.tsx      # Context provider for state
├── FiltersDisplay.tsx       # Pure display component
├── FiltersModal.tsx         # Modal form component
├── FilterButton.tsx         # Individual filter pill
├── index.tsx               # Main composition component
└── hooks/
    ├── useFiltersState.ts
    ├── useFilterOperations.ts
    └── useFilterValidation.ts
```

**Pros**:

- Clear separation of concerns
- Highly testable components
- Flexible composition

**Cons**:

- Major breaking changes
- Complex migration
- Over-engineering for current needs

### Approach 4: Minimal Changes - Extract Shared Display Component

**Concept**: Create a shared `FiltersDisplay` component used by both server and client variants.

**Implementation**:

```typescript
// New shared component
const FiltersDisplay = ({ displayState, onOpenModal }) => {
  // All the duplicated UI logic here
  return (
    <div className="filters-container">
      {/* Filter pills rendering */}
    </div>
  );
};

// Update existing components to use it
const ServerFilters = (props) => {
  const displayState = createDisplayState(props);
  return <FiltersDisplay displayState={displayState} onOpenModal={props.onOpenModal} />;
};

const Filters = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const displayState = createDisplayState(props);

  return (
    <>
      <FiltersDisplay
        displayState={displayState}
        onOpenModal={() => setIsModalOpen(true)}
      />
      <NavigationFiltersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        // ... other props
      />
    </>
  );
};
```

**Pros**:

- Minimal changes to existing API
- Eliminates duplication
- Easy to implement incrementally

**Cons**:

- Still maintains multiple entry points
- Doesn't address modal complexity
- Partial solution

## Impact Assessment

### Approach 1: Unified Component

**Impact Level**: High
**Migration Effort**: 2-3 weeks
**Risk Level**: Medium (hydration issues possible)
**Benefits**: Complete consolidation, single API
**Breaking Changes**: Yes (mode prop required)

### Approach 2: Hooks/Utilities

**Impact Level**: Medium
**Migration Effort**: 1-2 weeks
**Risk Level**: Low
**Benefits**: Maintains compatibility, improves testability
**Breaking Changes**: No

### Approach 3: Complete Refactor

**Impact Level**: Very High
**Migration Effort**: 3-4 weeks
**Risk Level**: High
**Benefits**: Best architecture, maximum flexibility
**Breaking Changes**: Yes (major API changes)

### Approach 4: Minimal Changes

**Impact Level**: Low
**Migration Effort**: 3-5 days
**Risk Level**: Very Low
**Benefits**: Quick win, maintains compatibility
**Breaking Changes**: No

## Implementation Considerations

### Recommended Approach: Hybrid Solution

**Phase 1**: Implement Approach 4 (Extract Shared Display Component)

- Quick win eliminating 80% of duplication
- No breaking changes
- Builds foundation for future improvements

**Phase 2**: Implement Approach 2 (Hooks/Utilities)

- Extract modal state management
- Simplify NavigationFiltersModal
- Improve testability

**Phase 3**: Clean up legacy code

- Remove filter-config.ts
- Update imports
- Consolidate types

### Technical Considerations

1. **Server-Side Rendering**: Maintain SEO benefits of server-rendered filter display
2. **Hydration Safety**: Ensure client/server consistency
3. **Performance**: Minimize bundle size impact
4. **Accessibility**: Maintain and improve a11y features
5. **Testing**: Ensure comprehensive test coverage during changes

### Migration Strategy

1. **Create shared components** without removing existing ones
2. **Update imports gradually** (maintain backward compatibility)
3. **Add comprehensive tests** for new components
4. **Monitor performance** and SEO impact
5. **Clean up legacy code** after successful migration

### Success Metrics

- **Code duplication**: Reduce from 80% to <10%
- **Bundle size**: No significant increase
- **Test coverage**: Maintain >90%
- **Performance**: No regression in Core Web Vitals
- **SEO**: Maintain server-rendered filter visibility

## Conclusion

The current Filters architecture has significant duplication and architectural issues that should be addressed. A phased approach starting with extracting shared display logic (Approach 4) provides the best balance of benefits and risk, followed by hooks/utilities extraction (Approach 2) for better state management.

The recommended path maintains backward compatibility while establishing a foundation for future architectural improvements.
