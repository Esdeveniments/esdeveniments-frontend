# Restaurant Promotion Database Schema

This document outlines the database schema required for the restaurant promotion system. Since this is a frontend implementation, the backend team should implement these database structures.

## Tables

### restaurant_leads

Stores restaurant promotion leads and their status.

```sql
CREATE TABLE restaurant_leads (
    id VARCHAR(255) PRIMARY KEY,
    restaurant_name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    display_duration_days INTEGER NOT NULL,
    geo_scope_type ENUM('town', 'region') NOT NULL,
    geo_scope_id VARCHAR(255) NOT NULL,
    image_public_id VARCHAR(255) NOT NULL,
    image_secure_url VARCHAR(500) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    place_id VARCHAR(255) NULL, -- Google Places ID
    status ENUM('pending_payment', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'pending_payment',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    stripe_session_id VARCHAR(255) NULL,
    stripe_payment_intent_id VARCHAR(255) NULL,

    INDEX idx_event_id (event_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at),
    INDEX idx_geo_scope (geo_scope_type, geo_scope_id)
);
```

### restaurant_promotions

Stores active restaurant promotions for quick lookup.

```sql
CREATE TABLE restaurant_promotions (
    id VARCHAR(255) PRIMARY KEY,
    lead_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    restaurant_name VARCHAR(255) NOT NULL,
    location VARCHAR(500) NOT NULL,
    image_public_id VARCHAR(255) NOT NULL,
    image_secure_url VARCHAR(500) NOT NULL,
    geo_scope_type ENUM('town', 'region') NOT NULL,
    geo_scope_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (lead_id) REFERENCES restaurant_leads(id),
    INDEX idx_event_id (event_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_geo_scope (geo_scope_type, geo_scope_id)
);
```

### geo_scope_mappings

Maps geo scope IDs to actual event IDs or boundaries.

```sql
CREATE TABLE geo_scope_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    geo_scope_type ENUM('town', 'region') NOT NULL,
    geo_scope_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_mapping (geo_scope_type, geo_scope_id, event_id),
    INDEX idx_geo_scope (geo_scope_type, geo_scope_id),
    INDEX idx_event_id (event_id)
);
```

## API Endpoints to Implement

### GET /api/promotions/active?eventId={eventId}

Returns active promotion for a specific event.

```typescript
interface ActivePromotionResponse {
  promotion: ActivePromotion | null;
}
```

### POST /api/promotions/activate

Activates a promotion after successful payment (called by webhook).

```typescript
interface ActivatePromotionRequest {
  leadId: string;
  eventId: string;
  durationDays: number;
  geoScopeType: "town" | "region";
  geoScopeId: string;
}
```

### GET /api/geo-scopes/{type}/{id}/events

Returns event IDs that match a geo scope.

```typescript
interface GeoScopeEventsResponse {
  eventIds: string[];
  totalCount: number;
}
```

## Environment Variables Required

```bash
# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=eur
STRIPE_TAX_MODE=automatic # or 'manual'
STRIPE_MANUAL_TAX_RATE_IDS=txr_123,txr_456 # comma-separated for manual mode

# Site URL for Stripe redirects
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Pricing Configuration

The pricing matrix is configured in `config/pricing.ts` and can be overridden via environment variables:

- `STRIPE_CURRENCY`: Currency code (default: eur)
- `STRIPE_TAX_MODE`: Tax calculation mode (automatic/manual)
- `STRIPE_MANUAL_TAX_RATE_IDS`: Comma-separated Stripe tax rate IDs for manual mode

## Compliance Notes

### Google Places API

- Only store `place_id` indefinitely
- Store `lat/lng` for maximum 30 days
- Do not persist names, addresses, ratings, or photos
- Always show required attribution

### Stripe

- Verify webhook signatures with raw request body
- Handle idempotency for webhook events
- Store payment metadata for reconciliation

### Cloudinary

- Use signed uploads for security
- Store only `public_id` and `secure_url`
- Apply image transformations for consistency
