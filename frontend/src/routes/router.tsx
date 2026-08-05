import { createBrowserRouter, Navigate } from 'react-router-dom'

import { LandingPage } from '@/pages/customer/LandingPage'
import { BookingPage } from '@/pages/customer/BookingPage'
import { BookingSuccessPage } from '@/pages/customer/BookingSuccessPage'
import { ProcessingPage } from '@/pages/customer/ProcessingPage'
import { PaymentFailedPage } from '@/pages/customer/PaymentFailedPage'
import { ManageBookingPage } from '@/pages/customer/ManageBookingPage'
import { MockThawaniCheckoutPage } from '@/pages/customer/MockThawaniCheckoutPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { LoginPage } from '@/pages/admin/LoginPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { BookingsPage } from '@/pages/admin/BookingsPage'
import { BookingDetailPage } from '@/pages/admin/BookingDetailPage'
import { CourtsPage } from '@/pages/admin/CourtsPage'
import { CourtFormPage } from '@/pages/admin/CourtFormPage'
import { ClosuresPage } from '@/pages/admin/ClosuresPage'
import { PricingPage } from '@/pages/admin/PricingPage'
import { AdminGuard } from '@/routes/AdminGuard'
import { CustomerShell } from '@/components/layout/CustomerShell'
import { AdminShell } from '@/components/layout/AdminShell'
import { ShowcasePage } from '@/pages/dev/ShowcasePage'

// Route content is still every page's Step 2 placeholder — only the
// shared header/footer (customer) and sidebar/header (admin) chrome
// around it is new in Step 13. The actual pages are built in Steps 14/15.
export const router = createBrowserRouter([
  // Customer-facing routes
  { path: '/', element: <CustomerShell><LandingPage /></CustomerShell> },
  { path: '/book', element: <CustomerShell><BookingPage /></CustomerShell> },
  // Reached only via router state right after booking creation — see
  // BookingSuccessPage's docblock for why this replaced a bookmarkable
  // /booking/:token/confirmation route.
  { path: '/booking/success', element: <CustomerShell><BookingSuccessPage /></CustomerShell> },
  { path: '/booking/:token', element: <CustomerShell><ManageBookingPage /></CustomerShell> },
  // These two exact paths are hardcoded as Thawani's success_url/cancel_url
  // by the backend (PaymentService::issueCheckoutSession) — do not rename.
  { path: '/booking/:token/processing', element: <CustomerShell><ProcessingPage /></CustomerShell> },
  { path: '/booking/:token/failed', element: <CustomerShell><PaymentFailedPage /></CustomerShell> },
  // Stands in for Thawani's real hosted checkout page when THAWANI_MODE=mock
  // (no real merchant credentials for this academic project) — see
  // MockThawaniService::isActive(). A Thawani booking's checkout_url points
  // here instead of the real UAT checkout URL.
  { path: '/mock-thawani/:sessionId', element: <CustomerShell><MockThawaniCheckoutPage /></CustomerShell> },

  // Admin routes — the login screen has no sidebar (there's nothing to navigate to pre-auth).
  { path: '/admin/login', element: <LoginPage /> },
  { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
  {
    path: '/admin/dashboard',
    element: (
      <AdminGuard>
        <AdminShell>
          <DashboardPage />
        </AdminShell>
      </AdminGuard>
    ),
  },
  {
    path: '/admin/bookings',
    element: (
      <AdminGuard>
        <AdminShell>
          <BookingsPage />
        </AdminShell>
      </AdminGuard>
    ),
  },
  {
    path: '/admin/bookings/:id',
    element: (
      <AdminGuard>
        <AdminShell>
          <BookingDetailPage />
        </AdminShell>
      </AdminGuard>
    ),
  },
  {
    path: '/admin/courts',
    element: (
      <AdminGuard>
        <AdminShell>
          <CourtsPage />
        </AdminShell>
      </AdminGuard>
    ),
  },
  {
    path: '/admin/courts/new',
    element: (
      <AdminGuard>
        <AdminShell>
          <CourtFormPage />
        </AdminShell>
      </AdminGuard>
    ),
  },
  {
    path: '/admin/courts/:id',
    element: (
      <AdminGuard>
        <AdminShell>
          <CourtFormPage />
        </AdminShell>
      </AdminGuard>
    ),
  },
  {
    path: '/admin/closures',
    element: (
      <AdminGuard>
        <AdminShell>
          <ClosuresPage />
        </AdminShell>
      </AdminGuard>
    ),
  },
  {
    path: '/admin/pricing',
    element: (
      <AdminGuard>
        <AdminShell>
          <PricingPage />
        </AdminShell>
      </AdminGuard>
    ),
  },

  // Internal-only component showcase (Step 13) — not linked from any nav.
  { path: '/dev/showcase', element: <ShowcasePage /> },

  { path: '*', element: <NotFoundPage /> },
])
