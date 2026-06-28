'use client'

import { useState, useTransition } from 'react'
import { createEmployee, toggleEmployee, type Employee } from '@/services/employees'

interface Props {
  employees: Employee[]
  branches: { id: string; name: string }[]
  activeCount: number
  employeeLimit: number
  currentEmployeeId: string
}

export function EmployeesClient({ employees: init, branches, activeCount: initActiveCount, employeeLimit, currentEmployeeId }: Props) {
  const [employees, setEmployees] = useState(init)
  const [activeCount, setActiveCount] = useState(initActiveCount)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCreds, setNewCreds] = useState<{ email: string; password: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'admin' | 'employee'>('employee')
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')

  const atLimit = activeCount >= employeeLimit

  function resetForm() {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('')
    setRole('employee'); setBranchId(branches[0]?.id ?? '')
    setError(null)
  }

  function handleAdd() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !branchId) {
      setError('All fields are required.'); return
    }
    setError(null)
    startTransition(async () => {
      const res = await createEmployee({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim(), role, branchId })
      if (res.success) {
        setNewCreds({ email: email.trim(), password: res.data.tempPassword })
        setShowForm(false)
        resetForm()
        setActiveCount(c => c + 1)
        setEmployees(prev => [...prev, {
          id: crypto.randomUUID(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          branchId,
          branchName: branches.find(b => b.id === branchId)?.name ?? '',
          isActive: true,
        }])
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {newCreds && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-800 mb-2">Employee added. Share these credentials:</p>
          <div className="bg-white rounded-lg border border-green-200 p-3 font-mono text-sm space-y-1">
            <p><span className="text-gray-500">Email:</span> {newCreds.email}</p>
            <p><span className="text-gray-500">Password:</span> <strong>{newCreds.password}</strong></p>
          </div>
          <button onClick={() => setNewCreds(null)} className="mt-3 text-xs text-green-700 underline">Dismiss</button>
        </div>
      )}

      {/* Add employee button / form */}
      {!showForm ? (
        <button
          onClick={() => { if (!atLimit) setShowForm(true) }}
          disabled={atLimit}
          title={atLimit ? `${employeeLimit}-employee limit reached on your plan` : undefined}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {atLimit ? `Employee limit reached (${employeeLimit}/${employeeLimit}) — upgrade to add more` : '+ Add Employee'}
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">New Employee</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="Kwame" />
            <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Asante" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="kwame@example.com" type="email" />
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Adding…' : 'Add Employee'}
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
              <p className="text-xs text-gray-400 mt-0.5">{emp.email} · {emp.phone} · {emp.branchName}</p>
            </div>
            {emp.id !== currentEmployeeId && (
              <button
                onClick={() => handleToggle(emp.id, emp.isActive)}
                disabled={isPending}
                className="text-xs text-gray-400 hover:text-gray-700 ml-4 flex-shrink-0"
              >
                {emp.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
          </div>
        ))}
      </div>
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
