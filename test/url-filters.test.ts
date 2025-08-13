import { describe, it, expect } from 'vitest'
import {
  buildCanonicalUrlDynamic,
  parseFiltersFromUrl,
  urlToFilterState,
  getRedirectUrl,
  isValidCategorySlug,
} from '../utils/url-filters'

describe('url-filters: canonical building and parsing', () => {
  it('omits tots date and category when both default', () => {
    const url = buildCanonicalUrlDynamic({ place: 'barcelona', byDate: 'tots', category: 'tots' })
    expect(url).toBe('/barcelona')
  })

  it('omits tots date when category is specific', () => {
    const url = buildCanonicalUrlDynamic({ place: 'barcelona', byDate: 'tots', category: 'concerts' })
    expect(url).toBe('/barcelona/concerts')
  })

  it('keeps date when category is tots', () => {
    const url = buildCanonicalUrlDynamic({ place: 'barcelona', byDate: 'avui', category: 'tots' })
    expect(url).toBe('/barcelona/avui')
  })

  it('includes search and non-default distance as query', () => {
    const url = buildCanonicalUrlDynamic({ place: 'barcelona', byDate: 'avui', category: 'tots', searchTerm: 'rock', distance: 25 })
    expect(url).toBe('/barcelona/avui?search=rock&distance=25')
  })

  it('parses 1, 2 and 3 segments correctly', () => {
    const one = parseFiltersFromUrl({ place: 'catalunya' }, new URLSearchParams(''))
    expect(one.segments).toEqual({ place: 'catalunya', date: 'tots', category: 'tots' })

    const twoDate = parseFiltersFromUrl({ place: 'catalunya', date: 'avui' }, new URLSearchParams(''))
    expect(twoDate.segments).toEqual({ place: 'catalunya', date: 'avui', category: 'tots' })

    const twoCat = parseFiltersFromUrl({ place: 'catalunya', category: 'concerts' }, new URLSearchParams(''))
    expect(twoCat.segments).toEqual({ place: 'catalunya', date: 'tots', category: 'concerts' })

    const three = parseFiltersFromUrl({ place: 'girona', date: 'avui', category: 'concerts' }, new URLSearchParams('search=art'))
    expect(three.segments).toEqual({ place: 'girona', date: 'avui', category: 'concerts' })
    expect(three.queryParams.search).toBe('art')
  })

  it('urlToFilterState converts parsed filters and preserves defaults for numbers', () => {
    const parsed = parseFiltersFromUrl({ place: 'lleida' }, new URLSearchParams(''))
    const state = urlToFilterState(parsed)
    expect(state).toEqual({ place: 'lleida', byDate: 'tots', category: 'tots', searchTerm: '', distance: 50, lat: undefined, lon: undefined })
  })

  it('getRedirectUrl returns canonical URL when parsed is not canonical', () => {
    const parsed = parseFiltersFromUrl({ place: 'tarragona', date: 'xx', category: 'yy' }, new URLSearchParams(''))
    const redirect = getRedirectUrl(parsed)
    // invalid date/category should normalize to tots/tots -> /tarragona
    expect(redirect).toBe('/tarragona')
  })
})

describe('url-filters: category slug validation', () => {
  it('accepts legacy category slugs and tots by default', () => {
    expect(isValidCategorySlug('concerts')).toBe(true)
    expect(isValidCategorySlug('tots')).toBe(true)
  })

  it('accepts dynamic categories when provided', () => {
    const dynamic = [{ id: 1, name: 'Fires', slug: 'fires-i-mercats' }]
    expect(isValidCategorySlug('fires-i-mercats', dynamic as any)).toBe(true)
  })

  it('rejects unknown categories when not present dynamically', () => {
    expect(isValidCategorySlug('unknown-slug')).toBe(false)
  })
})