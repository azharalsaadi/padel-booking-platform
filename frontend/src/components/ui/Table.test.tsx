import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table'

describe('Table', () => {
  it('renders header and body rows as a real table for assistive tech', () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Reference</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>BK-20260801-000123</TableCell>
            <TableCell>Confirmed</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Reference' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'BK-20260801-000123' })).toBeInTheDocument()
  })

  it('wraps the table in a horizontally scrollable container for small screens', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    expect(container.querySelector('.overflow-x-auto')).not.toBeNull()
  })
})
