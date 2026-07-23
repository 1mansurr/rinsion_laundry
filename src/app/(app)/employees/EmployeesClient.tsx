'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteEmployee } from '@/services/employees/inviteEmployee'
import { resendInvite } from '@/services/employees/resendInvite'
import { toggleEmployee } from '@/services/employees/toggleEmployee'
import { removeEmployee } from '@/services/employees/removeEmployee'
import { restoreEmployee } from '@/services/employees/restoreEmployee'
import { deleteMyAccount } from '@/services/employees/deleteMyAccount'
import type { Employee } from '@/services/employees/getEmployees'
import type { PendingInvite } from '@/services/employees/getPendingInvites'
import { approveJoinRequest } from '@/services/laundries/approveJoinRequest'
import { rejectJoinRequest } from '@/services/laundries/rejectJoinRequest'
import type { PendingJoinRequest } from '@/services/laundries/getPendingJoinRequests'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { toast } from '@/components/ui/Toast'

interface Props {
  employees: Employee[]
  activeCount: number
  employeeLimit: number
  pendingRequests: PendingJoinRequest[]
  pendingInvites: PendingInvite[]
  currentEmployeeId: string
}

export function EmployeesClient({
  employees: init, activeCount: initActiveCount, employeeLimit,
  pendingRequests: initRequests, pendingInvites: initInvites, currentEmployeeId,
}: Props) {
  const router = useRouter()
  const [employees, setEmployees] = useState(init)
  const [activeCount, setActiveCount] = useState(initActiveCount)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Pending join requests (self-serve join-by-PIN flow, unrelated to invites)
  const [requests, setRequests] = useState(initRequests)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [approveRole, setApproveRole] = useState<Record<string, 'admin' | 'employee'>>({})

  function roleFor(id: string) { return approveRole[id] ?? 'employee' }

  function handleApprove(request: PendingJoinRequest) {
    setRequestError(null)
    setResolvingId(request.id)
    startTransition(async () => {
      const res = await approveJoinRequest(request.id, roleFor(request.id))
      if (res.success) {
        setRequests(prev => prev.filter(r => r.id !== request.id))
        setActiveCount(c => c + 1)
        setEmployees(prev => [...prev, {
          id: crypto.randomUUID(),
          firstName: request.firstName,
          lastName: request.lastName,
          email: request.email,
          phone: request.phone,
          role: roleFor(request.id),
          isActive: true,
        }])
      } else {
        setRequestError(res.error)
      }
      setResolvingId(null)
    })
  }

  function handleReject(requestId: string) {
    setRequestError(null)
    setResolvingId(requestId)
    startTransition(async () => {
      const res = await rejectJoinRequest(requestId)
      if (res.success) {
        setRequests(prev => prev.filter(r => r.id !== requestId))
      } else {
        setRequestError(res.error)
      }
      setResolvingId(null)
    })
  }

  // Pending invites
  const [invites, setInvites] = useState(initInvites)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  function handleResend(inviteId: string) {
    setInviteError(null)
    setResendingId(inviteId)
    startTransition(async () => {
      const res = await resendInvite(inviteId)
      if (!res.success) setInviteError(res.error)
      setResendingId(null)
    })
  }

  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'admin' | 'employee'>('employee')

  const atLimit = activeCount >= employeeLimit

  function resetForm() {
    setPhone('')
    setRole('employee')
    setError(null)
  }

  function handleAdd() {
    if (!phone.trim()) {
      setError('Phone number is required.'); return
    }
    setError(null)
    startTransition(async () => {
      const res = await inviteEmployee({ phone: phone.trim(), role })
      if (res.success) {
        setInviteMessage(
          res.data.linked
            ? `${phone.trim()} already has a Rinsion account — linked as ${role}.`
            : `Invite sent to ${phone.trim()}.`
        )
        setShowForm(false)
        const invitedPhone = phone.trim()
        resetForm()
        if (res.data.linked) {
          setActiveCount(c => c + 1)
          setEmployees(prev => [...prev, {
            id: crypto.randomUUID(),
            firstName: '',
            lastName: '',
            email: null,
            phone: invitedPhone,
            role,
            isActive: true,
          }])
        } else {
          setInvites(prev => [...prev, {
            id: crypto.randomUUID(),
            phone: invitedPhone,
            role,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }])
        }
      } else {
        setError(res.error)
      }
    })
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const res = await toggleEmployee(id, !current)
      if (res.success) {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, isActive: !current } : e))
        setActiveCount(c => current ? c - 1 : c + 1)
      }
    })
  }

  const [removeTarget, setRemoveTarget] = useState<Employee | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  function handleRemove() {
    if (!removeTarget) return
    setRemoveError(null)
    const target = removeTarget
    startTransition(async () => {
      const res = await removeEmployee(target.id)
      if (res.success) {
        setEmployees(prev => prev.filter(e => e.id !== target.id))
        if (target.isActive) setActiveCount(c => c - 1)
        setRemoveTarget(null)
        toast.success('Employee removed', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const restoreRes = await restoreEmployee(target.id)
              if (restoreRes.success) {
                setEmployees(prev => [...prev, target])
                if (target.isActive) setActiveCount(c => c + 1)
              }
            },
          },
        })
      } else {
        setRemoveError(res.error)
      }
    })
  }

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)

  function handleDeleteMyAccount() {
    setDeleteAccountError(null)
    startTransition(async () => {
      const res = await deleteMyAccount()
      if (res.success) {
        router.push('/login')
      } else {
        setDeleteAccountError(res.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && <Banner variant="destructive">{error}</Banner>}

      {inviteMessage && (
        <Banner variant="success">
          <p className="font-semibold">{inviteMessage}</p>
          <button onClick={() => setInviteMessage(null)} className="mt-2 text-xs underline">Dismiss</button>
        </Banner>
      )}

      {/* Pending join requests */}
      {requests.length > 0 && (
        <div className="bg-white rounded-18 border border-warm-300 divide-y divide-warm-100">
          <p className="px-5 py-3 text-sm font-semibold text-warm-950">
            Pending Requests <span className="font-normal text-warm-600">({requests.length})</span>
          </p>
          {requestError && (
            <p className="px-5 py-2 text-sm text-error">{requestError}</p>
          )}
          {requests.map(req => (
            <div key={req.id} className="px-5 py-3.5 space-y-2.5">
              <div>
                <p className="text-sm font-medium text-warm-950">{req.firstName} {req.lastName}</p>
                <p className="text-xs text-warm-600 mt-0.5">{req.email} · {req.phone}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roleFor(req.id)}
                  onChange={e => setApproveRole(prev => ({ ...prev, [req.id]: e.target.value as 'admin' | 'employee' }))}
                  className="border border-warm-400 rounded-12 px-2.5 py-1.5 text-xs text-warm-950 focus:outline-none focus:border-brand focus:shadow-focus-ring"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
                <Button size="sm" onClick={() => handleApprove(req)} isPending={isPending && resolvingId === req.id}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleReject(req.id)} disabled={isPending && resolvingId === req.id}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add employee button / form */}
      {!showForm ? (
        atLimit ? (
          <Banner variant="warning">
            Employee limit reached ({employeeLimit}/{employeeLimit}).{' '}
            <a href="mailto:saymmmohamm265@gmail.com" className="font-semibold underline">Contact us</a> if you need more seats.
          </Banner>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border-2 border-dashed border-warm-300 rounded-12 py-3 text-sm text-warm-600 hover:border-warm-500 hover:text-warm-800 transition-colors"
          >
            + Add Employee
          </button>
        )
      ) : (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-warm-950">Invite Employee</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="024 123 4567" />
            <Select label="Role" value={role} onChange={e => setRole(e.target.value as 'admin' | 'employee')}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleAdd} isPending={isPending}>
              Send Invite
            </Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); resetForm() }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-18 border border-warm-300 divide-y divide-warm-100">
          <p className="px-5 py-3 text-sm font-semibold text-warm-950">
            Invited <span className="font-normal text-warm-600">({invites.length})</span>
          </p>
          {inviteError && (
            <p className="px-5 py-2 text-sm text-error">{inviteError}</p>
          )}
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-warm-950 capitalize">{inv.role}</p>
                <p className="text-xs text-warm-600 mt-0.5">{inv.phone} · Invited</p>
              </div>
              <button
                onClick={() => handleResend(inv.id)}
                disabled={isPending && resendingId === inv.id}
                className="text-xs text-warm-600 hover:text-warm-800 ml-4 flex-shrink-0 disabled:opacity-50"
              >
                Resend
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Employee list */}
      <div className="bg-white rounded-18 border border-warm-300 divide-y divide-warm-100">
        {employees.length === 0 && (
          <p className="text-sm text-warm-600 text-center py-8">No employees yet.</p>
        )}
        {employees.map(emp => (
          <div key={emp.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${emp.isActive ? 'text-warm-950' : 'text-warm-600'}`}>
                  {emp.firstName} {emp.lastName}
                  {emp.id === currentEmployeeId && <span className="text-xs text-warm-600 font-normal ml-1">(you)</span>}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${emp.role === 'admin' ? 'bg-warm-150 text-warm-800' : 'bg-info-bg text-info'}`}>
                  {emp.role}
                </span>
                {!emp.isActive && <span className="text-xs text-warm-600">· Inactive</span>}
              </div>
              <p className="text-xs text-warm-600 mt-0.5">{[emp.email, emp.phone].filter(Boolean).join(' · ')}</p>
            </div>
            {emp.id !== currentEmployeeId && (
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleToggle(emp.id, emp.isActive)}
                  disabled={isPending}
                  className="text-xs text-warm-600 hover:text-warm-800"
                >
                  {emp.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
                <button
                  onClick={() => setRemoveTarget(emp)}
                  disabled={isPending}
                  className="text-xs text-warm-600 hover:text-error"
                >
                  Remove
                </button>
              </div>
            )}
            {emp.id === currentEmployeeId && (
              <button
                onClick={() => setDeleteAccountOpen(true)}
                disabled={isPending}
                className="text-xs text-warm-600 hover:text-error ml-4 flex-shrink-0"
              >
                Delete my account
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => { setRemoveTarget(null); setRemoveError(null) }}
        title="Remove employee"
        message={`Remove ${removeTarget?.firstName} ${removeTarget?.lastName} from the team? They'll be signed out and sent to the join/create screen next time they log in. This can be undone from Settings → Recycle Bin.`}
        confirmLabel="Remove"
        isPending={isPending}
        error={removeError}
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={deleteAccountOpen}
        onClose={() => { setDeleteAccountOpen(false); setDeleteAccountError(null) }}
        title="Delete my account"
        message="Delete your own Rinsion login? You'll be signed out immediately. An admin can restore your account from Settings → Recycle Bin if this was a mistake."
        confirmLabel="Delete my account"
        requireTypedText="DELETE"
        isPending={isPending}
        error={deleteAccountError}
        onConfirm={handleDeleteMyAccount}
      />
    </div>
  )
}
