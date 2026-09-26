'use client'

// منتقي الموظف الموحّد (موظف واحد): خانة تكتب فيها الاسم أو الكود وقايمة نتايج تحتها — بدل القوايم المنسدلة
// الطويلة اللي مابتتبحثش. المطابقة من src/lib/employee-search.ts (نفس بحث كل الشاشات: الإملاء العربي والكود).
// الشاشة بتدّيه قايمتها هي (employees) بنفس مصدرها وصلاحياتها، وfilter اختياري (مثلاً موظفي القسم المختار بس).
// القيمة id الموظف كنص ('' = من غير موظف)، والشاشة بتحوّلها زي ما كانت بتحوّل قيمة الـselect بالظبط.
// القايمة بتترسم بـportal بموضع ثابت (fixed) فوق كل حاجة، فمابتتقصّش جوه نافذة بتسكرول أو جدول بيسكرول بالعرض.
// الكيبورد: ↑/↓ للتنقل، Enter للاختيار (ومابيبعتش النموذج)، Esc للقفل. تفريغ الخانة والخروج = من غير موظف.
// مسارات نسبية (لا @/) عشان اختبارات الخادم بترسم الشاشات اللي فيها المنتقي.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { searchEmployees, type EmployeeSearchFields } from '../lib/employee-search'

export interface EmployeePickerOption extends EmployeeSearchFields {
  id: number | string
  jobTitle?: string | null
  branchName?: string | null
}

export interface EmployeePickerProps<T extends EmployeePickerOption> {
  // قايمة الشاشة نفسها (نفس مصدرها وصلاحياتها)
  employees: readonly T[]
  // id الموظف المختار ('' / null = من غير موظف)
  value: string | number | null | undefined
  // id كنص ('' لما يتمسح) والموظف نفسه
  onChange: (id: string, employee: T | null) => void
  // تضييق الاختيارات (المختار الحالي بيفضل ظاهر في الخانة حتى لو برّه الفلتر)
  filter?: (employee: T) => boolean
  placeholder?: string
  // على خانة الكتابة — عشان <label htmlFor>
  id?: string
  required?: boolean
  disabled?: boolean
  // زرار المسح (✕) — false للخانات اللي لازم يفضل فيها موظف
  clearable?: boolean
  className?: string
  inputClassName?: string
  title?: string
  'aria-label'?: string
  // السطر التاني تحت الاسم في النتايج — الافتراضي المسمى الوظيفي والفرع لو موجودين
  describe?: (employee: T) => string | null | undefined
  // اسم الموظف المحفوظ لما يكون برّه القايمة (فرع تاني مثلاً)
  missingLabel?: (id: string) => string
  emptyText?: string
  maxResults?: number
}

// أقصى عدد نتايج مرسوم مرة واحدة — القوايم الكبيرة (600+) تفضل سريعة، والباقي «اكتب أكتر للتصفية»
export const EMPLOYEE_PICKER_MAX_RESULTS = 50
export const EMPLOYEE_PICKER_EMPTY_TEXT = 'مفيش نتايج'
export const EMPLOYEE_PICKER_MORE_TEXT = 'اكتب أكتر للتصفية'

export const employeePickerLabel = (employee: EmployeePickerOption): string =>
  [employee.fullName, employee.employeeCode].filter(Boolean).join(' — ') || `موظف #${employee.id}`

const missingEmployeeLabel = (id: string) => `موظف #${id}`

const defaultDescribe = (employee: EmployeePickerOption) => [employee.jobTitle, employee.branchName].filter(Boolean).join(' — ')

// النتايج الظاهرة: المطابقين بالترتيب (الأقرب الأول) لحد الحد الأقصى، والإجمالي عشان «اكتب أكتر».
// من غير بحث: المختار الحالي بيتحط أول القايمة لو مش ظاهر في أول الحد.
export function employeePickerResults<T extends EmployeePickerOption>(
  employees: readonly T[],
  query: string,
  filter?: (employee: T) => boolean,
  max: number = EMPLOYEE_PICKER_MAX_RESULTS,
  selectedId = '',
): { shown: T[]; total: number } {
  const matches = searchEmployees(filter ? employees.filter(filter) : employees, query)
  const shown = matches.slice(0, max)
  if (!query.trim() && selectedId && matches.length > max && !shown.some((employee) => String(employee.id) === selectedId)) {
    const selected = matches.find((employee) => String(employee.id) === selectedId)
    if (selected) {
      shown.pop()
      shown.unshift(selected)
    }
  }
  return { shown, total: matches.length }
}

// التنقل بالأسهم بيلفّ من الآخر للأول والعكس
export function nextActiveIndex(current: number, key: string, count: number): number {
  if (count <= 0) return -1
  if (key === 'ArrowDown') return current < 0 || current >= count - 1 ? 0 : current + 1
  if (key === 'ArrowUp') return current <= 0 ? count - 1 : current - 1
  return current
}

const POPUP_MIN_WIDTH = 240
const POPUP_MAX_HEIGHT = 320

export function EmployeePicker<T extends EmployeePickerOption>({
  employees,
  value,
  onChange,
  filter,
  placeholder = 'اكتب اسم الموظف أو كوده…',
  id,
  required,
  disabled,
  clearable = true,
  className = '',
  inputClassName = '',
  title,
  'aria-label': ariaLabel,
  describe,
  missingLabel = missingEmployeeLabel,
  emptyText = EMPLOYEE_PICKER_EMPTY_TEXT,
  maxResults = EMPLOYEE_PICKER_MAX_RESULTS,
}: EmployeePickerProps<T>) {
  const autoId = useId()
  const inputId = id ?? `employee-picker-${autoId}`
  const listId = `${inputId}-list`
  const optionId = (index: number) => `${listId}-${index}`
  const inputRef = useRef<HTMLInputElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const keyboardNav = useRef(false)
  const selectOnMouseUp = useRef(false)
  const [open, setOpen] = useState(false)
  // editing = المستخدم بيكتب: الخانة فيها كلامه بدل اسم المختار
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  // null = الافتراضي: المختار الحالي لما القايمة تتفتح، وأول نتيجة وإنت بتكتب
  const [active, setActive] = useState<number | null>(null)
  const [position, setPosition] = useState<CSSProperties | null>(null)
  // القايمة بتترسم في النافذة (role="dialog") اللي فيها الخانة لو فيه — عشان قارئ الشاشة مايعتبرهاش برّه
  // النافذة (aria-modal) — وإلا في body. الموضع ثابت (fixed) فمابيتقصّش بسكرول النافذة.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  const selectedId = value === null || value === undefined ? '' : String(value)
  const selected = selectedId ? employees.find((employee) => String(employee.id) === selectedId) ?? null : null
  const selectedLabel = selectedId ? (selected ? employeePickerLabel(selected) : missingLabel(selectedId)) : ''
  const searchText = editing ? query : ''

  const { shown, total } = useMemo(
    () => (open ? employeePickerResults(employees, searchText, filter, maxResults, selectedId) : { shown: [] as T[], total: 0 }),
    [open, employees, searchText, filter, maxResults, selectedId],
  )
  const selectedIndex = shown.findIndex((employee) => String(employee.id) === selectedId)
  const activeIndex = shown.length === 0 ? -1 : Math.min(active ?? (editing ? 0 : Math.max(selectedIndex, 0)), shown.length - 1)

  // موضع القايمة من مكان الخانة على الشاشة: تحتها، أو فوقها لو المساحة تحت مش كفاية. محاذاة يمين (RTL).
  const place = useCallback(() => {
    const input = inputRef.current
    if (!input) return
    const rect = input.getBoundingClientRect()
    const width = Math.min(Math.max(rect.width, POPUP_MIN_WIDTH), window.innerWidth - 16)
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
    const below = window.innerHeight - rect.bottom - 12
    const above = rect.top - 12
    const upward = below < 200 && above > below
    const maxHeight = Math.max(120, Math.min(POPUP_MAX_HEIGHT, upward ? above : below))
    setPosition(upward
      ? { position: 'fixed', left, width, bottom: window.innerHeight - rect.top + 4, maxHeight, zIndex: 1000 }
      : { position: 'fixed', left, width, top: rect.bottom + 4, maxHeight, zIndex: 1000 })
  }, [])

  const openList = () => {
    if (disabled) return
    keyboardNav.current = true
    setActive(null)
    setPortalTarget(inputRef.current?.closest<HTMLElement>('[role="dialog"]') ?? document.body)
    place()
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
    setEditing(false)
    setQuery('')
    setActive(null)
  }
  const pick = (employee: T) => {
    onChange(String(employee.id), employee)
    close()
  }
  const clear = () => {
    onChange('', null)
    setEditing(false)
    setQuery('')
    setActive(null)
    inputRef.current?.focus()
  }

  // القايمة بتتبع الخانة مع السكرول (أي سكرول: الصفحة أو النافذة) وتغيير حجم الشاشة
  useEffect(() => {
    if (!open) return
    const onScroll = (event: Event) => {
      if (popupRef.current && event.target instanceof Node && popupRef.current.contains(event.target)) return
      place()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  // النتيجة النشطة بالكيبورد تفضل ظاهرة جوه القايمة
  useEffect(() => {
    if (!open || activeIndex < 0 || !keyboardNav.current) return
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex])

  useEffect(() => {
    if (disabled) close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openList()
        return
      }
      keyboardNav.current = true
      setActive(nextActiveIndex(activeIndex, event.key, shown.length))
    } else if (event.key === 'Enter') {
      // Enter جوه المنتقي مابيبعتش النموذج: بيختار النتيجة النشطة أو بيفتح القايمة
      event.preventDefault()
      if (open && activeIndex >= 0) pick(shown[activeIndex])
      else if (!open) openList()
    } else if (event.key === 'Escape') {
      if (open || editing) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }
    // Tab: الخروج من الخانة (onBlur) هو اللي بيقفل القايمة — ولو الخانة اتفضّت بيمسح الاختيار
  }

  const showClear = clearable && !disabled && selectedId !== ''
  const detailOf = (employee: T) => (describe ? describe(employee) : defaultDescribe(employee))

  const popup = open && position ? (
    <div
      ref={popupRef}
      dir="rtl"
      style={position}
      className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-lg text-sm text-right overflow-hidden"
      // الضغط جوه القايمة مايسحبش التركيز من الخانة (عشان الاختيار يكمل)
      onMouseDown={(event) => event.preventDefault()}
    >
      <ul id={listId} role="listbox" aria-label={ariaLabel ?? 'الموظفين'} className="flex-1 min-h-0 overflow-y-auto py-1">
        {shown.map((employee, index) => {
          const isSelected = String(employee.id) === selectedId
          const detail = detailOf(employee)
          return (
            <li
              key={String(employee.id)}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              className={`flex items-center justify-between gap-3 px-3 py-2 cursor-pointer ${index === activeIndex ? 'bg-primary-50' : ''}`}
              onMouseEnter={() => {
                keyboardNav.current = false
                setActive(index)
              }}
              onClick={() => pick(employee)}
            >
              <span className="min-w-0">
                <span className={`block truncate ${isSelected ? 'font-semibold text-primary-700' : 'text-gray-800'}`}>
                  {employee.fullName || missingLabel(String(employee.id))}
                </span>
                {detail ? <span className="block truncate text-xs text-gray-500">{detail}</span> : null}
              </span>
              {employee.employeeCode ? (
                <span dir="ltr" className="shrink-0 text-xs text-gray-500">{employee.employeeCode}</span>
              ) : null}
            </li>
          )
        })}
      </ul>
      {total === 0 && (
        <p role="status" className="px-3 py-2.5 text-gray-500">{emptyText}</p>
      )}
      {total > shown.length && (
        <p className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
          {EMPLOYEE_PICKER_MORE_TEXT} — ظاهر {shown.length} من {total}
        </p>
      )}
    </div>
  ) : null

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        title={title}
        disabled={disabled}
        placeholder={placeholder}
        value={editing ? query : selectedLabel}
        className={`input w-full pr-9 ${showClear ? 'pl-14' : 'pl-9'} disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed ${inputClassName}`}
        onChange={(event) => {
          setQuery(event.target.value)
          setEditing(true)
          setActive(null)
          if (!open) openList()
        }}
        onMouseDown={() => {
          if (document.activeElement !== inputRef.current) selectOnMouseUp.current = true
        }}
        onFocus={(event) => event.currentTarget.select()}
        onMouseUp={(event) => {
          // الضغطة اللي ركّزت الخانة تسيب الاسم متعلّم كله — الكتابة تستبدله
          if (selectOnMouseUp.current) {
            selectOnMouseUp.current = false
            event.preventDefault()
          }
        }}
        onClick={() => {
          if (!open) openList()
        }}
        onBlur={() => {
          // مسح الاسم من الخانة والخروج منها = من غير موظف (زي «— اختر —» في القايمة القديمة)
          if (editing && query.trim() === '' && clearable && selectedId !== '') onChange('', null)
          close()
        }}
        onKeyDown={onKeyDown}
      />
      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-gray-400">
        {showClear && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="مسح الاختيار"
            title="مسح الاختيار"
            className="p-1 rounded-md hover:bg-gray-100 hover:text-gray-600"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? 'قفل القايمة' : 'عرض الموظفين'}
          disabled={disabled}
          className="p-0.5 rounded-md hover:text-gray-600 disabled:cursor-not-allowed"
          onMouseDown={(event) => {
            event.preventDefault()
            if (disabled) return
            if (open) close()
            else {
              inputRef.current?.focus()
              openList()
            }
          }}
        >
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {popup && portalTarget ? createPortal(popup, portalTarget) : null}
    </div>
  )
}

export default EmployeePicker
