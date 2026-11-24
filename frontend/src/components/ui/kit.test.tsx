import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button, CheckRow, Field, Pill, TextInput, Toggle } from './kit'

describe('Button', () => {
  it('defaults to a non submitting button', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('can submit forms and be disabled', () => {
    const onClick = vi.fn()
    render(
      <Button type="submit" disabled onClick={onClick}>
        Send
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Send' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('stretches when full', () => {
    render(<Button full>Wide</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })
})

describe('Field', () => {
  it('links the label to its input', () => {
    render(<Field label="Mobile number">{(id) => <TextInput id={id} />}</Field>)
    expect(screen.getByLabelText('Mobile number')).toBeInTheDocument()
  })

  it('shows hint when there is no error', () => {
    render(<Field label="Name" hint="As on your ID">{(id) => <TextInput id={id} />}</Field>)
    expect(screen.getByText('As on your ID')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('replaces hint with an alert when there is an error', () => {
    render(<Field label="Name" hint="As on your ID" error="Enter your name">{(id) => <TextInput id={id} />}</Field>)
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your name')
    expect(screen.queryByText('As on your ID')).not.toBeInTheDocument()
  })
})

describe('Toggle', () => {
  it('reports its state and flips on click', () => {
    const Harness = () => {
      const [on, setOn] = useState(false)
      return <Toggle checked={on} onChange={setOn} label="Pool points" />
    }
    render(<Harness />)
    const toggle = screen.getByRole('switch', { name: 'Pool points' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('does nothing when disabled', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Locked" disabled />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('CheckRow and Pill', () => {
  it('CheckRow sends the new checked value', () => {
    const onChange = vi.fn()
    render(<CheckRow checked={false} onChange={onChange}>I agree</CheckRow>)
    fireEvent.click(screen.getByLabelText('I agree'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('Pill renders its content', () => {
    render(<Pill tone="green">Verified</Pill>)
    expect(screen.getByText('Verified')).toHaveClass('text-tulsi')
  })
})
