import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Search from '../components/ui/search'

vi.mock('next/navigation', () => {
  const push = vi.fn()
  return {
    useRouter: () => ({ push }),
    useSearchParams: () => new URLSearchParams(''),
    usePathname: () => '/',
  }
})

// avoid GA noise
vi.mock('../utils/analytics', () => ({ sendGoogleEvent: vi.fn() }))

describe('Search component', () => {
  it('renders input with placeholder and accepts typing', () => {
    render(<Search />)
    const input = screen.getByLabelText('Search input') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.placeholder).toBe('Què estàs buscant?')
    fireEvent.change(input, { target: { value: 'fira' } })
    expect(input.value).toBe('fira')
  })
})