import type { EmployeeStatus } from '../../api/src/common/domain-status'

interface BirthdayEmployee {
  id: number
  fullName: string
  status: EmployeeStatus
  isActive?: boolean
  birthDate?: string | null
}

const leapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
const dateParts = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const monthDays = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1] ? { year, month, day } : null
}

// Input is the already-authorized employee list. No birth year or age is returned.
// February 29 is observed on February 28 in non-leap years, explicitly marked for the UI.
export function upcomingBirthdays(employees: BirthdayEmployee[], from: string, through: string) {
  const start = dateParts(from), end = dateParts(through)
  if (!start || !end || from > through) return []
  return employees.flatMap(employee => {
    if (employee.isActive === false || !['active', 'probation'].includes(employee.status) || !employee.birthDate) return []
    const born = dateParts(employee.birthDate)
    if (!born || employee.birthDate > from) return []
    for (let year = start.year; year <= end.year; year++) {
      const observedLeapDay = born.month === 2 && born.day === 29 && !leapYear(year)
      const day = observedLeapDay ? 28 : born.day
      const date = `${String(year).padStart(4, '0')}-${String(born.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (date >= from && date <= through) return [{ employeeId: employee.id, name: employee.fullName, date, observedLeapDay }]
    }
    return []
  })
}
