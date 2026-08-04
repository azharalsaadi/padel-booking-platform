import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'

import { Container } from '@/components/layout/Container'
import { cn } from '@/lib/cn'

export function LookupPage() {
  const navigate = useNavigate()
  const inputId = useId()
  const errorId = `${inputId}-error`

  const [token, setToken] = useState('')
  const [error, setError] = useState<string | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = token.trim()

    if (trimmed === '') {
      setError('Enter your booking access link or code.')
      return
    }

    setError(undefined)
    navigate(`/booking/${encodeURIComponent(trimmed)}`)
  }

  return (
    <Container className="flex min-h-[690px] flex-col items-center px-4 pb-20 pt-20 text-center sm:pt-24 lg:pt-28">
      {/* Heading */}
      <header>
        <h1 className="font-serif text-[46px] font-semibold leading-none tracking-[-0.04em] text-text sm:text-[58px]">
          Manage Your Booking
        </h1>

        <p className="mx-auto mt-6 max-w-[540px] text-[16px] leading-7 text-text-muted sm:text-[18px]">
          Review your itinerary, modify your court selection,
          <br className="hidden sm:block" />
          or prepare for your next match at Rally.
        </p>
      </header>

      {/* Search form */}
      <div className="mt-10 w-full max-w-[650px]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4 rounded-[6px] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] sm:flex-row"
        >
          <div
            className={cn(
              'flex h-[56px] flex-1 items-center gap-4 rounded-[5px] border px-5',
              error ? 'border-danger' : 'border-border',
            )}
          >
            <Ticket
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-text"
              strokeWidth={1.7}
            />

            <label htmlFor={inputId} className="sr-only">
              Booking access code
            </label>

            <input
              id={inputId}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Enter Booking Reference (e.g. RL-9821)"
              required
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? errorId : undefined}
              className="h-full min-w-0 flex-1 border-none bg-transparent text-[15px] text-text outline-none placeholder:text-text-muted"
            />
          </div>

          <button
            type="submit"
            className="h-[56px] shrink-0 rounded-[5px] bg-black px-8 text-[15px] font-semibold text-white transition hover:bg-[#292929]"
          >
            View Booking
          </button>
        </form>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-3 text-left text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    </Container>
  )
}