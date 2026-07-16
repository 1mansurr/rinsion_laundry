'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteEmployee } from '@/services/employees/inviteEmployee'
import { resendInvite } from '@/services/employees/resendInvite'
import { toggleEmployee } from '@/services/employees/toggleEmployee'
import { removeEmployee } from '@/services/employees/removeEmployee'
import { deleteMyAccount } from '@/services/employees/deleteMyAccount'
import type { Employee } from '@/services/employees/getEmployees'
import type { PendingInvite } from '@/services/employees/getPendingInvites'
import { approveJoinRequest } from '@/services/laundries/approveJoinRequest'
import { rejectJoinRequest } from '@/services/laundries/rejectJoinRequest'
import type { PendingJoinRequest } from '@/services/laundries/getPendingJoinRequests'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

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
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {inviteMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-800">{inviteMessage}</p>
          <button onClick={() => setInviteMessage(null)} className="mt-2 text-xs text-green-700 underline">Dismiss</button>
        </div>
      )}

      {/* Pending join requests */}
      {requests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          <p className="px-5 py-3 text-sm font-semibold text-gray-900">
            Pending Requests <span className="font-normal text-gray-400">({requests.length})</span>
          </p>
          {requestError && (
            <p className="px-5 py-2 text-sm text-red-600">{requestError}</p>
          )}
          {requests.map(req => (
            <div key={req.id} className="px-5 py-3.5 space-y-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900">{req.firstName} {req.lastName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{req.email} · {req.phone}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={roleFor(req.id)}
                  onChange={e => setApproveRole(prev => ({ ...prev, [req.id]: e.target.value as 'admin' | 'employee' }))}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={isPending && resolvingId === req.id}
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={isPending && resolvingId === req.id}
                  className="px-3 py-1.5 border border-gray-300 text-xs text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add employee button / form */}
      {!showForm ? (
        atLimit ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            Employee limit reached ({employeeLimit}/{employeeLimit}).{' '}
            <a href="mailto:saymmmohamm265@gmail.com" className="font-semibold underline">Contact us</a> about Growth to add up to 9 employees.
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            + Add Employee
          </button>
        )
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Invite Employee</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="024 123 4567" />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'admin' | 'employee')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Sending…' : 'Send Invite'}
            </button>
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          <p className="px-5 py-3 text-sm font-semibold text-gray-900">
            Invited <span className="font-normal text-gray-400">({invites.length})</span>
          </p>
          {inviteError && (
            <p className="px-5 py-2 text-sm text-red-600">{inviteError}</p>
          )}
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">{inv.role}</p>
                <p className="text-xs text-gray-400 mt-0.5">{inv.phone} · Invited</p>
              </div>
              <button
                onClick={() => handleResend(inv.id)}
                disabled={isPending && resendingId === inv.id}
                className="text-xs text-gray-400 hover:text-gray-700 ml-4 flex-shrink-0 disabled:opacity-50"
              >
                Resend
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Employee list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {employees.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No employees yet.</p>
        )}
        {employees.map(emp => (
          <div key={emp.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${emp.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {emp.firstName} {emp.lastName}
                  {emp.id === currentEmployeeId && <span className="text-xs text-gray-400 font-normal ml-1">(you)</span>}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${emp.role === 'admin' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
                  {emp.role}
                </span>
                {!emp.isActive && <span className="text-xs text-gray-400">· Inactive</span>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{[emp.email, emp.phone].filter(Boolean).join(' · ')}</p>
            </div>
            {emp.id !== currentEmployeeId && (
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleToggle(emp.id, emp.isActive)}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  {emp.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
                <button
                  onClick={() => setRemoveTarget(emp)}
                  disabled={isPending}
                  className="text-xs text-gray-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}
            {emp.id === currentEmployeeId && (
              <button
                onClick={() => setDeleteAccountOpen(true)}
                disabled={isPending}
                className="text-xs text-gray-400 hover:text-red-600 ml-4 flex-shrink-0"
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

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </div>
  )
}
