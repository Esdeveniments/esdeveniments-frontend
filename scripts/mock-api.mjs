#!/usr/bin/env node
import http from 'http'
import { parse } from 'url'

const PORT = process.env.MOCK_API_PORT || 4001

function json(res, code, data, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json', ...headers })
  res.end(JSON.stringify(data))
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
}

const server = http.createServer(async (req, res) => {
  const { pathname, query } = parse(req.url || '', true)

  // CORS for safety (not required in E2E, but harmless)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.end()

  if (req.method === 'GET' && pathname === '/events') {
    return json(res, 200, {
      content: [],
      currentPage: 0,
      pageSize: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    })
  }

  if (req.method === 'GET' && pathname === '/events/categorized') {
    return json(res, 200, {})
  }

  if (req.method === 'GET' && pathname === '/categories') {
    return json(res, 200, [
      { id: 1, name: 'Concerts', slug: 'concerts' },
      { id: 2, name: 'Fires i mercats', slug: 'fires-i-mercats' },
    ])
  }

  if (req.method === 'GET' && pathname === '/places/regions') {
    return json(res, 200, [
      { id: 1, name: 'Barcelona', slug: 'barcelona' },
      { id: 2, name: 'Girona', slug: 'girona' },
    ])
  }

  if (req.method === 'GET' && pathname === '/places/regions/options') {
    return json(res, 200, [
      { id: 1, name: 'Barcelona', cities: [ { id: 1, label: 'Barcelona', value: 'barcelona' } ] },
      { id: 2, name: 'Girona', cities: [ { id: 2, label: 'Girona', value: 'girona' } ] },
    ])
  }

  if (req.method === 'GET' && pathname && pathname.startsWith('/events/')) {
    const slug = pathname.split('/').pop()
    if (slug === 'mock-event') {
      return json(res, 200, {
        id: 1,
        slug: 'mock-event',
        title: 'Mock Event',
        description: 'E2E mock event description',
        startDate: '2025-01-01',
        endDate: null,
        location: 'Barcelona',
        city: { id: 1, name: 'Barcelona', slug: 'barcelona', postalCode: '08001' },
        region: { id: 1, name: 'Barcelona', slug: 'barcelona' },
        categories: [],
        imageUrl: '',
        visits: 0,
        duration: null,
        weather: null,
        tags: [],
        type: 'FREE',
        url: 'https://example.com',
        relatedEvents: [],
      })
    }
    return notFound(res)
  }

  if (req.method === 'POST' && pathname === '/events') {
    // Return minimal event detail with slug so client can navigate
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      return json(res, 200, {
        id: 1,
        slug: 'mock-event',
      })
    })
    return
  }

  return notFound(res)
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock API listening on http://127.0.0.1:${PORT}`)
})