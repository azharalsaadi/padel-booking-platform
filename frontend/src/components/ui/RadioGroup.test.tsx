import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioGroup } from '@/components/ui/RadioGroup'

const options = [
  { value: 'pay_at_venue', label: 'Pay at Venue' },
  { value: 'thawani', label: 'Thawani' },
]

function ControlledRadioGroup() {
  const [value, setValue] = useState('pay_at_venue')
  return <RadioGroup legend="Payment method" options={options} value={value} onChange={setValue} />
}

describe('RadioGroup', () => {
  it('renders a fieldset/legend and only one option checked at a time', () => {
    render(<ControlledRadioGroup />)

    expect(screen.getByRole('group', { name: 'Payment method' })).toBeInTheDocument()
    expect(screen.getByLabelText('Pay at Venue')).toBeChecked()
    expect(screen.getByLabelText('Thawani')).not.toBeChecked()
  })

  it('switches selection on click and supports arrow-key roving focus natively', async () => {
    render(<ControlledRadioGroup />)

    await userEvent.click(screen.getByLabelText('Thawani'))

    expect(screen.getByLabelText('Thawani')).toBeChecked()
    expect(screen.getByLabelText('Pay at Venue')).not.toBeChecked()
  })

  it('calls onChange with the selected value', async () => {
    const onChange = vi.fn()
    render(<RadioGroup legend="Payment method" options={options} value="pay_at_venue" onChange={onChange} />)

    await userEvent.click(screen.getByLabelText('Thawani'))

    expect(onChange).toHaveBeenCalledWith('thawani')
  })
})
