import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchEvents, insertAds } from '../lib/api/events'

const originalEnv = { ...process.env }

describe('lib/api/events', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns safe fallback when NEXT_PUBLIC_API_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_API_URL
    const result = await fetchEvents({ page: 0, size: 10 }) as any
    expect(result).toEqual({
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    })
  })

  it('maps params correctly and serializes only defined ones', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'

    const mockJson = vi.fn().mockResolvedValue({ content: [], currentPage: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true })
    const mockFetch = vi.fn().mockResolvedValue({ json: mockJson })
    // @ts-expect-error
    global.fetch = mockFetch

    await fetchEvents({ place: 'barcelona', term: 'music', page: 2, size: 20 })
    const calledUrl = mockFetch.mock.calls[0][0] as string

    expect(calledUrl).toContain('https://api.example.com/events?')
    expect(calledUrl).toContain('place=barcelona')
    expect(calledUrl).toContain('term=music')
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('size=20')
    expect(calledUrl).not.toContain('lat=')
    expect(calledUrl).not.toContain('lon=')
  })

  it('insertAds returns empty when no events', () => {
    const result = insertAds([])
    expect(result).toEqual([])
  })

  it('insertAds respects frequency ratio approximately', () => {
    const events = Array.from({ length: 20 }, (_, i) => ({ id: String(i) })) as any
    const list = insertAds(events, 4)
    const adCount = list.filter((e: any) => e.isAd).length
    expect(adCount).toBeGreaterThanOrEqual(5)
    expect(adCount).toBeLessThanOrEqual(6)
  })
})