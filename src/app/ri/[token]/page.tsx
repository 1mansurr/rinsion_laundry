import { AcceptRiderInviteForm } from './AcceptRiderInviteForm'

interface Props {
  params: { token: string }
}

export default function AcceptRiderInvitePage({ params }: Props) {
  return <AcceptRiderInviteForm token={params.token} />
}
