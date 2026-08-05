import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useAdminLogin, useAdminMe } from '@/hooks/admin/useAdminAuth'
import { parseApiError } from '@/api/errors'
import { useSyncAdminLanguage } from '@/i18n/config'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const meQuery = useAdminMe()
  const loginMutation = useAdminLogin()
  useSyncAdminLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>()
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Already signed in (e.g. visited /admin/login directly with a live
  // session) — go straight to the dashboard instead of showing the form.
  if (meQuery.data) {
    return <Navigate to="/admin/dashboard" replace />
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setEmailError(undefined)
    setGeneralError(null)

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/admin/dashboard'
          navigate(redirectTo, { replace: true })
        },
        onError: (error) => {
          const parsed = parseApiError(error)
          const emailFieldError = parsed.fieldErrors?.email?.[0]
          if (emailFieldError) {
            setEmailError(emailFieldError)
          } else {
            setGeneralError(parsed.message)
          }
        },
      },
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-text">{t('admin.login.title')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('admin.login.subtitle')}</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Input
            label={t('admin.login.email')}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={emailError}
          />
          <Input
            label={t('admin.login.password')}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {generalError && <ErrorMessage message={generalError} />}

          <Button type="submit" isLoading={loginMutation.isPending}>
            {t('admin.login.logIn')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
