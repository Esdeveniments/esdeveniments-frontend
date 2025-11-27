# Type Definitions

This directory contains all TypeScript type definitions for the project. Types are organized by domain and follow strict rules to prevent duplication.

## Organization

### `types/common.ts`

- **Purpose**: Shared types used across multiple domains
- **Contains**:
  - UI component props (`NavigationItem`, `SocialLinks`, `CardProps`, etc.)
  - Utility types (`Option`, `PlaceType`, `Href`, etc.)
  - SEO types (`BreadcrumbItem`, `WebPageOptions`, `CollectionPageOptions`)
  - Image and performance types (`QualityOptions`, `ImagePerformanceMetrics`, etc.)

### `types/api/*.ts`

- **Purpose**: Backend API response types (DTOs)
- **Contains**:
  - `types/api/event.ts`: Event-related DTOs
  - `types/api/category.ts`: Category DTOs
  - `types/api/city.ts`: City DTOs (canonical `CitySummaryResponseDTO`)
  - `types/api/region.ts`: Region DTOs
  - `types/api/place.ts`: Place DTOs
  - `types/api/news.ts`: News DTOs

### `types/event.ts`

- **Purpose**: Event-specific types and form schemas
- **Contains**: Event form types, validation schemas, and event-related utilities

### `types/filters.ts`

- **Purpose**: URL filtering and filter configuration types
- **Contains**: Filter state, configuration, and error boundary types

### `types/url-filters.ts`

- **Purpose**: URL parsing and routing types
- **Contains**: URL segments, query parameters, and filter state types

### `types/schema.ts`

- **Purpose**: Schema.org structured data types
- **Contains**: JSON-LD schema types for SEO

## Rules

1. **No duplication**: Each type should be defined exactly once
2. **Domain separation**: API types in `types/api/`, UI types in `types/common.ts`
3. **Canonical sources**:
   - `CitySummaryResponseDTO` → `types/api/city.ts`
   - `NavigationItem` → `types/common.ts`
   - `SocialLinks` → `types/common.ts`
4. **Import from canonical sources**: Always import from the canonical location
5. **No types outside `/types`**: ESLint enforces this rule

## Linting Rules

The project includes ESLint rules that:

- Prevent type/interface declarations outside `/types/`
- Prevent duplicate interface definitions for common types
- Enforce unused variable detection in type files

## Migration Guide

When consolidating duplicate types:

1. Identify the canonical source (usually the most complete definition)
2. Move shared types to `types/common.ts`
3. Update all imports to use the canonical source
4. Remove duplicate definitions
5. Run `yarn typecheck` and `yarn lint` to verify

## Common Patterns

### API DTOs

```typescript
// ✅ Correct: Single canonical definition
export interface CitySummaryResponseDTO {
  id: number;
  name: string;
  slug: string;
  // ... other properties
}

// ❌ Wrong: Duplicate definition
export interface CitySummaryResponseDTO {
  /* duplicate */
}
```

### UI Props

```typescript
// ✅ Correct: In types/common.ts for shared usage
export interface NavigationItem {
  name: string;
  href?: Href;
  url?: string;
  current?: boolean;
}

// ❌ Wrong: Duplicate in multiple files
```

### Form Types

```typescript
// ✅ Correct: Domain-specific in types/event.ts
export interface FormData {
  title: string;
  description: string;
  // ... event-specific properties
}
```
