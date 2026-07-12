'use client'

import { useState } from 'react'
import EmployeeForm, { EmployeeFormPayload } from '@/components/EmployeeForm'
import { createEmployee } from '@/lib/api'

export default function AddEmployeePage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (payload: EmployeeFormPayload) => {
    setError('')
    setSubmitting(true)
    try {
      await createEmployee(payload)
      window.location.href = '/employees'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الموظف')
      setSubmitting(false)
    }
  }

  return (
    <EmployeeForm
      mode="add"
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    />
  )
}
