import { Card } from '@/components/ui/Card'

interface PlaceholderPageProps {
  title: string
  description: string
}

/** Temporary stand-in used until each route's real page is built in a later step. */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
      <Card className="w-full text-center">
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      </Card>
    </div>
  )
}
