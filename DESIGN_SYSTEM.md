# Design System - Que-Fer

## Overview

Aquest document descriu el sistema de disseny unificat per a l'aplicació Que-Fer, implementat per garantir coherència visual i mantenibilitat del codi.

## Tokens de Disseny

### Colors

#### Core Brand Colors

| Token         | Valor     | Ús                        |
| ------------- | --------- | ------------------------- |
| `primary`     | #FF0037   | Color principal (accent)  |
| `primarydark` | #C8033F   | Variant fosc del primary  |
| `primarySoft` | #FF003750 | Primary amb transparència |
| `secondary`   | #6B7280   | Color secundari           |

#### Neutral Colors

| Token           | Valor                         | Ús                                |
| --------------- | ----------------------------- | --------------------------------- |
| `whiteCorp`     | #ffffff                       | Blanc corporatiu                  |
| `darkCorp`      | #F7F7F7                       | Gris clar corporatiu              |
| `blackCorp`     | rgb(69 69 69 / <alpha-value>) | Negre corporatiu amb suport alpha |
| `fullBlackCorp` | rgb(0 0 0 / <alpha-value>)    | Negre complet amb suport alpha    |
| `bColor`        | #cccccc                       | Color de border                   |

#### Extended Gray Scale

| Token      | Valor   | Ús                 |
| ---------- | ------- | ------------------ |
| `gray-50`  | #F9FAFB | Gris molt clar     |
| `gray-100` | #F3F4F6 | Gris clar          |
| `gray-200` | #E5E7EB | Gris suau          |
| `gray-300` | #D1D5DB | Gris mitjà clar    |
| `gray-400` | #9CA3AF | Gris mitjà         |
| `gray-500` | #6B7280 | Gris mitjà fosc    |
| `gray-600` | #4B5563 | Gris fosc          |
| `gray-700` | #374151 | Gris molt fosc     |
| `gray-800` | #1F2937 | Gris gairebé negre |
| `gray-900` | #111827 | Gris quasi negre   |

#### Semantic Colors

| Token     | Valor   | Ús                  |
| --------- | ------- | ------------------- |
| `success` | #10B981 | Èxit, confirmacions |
| `warning` | #F59E0B | Avisos, atenció     |
| `error`   | #EF4444 | Errors, perills     |

#### Interactive States

| Token              | Valor     | Ús                         |
| ------------------ | --------- | -------------------------- |
| `primary-hover`    | #C8033F   | Hover state del primary    |
| `primary-focus`    | #FF0037AA | Focus state del primary    |
| `primary-active`   | #A8033F   | Active state del primary   |
| `primary-disabled` | #cccccc   | Disabled state del primary |

### Espaiat (Spacing)

#### Standardized Spacing Scale

Aquest sistema de disseny utilitza una escala estandarditzada de 8 valors d'espaiat per garantir consistència visual i reduir la complexitat. L'escala està dissenyada per ser responsive, amb valors base per mòbil/tablet i valors md per escriptori.

| Token | Valor Base    | Valor MD      | Equivalent Tailwind | Ús                        |
| ----- | ------------- | ------------- | ------------------- | ------------------------- |
| `xs`  | 0.25rem (4px) | 0.5rem (8px)  | 1/2                 | Espais mínims, detalls    |
| `sm`  | 0.5rem (8px)  | 1rem (16px)   | 2/4                 | Espais petits, components |
| `md`  | 1rem (16px)   | 1.5rem (24px) | 4/6                 | Espais mitjans, cards     |
| `lg`  | 1.5rem (24px) | 2rem (32px)   | 6/8                 | Espais grans, seccions    |
| `xl`  | 2rem (32px)   | 2.5rem (40px) | 8/10                | Espais extra grans        |
| `2xl` | 2.5rem (40px) | 3rem (48px)   | 10/12               | Hero elements             |
| `3xl` | 3rem (48px)   | 4rem (64px)   | 12/16               | Espais hero, banners      |
| `4xl` | 4rem (64px)   | 6rem (96px)   | 16/24               | Espais màxims, pàgines    |

#### Component Spacing (Legacy - Migrating to Standardized Scale)

| Token           | Valor          | Ús                     |
| --------------- | -------------- | ---------------------- |
| `component-xs`  | 0.5rem (8px)   | Espais petits, borders |
| `component-sm`  | 0.75rem (12px) | Botons, inputs         |
| `component-md`  | 1rem (16px)    | Cards, seccions        |
| `component-lg`  | 1.5rem (24px)  | Containers             |
| `component-xl`  | 2rem (32px)    | Espais grans           |
| `component-2xl` | 3rem (48px)    | Hero sections          |

#### Layout Spacing

| Token            | Valor         | Ús                               |
| ---------------- | ------------- | -------------------------------- |
| `page-x`         | 1rem (16px)   | Padding horitzontal de pàgina    |
| `page-y`         | 2rem (32px)   | Padding vertical de pàgina       |
| `page-top`       | 2rem (32px)   | Marge superior estàndard         |
| `page-top-large` | 4rem (64px)   | Marge superior gran              |
| `section-x`      | 1.5rem (24px) | Padding horitzontal de secció    |
| `section-y`      | 3rem (48px)   | Padding vertical de secció       |
| `section-gap`    | 1.5rem (24px) | Gap entre seccions               |
| `container-x`    | 1rem (16px)   | Padding horitzontal de container |
| `container-x-lg` | 1.5rem (24px) | Padding horitzontal gran         |
| `container-y`    | 1.5rem (24px) | Padding vertical de container    |

#### Gaps and Margins (Legacy - Migrating to Standardized Scale)

| Token       | Valor         | Ús                 |
| ----------- | ------------- | ------------------ |
| `gap-xs`    | 0.25rem (4px) | Gaps molt petits   |
| `gap-sm`    | 0.5rem (8px)  | Gaps petits        |
| `gap-md`    | 1rem (16px)   | Gaps mitjans       |
| `gap-lg`    | 1.5rem (24px) | Gaps grans         |
| `gap-xl`    | 2rem (32px)   | Gaps molt grans    |
| `margin-xs` | 0.5rem (8px)  | Marges petits      |
| `margin-sm` | 1rem (16px)   | Marges mitjans     |
| `margin-md` | 1.5rem (24px) | Marges grans       |
| `margin-lg` | 2rem (32px)   | Marges molt grans  |
| `margin-xl` | 3rem (48px)   | Marges extra grans |

#### Spacing Token Usage

```tsx
import { spacing } from "@/types/ui/spacing";

// Direct token usage
<div className={`p-${spacing.sm.base} md:p-${spacing.sm.md}`}>
  Content with responsive spacing
</div>

// In component props
<Card padding="md" gap="sm">
  <div className="space-y-sm">Items</div>
</Card>
```

#### Migration from Arbitrary Values

```tsx
// Before (41 different values)
<div className="p-4 mb-2 px-6 py-3 mt-1">
  Content
</div>

// After (Standardized scale)
<div className="p-md mb-sm px-lg py-md mt-xs">
  Content
</div>
```

### Tipografia

| Token       | Valor                                            | Ús                |
| ----------- | ------------------------------------------------ | ----------------- |
| `heading-1` | 2.25rem, line-height: 2.5rem, font-weight: 700   | Títols principals |
| `heading-2` | 1.875rem, line-height: 2.25rem, font-weight: 600 | Subtítols         |
| `heading-3` | 1.5rem, line-height: 2rem, font-weight: 600      | Títols de secció  |
| `body-lg`   | 1.125rem, line-height: 1.75rem                   | Text gran         |
| `body-md`   | 1rem, line-height: 1.5rem                        | Text normal       |
| `body-sm`   | 0.875rem, line-height: 1.25rem                   | Text petit        |
| `caption`   | 0.75rem, line-height: 1rem                       | Text auxiliar     |

## Components

### Button

Component botó reutilitzable amb variants estandarditzades per accions interactives.

#### Variants

| Variant     | Ús                                                               | Exemple d'ús                    |
| ----------- | ---------------------------------------------------------------- | ------------------------------- |
| `primary`   | Accions principals, CTAs, confirmacions                          | "Reservar", "Comprar", "Enviar" |
| `secondary` | Accions secundàries, opcions alternatives                        | "Cancel·lar", "Tornar"          |
| `outline`   | Accions menys prominents, en contextos amb fons                  | "Veure més", "Editar"           |
| `muted`     | Accions subtils, en backgrounds foscos o per jerarquia baixa     | "Tancar", "Ocultar"             |
| `solid`     | Equivalent a primary, per casos especials on es necessita èmfasi | Accions crítiques en overlays   |

#### Sizes

| Size | Ús                        | Dimensions   |
| ---- | ------------------------- | ------------ |
| `sm` | Espais petits, dins cards | Height: 32px |
| `md` | Mida estàndard (default)  | Height: 36px |
| `lg` | Accions principals, hero  | Height: 40px |

#### Patterns d'Ús

```tsx
import { Button } from "@/components/ui/primitives/Button";

// Accions principals
<Button variant="primary" size="lg">Reservar Entrada</Button>

// Accions secundàries
<Button variant="secondary">Cancel·lar</Button>

// Accions en contextos amb fons
<Button variant="outline">Veure Detalls</Button>

// Accions subtils
<Button variant="muted" size="sm">Tancar</Button>

// Botons amb icones
<Button variant="primary" hasIcon>
  <Icon name="star" />
  Afegir Favorit
</Button>

// Estat de càrrega
<Button variant="primary" isLoading>Processant...</Button>

// Botons deshabilitats
<Button variant="primary" disabled>Entrades Esgotades</Button>
```

#### Loading States

Utilitza `isLoading` per mostrar feedback durant operacions asíncrones:

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await submitForm();
  } finally {
    setIsSubmitting(false);
  }
};

return (
  <Button variant="primary" isLoading={isSubmitting} onClick={handleSubmit}>
    {isSubmitting ? "Enviant..." : "Enviar"}
  </Button>
);
```

#### Icon Usage

- Utilitza `hasIcon` quan el botó conté una icona per ajustar el padding
- Les icones han d'estar alineades amb el text
- Mida recomanada: 16px per botons normals, 14px per `size="sm"`

```tsx
<Button variant="outline" hasIcon size="sm">
  <SearchIcon className="h-4 w-4" />
  Cercar
</Button>
```

#### Accessibility

- Els botons inclouen `aria-busy` quan `isLoading` és true
- Suport complet per atributs HTML natius (`disabled`, `type`, etc.)
- Focus visible amb anells de focus accessibles
- Contrast de color adequat per tots els variants

#### Guidelines

- **Jerarquia**: Utilitza primary per accions principals, secondary per alternatives
- **Espaiat**: Mantén consistència amb `component-sm` i `component-md`
- **Context**: Outline funciona bé en backgrounds foscos o amb imatges
- **Mòbil**: Considera `size="lg"` per millor usabilitat tàctil
- **Loading**: Sempre mostra feedback per accions que triguen >1s

### Text

Component de text per normalitzar la tipografia.

```tsx
import { Text } from "@/components/ui/primitives/Text";

<Text variant="h1">Títol Principal</Text>
<Text variant="body">Text normal del cos</Text>
<Text variant="caption">Text auxiliar petit</Text>
```

### Card

Component unificat contenidor amb múltiples tipus i variants per diferents casos d'ús.

#### Basic Card

```tsx
import { Card } from "@/components/ui/primitives/Card";

<Card type="basic" variant="elevated" padding="md">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>;
```

#### Event Cards

```tsx
// Vertical event card
<Card type="event-vertical" event={eventData} />

// Horizontal event card
<Card type="event-horizontal" event={eventData} />

// Compact event card
<Card type="compact" event={eventData} />
```

#### News Cards

```tsx
// Default news card
<Card type="news-default" event={newsData} placeSlug="barcelona" />

// Hero news card
<Card type="news-hero" event={newsData} placeSlug="barcelona" />

// Rich news card
<Card type="news-rich" event={newsEventData} variant="horizontal" numbered={1} />
```

#### Loading State

```tsx
<Card type="loading" />
```

**Tipus disponibles:**

- `basic`: Card bàsica amb variants de visualització
- `event-vertical`: Card d'esdeveniment vertical
- `event-horizontal`: Card d'esdeveniment horitzontal
- `news-default`: Card de notícia estàndard
- `news-hero`: Card de notícia hero
- `news-rich`: Card de notícia rica amb variants
- `ad`: Card de contingut patrocinat
- `compact`: Card d'esdeveniment compacta
- `loading`: Estat de càrrega

### ShareButton

Component unificat per compartir contingut amb múltiples estratègies i variants.

```tsx
import { ShareButton } from "@/components/ui/primitives";

// Auto mode (detects device capabilities)
<ShareButton slug="event-slug" />

// Native sharing (mobile with Web Share API)
<ShareButton slug="event-slug" strategy="native" />

// Social media sharing
<ShareButton slug="event-slug" strategy="social" />

// Static sharing (direct app links)
<ShareButton slug="event-slug" strategy="static" compact={true} />
```

**Variants:**

- `auto`: Detecta automàticament la millor estratègia (default)
- `native`: Utilitza Web Share API quan està disponible
- `social`: Botons de xarxes socials (Telegram, WhatsApp, Facebook, Twitter)
- `static`: Enllaços directes a apps (WhatsApp, SMS, Email, Telegram)

**Props:**

- `slug`: Slug de l'esdeveniment (requerit)
- `strategy`: Estratègia de compartir (auto, native, social, static)
- `title`: Títol personalitzat
- `description`: Descripció personalitzada
- `date`: Data de l'esdeveniment
- `location`: Ubicació de l'esdeveniment
- `subLocation`: Sub-ubicació
- `onShareClick`: Callback quan es fa clic
- `hideText`: Amaga el text del botó
- `compact`: Mode compact per static strategy

### Skeleton

Component de càrrega amb múltiples variants per diferents tipus de contingut.

```tsx
import { Skeleton } from "@/components/ui/primitives/Skeleton";

// Card skeleton
<Skeleton variant="card" />

// Text skeleton
<Skeleton variant="text" />

// Avatar skeleton
<Skeleton variant="avatar" />
```

**Variants disponibles:**

- `card`: Skeleton per cards d'esdeveniments
- `text`: Skeleton per text (default)
- `avatar`: Skeleton per avatars circulars

### Input

Component d'input reutilitzable amb variants per diferents estats de validació.

```tsx
import { Input } from "@/components/ui/primitives/Input";

<Input
  id="email"
  label="Correu electrònic"
  type="email"
  placeholder="exemple@domini.com"
/>

<Input
  id="name"
  label="Nom"
  error="Aquest camp és obligatori"
  required
/>

<Input
  id="message"
  label="Missatge"
  helperText="Màxim 500 caràcters"
  multiline
/>
```

**Variants:**

- `default`: Estat normal
- `error`: Estat d'error
- `success`: Estat d'èxit

### Badge

Component de badge amb múltiples variants i mides per etiquetes i estats.

```tsx
import { Badge } from "@/components/ui/primitives/Badge";

// Variants
<Badge variant="default">Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>

// Clickable badge
<Badge onClick={handleClick}>Clickable</Badge>

// Badge as link
<Badge href="/category">Link Badge</Badge>
```

### FormField

Wrapper component per normalitzar la presentació de camps de formulari.

```tsx
import { FormField } from "@/components/ui/primitives/FormField";

<FormField
  id="username"
  label="Nom d'usuari"
  error="Aquest camp és obligatori"
  required
  helperText="El nom d'usuari ha de tenir almenys 3 caràcters"
>
  <Input id="username" />
</FormField>;
```

### Select

Component de select amb cerca i creació d'opcions noves.

```tsx
import { Select } from "@/components/ui/primitives/Select";

<Select
  id="category"
  label="Categoria"
  options={[
    { value: "music", label: "Música" },
    { value: "sports", label: "Esports" },
    { value: "art", label: "Art" },
  ]}
  onChange={(option) => console.log(option)}
  placeholder="Selecciona una categoria"
/>;
```

### Textarea

Component de textarea amb funcionalitat de previsualització i comptador de caràcters.

```tsx
import { Textarea } from "@/components/ui/primitives/Textarea";

<Textarea
  id="description"
  label="Descripció"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  maxLength={1000}
  showPreview
/>;
```

### DatePicker

Component de selector de dates amb suport per rangs.

```tsx
import { DatePicker } from "@/components/ui/primitives/DatePicker";

<DatePicker
  id="event-date"
  label="Data de l'esdeveniment"
  startDate={startDate}
  endDate={endDate}
  onChange={(field, value) => setDate(field, value)}
  required
/>;
```

### Modal

Component de modal accessible amb múltiples opcions de configuració.

```tsx
import { Modal } from "@/components/ui/primitives/Modal";

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirmar acció"
  description="Estàs segur que vols continuar?"
  size="md"
>
  <p>Contingut del modal</p>
  <Button onClick={handleConfirm}>Confirmar</Button>
</Modal>;
```

### AdArticle

Component per mostrar anuncis amb suport per Google Adsense i AdBoard.

```tsx
import AdArticle from "@/components/ui/primitives/AdArticle";

<AdArticle slot="1234567890" isDisplay={true} />;
```

### Filters

Component de filtres reutilitzable per llistes i cerques.

```tsx
import { Filters } from "@/components/ui/primitives/Filters";

<Filters
  categories={categories}
  onFilterChange={handleFilterChange}
  currentFilters={filters}
/>;
```

### ViewCounter

Component per mostrar el comptador de visites d'un esdeveniment.

```tsx
import { ViewCounter } from "@/components/ui/primitives/ViewCounter";

<ViewCounter visits={1234} />;
```

### Grid

Component de grid responsive per layouts.

```tsx
import { Grid } from "@/components/ui/primitives/Grid";

<Grid columns={{ sm: 1, md: 2, lg: 3 }} gap="md">
  {items.map((item) => (
    <Card key={item.id} type="basic">
      {item.content}
    </Card>
  ))}
</Grid>;
```

## Guies d'Ús

### Colors

- Utilitza sempre els tokens de color en lloc de valors hardcoded
- Evita colors grisos arbitraris - utilitza `blackCorp` amb opacitat
- Per backgrounds: `bg-darkCorp`, `bg-whiteCorp`
- Per text: `text-blackCorp`, `text-blackCorp/60`

### Espaiat

- Utilitza l'escala estandarditzada de 8 valors (xs, sm, md, lg, xl, 2xl, 3xl, 4xl)
- `xs/sm` per espais petits i detalls
- `md/lg` per components i seccions principals
- `xl/2xl` per espais grans i hero elements
- `3xl/4xl` per espais màxims i layouts de pàgina
- Evita valors arbitraris de Tailwind (p-4, m-2, etc.)

### Tipografia

- Utilitza el component `Text` per tot el text
- Fonts: `font-roboto` per cos, `font-barlow` per títols
- Mides: Utilitza els tokens semàntics en lloc de classes numèriques

## Configuració de Desenvolupament

### Prettier

Configurat per ordenar automàticament les classes Tailwind:

```json
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["clsx", "cn", "cva"]
}
```

### ESLint

Regles per prevenir regressions:

```json
{
  "no-restricted-syntax": [
    "warn",
    {
      "selector": "Literal[value=/text-gray-/]",
      "message": "Use design tokens instead of hardcoded gray text colors"
    }
  ]
}
```

### VSCode

Configuració recomanada:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "\"([^\"]*)\""]
  ]
}
```

## Migració

### De colors hardcoded

```tsx
// Abans
<div className="text-gray-700 bg-gray-100 border-gray-300">

// Després
<div className="text-blackCorp bg-darkCorp border-bColor">
```

### De classes d'espaiat arbitraris

```tsx
// Abans (41 valors diferents)
<div className="p-4 m-2 px-6 py-3">
  <div className="mt-1 mb-2">Content</div>
</div>

// Després (escala estandarditzada)
<div className="p-md m-sm px-lg py-md">
  <div className="mt-xs mb-sm">Content</div>
</div>
```

### De classes de font arbitraris

```tsx
// Abans
<h1 className="text-2xl font-bold">Títol</h1>

// Després
<Text variant="h1">Títol</Text>
```

## Beneficis

✅ **Coherència visual** - Tots els components segueixen les mateixes regles
✅ **Mantenibilitat** - Canvis centrals afecten tota l'app
✅ **Escalabilitat** - Fàcil afegir nous components
✅ **Productivitat** - Menys decisions de disseny per prendre
✅ **Accessibilitat** - Tokens dissenyats amb accessibilitat en ment

## Testing Coverage

El sistema de disseny inclou una suite completa de tests per garantir la qualitat i consistència dels components.

### Test Files

| Component/Test                     | Descripció                                 |
| ---------------------------------- | ------------------------------------------ |
| `card.test.tsx`                    | Tests del component Card unificat          |
| `filter-button.test.tsx`           | Tests dels botons de filtre                |
| `filter-system.test.ts`            | Tests del sistema de filtres               |
| `image.test.tsx`                   | Tests del component d'imatges              |
| `link.test.tsx`                    | Tests dels enllaços                        |
| `meta-helpers.test.ts`             | Tests dels helpers de meta                 |
| `restaurant-promotion.test.ts`     | Tests de promocions de restaurants         |
| `search-component.test.tsx`        | Tests del component de cerca               |
| `text.test.tsx`                    | Tests del component Text                   |
| `url-filters.test.ts`              | Tests dels filtres d'URL                   |
| `calendar-utils.test.tsx`          | Tests dels utils de calendari              |
| `distance-to-radius.test.ts`       | Tests de conversió distància-radius        |
| `event-status.test.ts`             | Tests d'estats d'esdeveniments             |
| `api-events.test.ts`               | Tests de l'API d'esdeveniments             |
| `sw-generation.test.ts`            | Tests de generació del service worker      |
| **Primitives Tests**               |                                            |
| `Button/Button.test.tsx`           | Tests del component Button amb variants    |
| `Input/Input.test.tsx`             | Tests del component Input amb validació    |
| `Badge/Badge.test.tsx`             | Tests del component Badge amb interaccions |
| `FormField/FormField.test.tsx`     | Tests del wrapper FormField                |
| `Select/Select.test.tsx`           | Tests del component Select amb cerca       |
| `Textarea/Textarea.test.tsx`       | Tests del component Textarea amb preview   |
| `DatePicker/DatePicker.test.tsx`   | Tests del component DatePicker             |
| `Skeleton/Skeleton.test.tsx`       | Tests del component Skeleton amb variants  |
| `Modal/Modal.test.tsx`             | Tests del component Modal accessible       |
| `AdArticle/AdArticle.test.tsx`     | Tests del component AdArticle              |
| `Filters/Filters.test.tsx`         | Tests del component Filters                |
| `ViewCounter/ViewCounter.test.tsx` | Tests del component ViewCounter            |
| `Text/Text.test.tsx`               | Tests del component Text amb variants      |
| `ImgDefault/ImgDefault.test.tsx`   | Tests del component ImgDefault             |
| `Link/Link.test.tsx`               | Tests del component Link                   |
| `ShareButton/ShareButton.test.tsx` | Tests del component ShareButton            |

### Testing Guidelines

- **Unit Tests**: Cada component té tests unitaris per funcionalitats bàsiques
- **Integration Tests**: Tests d'integració per interaccions complexes
- **Visual Tests**: Tests visuals amb Playwright per regressions visuals
- **Accessibility Tests**: Tests d'accessibilitat amb axe-core
- **Performance Tests**: Tests de rendiment per components crítics

### E2E Test Coverage

| Àrea                         | Tests   | Descripció                             |
| ---------------------------- | ------- | -------------------------------------- |
| **Navigation & SEO**         | 8 tests | Navegació, URLs canòniques, meta tags  |
| **Events Flow**              | 6 tests | Flux d'esdeveniments, detalls, llistes |
| **Search & Filters**         | 7 tests | Cerca, filtres, resultats              |
| **Ads & Hybrid Rendering**   | 4 tests | Publicitat, renderitzat híbrid         |
| **Forms & Interactions**     | 5 tests | Formularis, calendar, compartir        |
| **Offline & Error Handling** | 6 tests | Offline, errors, service worker        |
| **News & Content**           | 5 tests | Notícies, articles, sitemaps           |

## Contribució

Quan afegeixis nous components:

1. Utilitza CVA per variants
2. Documenta les props al JSDoc
3. Afegeix exemples al DESIGN_SYSTEM.md
4. Assegura't que utilitza tokens de disseny
5. Test visual en diferents mides de pantalla
