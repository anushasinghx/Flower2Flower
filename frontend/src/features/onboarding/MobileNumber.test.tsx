import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MobileNumber from './MobileNumber'
import { jsonResponse, makeState, mockFetch, sentBody, sentUrl } from '../../test/fixtures'
import { renderWithStore } from '../../test/helpers'

const fill = (mobile: string, agree = true) => {
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: mobile } })
  if (agree) fireEvent.click(screen.getByLabelText('I agree to the Terms and Privacy Notice.'))
  fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }))
}

describe('MobileNumber screen', () => {
  it('keeps only digits in the number field', () => {
    renderWithStore(<MobileNumber />)
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '98a76 54-1234' } })
    expect(screen.getByLabelText('Mobile number')).toHaveValue('9876541234')
  })

  it.each(['12345', '5876541234'])('rejects %s without calling the server', (mobile) => {
    const fetch = mockFetch()
    renderWithStore(<MobileNumber />)

    fill(mobile)

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid 10 digit number starting with 6, 7, 8 or 9.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks for agreement before sending', () => {
    const fetch = mockFetch()
    renderWithStore(<MobileNumber />)

    fill('9876541234', false)

    expect(screen.getByRole('alert')).toHaveTextContent('Please agree to the Terms and Privacy Notice.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the otp, remembers the number and opens verify', async () => {
    const fetch = mockFetch(jsonResponse({ message: 'If this number is registered, an OTP has been sent.' }))
    const { latest } = renderWithStore(<MobileNumber />)

    fill('9876541234')

    expect(await screen.findByTestId('location')).toHaveTextContent('/verify')
    expect(sentUrl(fetch)).toBe('/api/v1/auth/login')
    expect(sentBody(fetch)).toEqual({ mobileNumber: '9876541234' })
    expect(latest.state.pendingMobile).toBe('9876541234')
  })

  it('shows the server error and stays on the screen', async () => {
    mockFetch(jsonResponse({ message: 'This account is not active.' }, 403))
    renderWithStore(<MobileNumber />)

    fill('9876541234')

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('This account is not active.'))
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
  })

  it('shows hindi text when the language is hindi', () => {
    renderWithStore(<MobileNumber />, { state: makeState({ lang: 'hi' }) })
    expect(screen.getByRole('button', { name: 'OTP भेजें' })).toBeInTheDocument()
  })
})
