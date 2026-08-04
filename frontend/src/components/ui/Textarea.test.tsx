import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '@/components/ui/Textarea'

describe('Textarea', () => {
  it('associates the label and accepts multi-line input', async () => {
    render(<Textarea label="Notes" />)

    const textarea = screen.getByLabelText('Notes')
    await userEvent.type(textarea, 'Line one{enter}Line two')

    expect(textarea).toHaveValue('Line one\nLine two')
  })

  it('renders helper text when there is no error', () => {
    render(<Textarea label="Notes" helperText="Optional" />)

    expect(screen.getByText('Optional')).toBeInTheDocument()
  })

  it('prefers the error message over helper text', () => {
    render(<Textarea label="Notes" helperText="Optional" error="Too long" />)

    expect(screen.getByRole('alert')).toHaveTextContent('Too long')
    expect(screen.queryByText('Optional')).not.toBeInTheDocument()
  })
})
