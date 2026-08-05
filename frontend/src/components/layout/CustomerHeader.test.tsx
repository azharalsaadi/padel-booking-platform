import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CustomerHeader } from '@/components/layout/CustomerHeader'

function renderHeader(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={<CustomerHeader />} />
        <Route path="/book" element={<CustomerHeader />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CustomerHeader', () => {
  it('is the same navbar on every customer page — no Admin Login, no customer login', () => {
    renderHeader()

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const labels = Array.from(nav.querySelectorAll('a')).map((link) => link.textContent)

    expect(labels).toEqual(['Home', 'Book a Court', 'Offers', 'How to Book'])
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /log ?in/i })).not.toBeInTheDocument()
  })

  it('Home and Book a Court navigate to the correct routes', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Book a Court' })).toHaveAttribute('href', '/book')
  })

  it('the RALLY wordmark links back to "/"', () => {
    renderHeader()

    expect(screen.getByRole('link', { name: 'Rally home' })).toHaveAttribute('href', '/')
  })

  it('the navbar Book Now button links to /book', () => {
    renderHeader()

    const bookNowLinks = screen.getAllByRole('link', { name: 'Book Now' })
    expect(bookNowLinks.some((link) => link.getAttribute('href') === '/book')).toBe(true)
  })

  it('while on "/", Offers is an in-page anchor to #offers rather than a full navigation', () => {
    renderHeader('/')

    expect(screen.getByRole('link', { name: 'Offers' })).toHaveAttribute('href', '#offers')
  })

  it('from another page, Offers and How to Book link back to "/" with the matching hash', () => {
    renderHeader('/book')

    expect(screen.getByRole('link', { name: 'Offers' })).toHaveAttribute('href', '/#offers')
    expect(screen.getByRole('link', { name: 'How to Book' })).toHaveAttribute('href', '/#how-to-book')
  })

  it('marks Home active on "/"', () => {
    renderHeader('/')
    expect(screen.getByRole('link', { name: 'Home' }).className).toContain('text-primary-700')
  })

  it('marks Book a Court active on "/book"', () => {
    renderHeader('/book')
    expect(screen.getByRole('link', { name: 'Book a Court' }).className).toContain('text-primary-700')
  })

  it('renders the desktop nav hidden below md, visible from md up (responsive check)', () => {
    renderHeader()

    const desktopNav = screen.getByRole('navigation', { name: 'Primary' })
    expect(desktopNav.className).toContain('hidden')
    expect(desktopNav.className).toContain('md:flex')
  })

  it('mobile nav panel is collapsed until the menu button is opened, and includes every link', async () => {
    renderHeader()

    expect(screen.getAllByRole('navigation', { name: 'Primary' })).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Open main menu' }))

    const navs = screen.getAllByRole('navigation', { name: 'Primary' })
    expect(navs).toHaveLength(2)
    const mobileNav = navs[1]
    expect(within(mobileNav).getByRole('link', { name: 'Book a Court' })).toBeInTheDocument()
  })

  it('closes the mobile nav after a link is clicked', async () => {
    renderHeader()

    await userEvent.click(screen.getByRole('button', { name: 'Open main menu' }))
    const mobileNav = screen.getAllByRole('navigation', { name: 'Primary' })[1]
    await userEvent.click(within(mobileNav).getByRole('link', { name: 'Book a Court' }))

    expect(screen.getAllByRole('navigation', { name: 'Primary' })).toHaveLength(1)
  })
})
