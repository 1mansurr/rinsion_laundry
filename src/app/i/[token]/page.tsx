import { AcceptInviteForm } from './AcceptInviteForm'

interface Props {
  params: { token: string }
}

export default function AcceptInvitePage({ params }: Props) {
  return <AcceptInviteForm token={params.token} />
}
