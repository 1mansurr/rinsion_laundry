import { ResetPasswordForm } from './ResetPasswordForm'

interface Props {
  params: { token: string }
}

export default function PhoneResetPage({ params }: Props) {
  return <ResetPasswordForm token={params.token} />
}
