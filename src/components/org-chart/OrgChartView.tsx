'use client'

import { ChevronDown, ChevronUp, UserRound, Users } from 'lucide-react'
import { OrgAvatar } from './OrgAvatar'
import { UNIT_KIND_LABELS, type OrgChart, type OrgPerson, type OrgUnit, type OrgUnitKind } from './orgChartModel'

// ألوان كل نوع وحدة: الشريط العلوي، الشارة، ولون الصورة البديلة لرئيسها
const KIND_STYLE: Record<OrgUnitKind, { bar: string; chip: string; avatar: string }> = {
  executive: { bar: 'bg-gradient-to-l from-primary-700 to-primary-500', chip: 'bg-primary-50 text-primary-700', avatar: 'bg-gradient-to-br from-primary-500 to-primary-700' },
  branch: { bar: 'bg-gradient-to-l from-purple-600 to-purple-400', chip: 'bg-purple-50 text-purple-700', avatar: 'bg-gradient-to-br from-purple-400 to-purple-600' },
  administration: { bar: 'bg-primary-500', chip: 'bg-primary-50 text-primary-700', avatar: 'bg-gradient-to-br from-primary-400 to-primary-600' },
  department: { bar: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700', avatar: 'bg-gradient-to-br from-sky-400 to-sky-600' },
  team: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', avatar: 'bg-gradient-to-br from-emerald-400 to-emerald-600' },
  unassigned: { bar: 'bg-gray-300', chip: 'bg-gray-100 text-gray-600', avatar: 'bg-gradient-to-br from-gray-400 to-gray-500' },
}

export interface OrgChartViewState {
  expanded: Set<string>
  membersOpen: Set<string>
  highlightUnits: Set<string>
  highlightPeople: Set<number>
  showBranch: boolean
  onToggle: (key: string) => void
  onToggleMembers: (key: string) => void
}

function PersonLine({ person, label, tone, highlighted }: { person: OrgPerson; label: string; tone: string; highlighted: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl p-1.5 -m-1.5 ${highlighted ? 'bg-warning-50' : ''}`}>
      <OrgAvatar person={person} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-800 text-sm truncate" title={person.name}>{person.name}</p>
        <p className="text-xs text-gray-500 truncate" title={person.jobTitle}>{person.jobTitle}</p>
        {label && label !== person.jobTitle && <p className="text-[11px] text-gray-400 truncate">{label}</p>}
      </div>
    </div>
  )
}

function UnitCard({ unit, state, wide }: { unit: OrgUnit; state: OrgChartViewState; wide?: boolean }) {
  const style = KIND_STYLE[unit.kind]
  const expanded = state.expanded.has(unit.key)
  const membersOpen = state.membersOpen.has(unit.key)
  const highlighted = state.highlightUnits.has(unit.key)
  return (
    <div
      data-org-key={unit.key}
      className={`oc-card bg-white rounded-xl border shadow-sm transition-shadow hover:shadow-md ${
        highlighted ? 'border-warning-500 ring-2 ring-warning-500/40' : 'border-gray-200'
      } ${wide ? 'oc-card-wide' : ''}`}
    >
      <div className={`h-1.5 rounded-t-xl ${style.bar}`} />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${style.chip}`}>{UNIT_KIND_LABELS[unit.kind]}</span>
          {state.showBranch && unit.branchName && unit.kind !== 'branch' && (
            <span className="text-[11px] text-gray-400 truncate" title={unit.branchName}>{unit.branchName}</span>
          )}
        </div>
        {unit.kind !== 'executive' || unit.name !== UNIT_KIND_LABELS.executive ? (
          <h3 className="mt-1.5 font-bold text-gray-800 leading-snug">{unit.name}</h3>
        ) : null}

        {unit.kind !== 'unassigned' && (
          <div className="mt-3">
            {unit.head ? (
              <PersonLine person={unit.head} label={unit.headLabel} tone={style.avatar} highlighted={state.highlightPeople.has(unit.head.id)} />
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-11 h-11 rounded-xl border border-dashed border-gray-300 flex items-center justify-center">
                  <UserRound size={18} />
                </div>
                {unit.kind === 'executive' ? 'لم يُحدَّد الرئيس التنفيذي — من إعدادات الأقسام' : `لم يُحدَّد ${unit.headLabel}`}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => state.onToggleMembers(unit.key)}
            disabled={unit.members.length === 0}
            className="flex items-center gap-1 text-gray-600 hover:text-primary-600 disabled:hover:text-gray-600 disabled:cursor-default"
            title={unit.members.length ? 'عرض الأعضاء' : undefined}
          >
            <Users size={14} className="text-gray-400" />
            <span className="font-semibold">{unit.headcount}</span> موظف
          </button>
          {unit.children.length > 0 && (
            <button
              type="button"
              onClick={() => state.onToggle(unit.key)}
              className="oc-noprint flex items-center gap-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-600 px-2 py-0.5"
              aria-expanded={expanded}
            >
              {unit.children.length} {unit.children.length === 1 ? 'وحدة' : 'وحدات'}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {membersOpen && unit.members.length > 0 && (
          <ul className="mt-2 max-h-56 overflow-auto space-y-1">
            {unit.members.map((m) => (
              <li
                key={m.id}
                className={`flex items-center gap-2 rounded-lg px-1.5 py-1 ${state.highlightPeople.has(m.id) ? 'bg-warning-50 ring-1 ring-warning-500/50' : ''}`}
              >
                <OrgAvatar person={m} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{m.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{m.jobTitle}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// الوحدات تحت الإدارة الرئيسية بتنزل عمودي (قائمة متداخلة) عشان الهيكل مايعرضش لمالانهاية
function Stack({ units, state }: { units: OrgUnit[]; state: OrgChartViewState }) {
  return (
    <ul className="oc-stack">
      {units.map((u) => (
        <li key={u.key} className="oc-stack-item">
          <UnitCard unit={u} state={state} />
          {state.expanded.has(u.key) && u.children.length > 0 && <Stack units={u.children} state={state} />}
        </li>
      ))}
    </ul>
  )
}

export function OrgChartView({ chart, state }: { chart: OrgChart; state: OrgChartViewState }) {
  const { root, secretary } = chart
  const rootOpen = state.expanded.has(root.key) && root.children.length > 0
  return (
    <div className="oc-canvas">
      <div className="oc-root">
        <UnitCard unit={root} state={state} wide />
        {secretary && (
          <div className="oc-side">
            <div className="oc-side-line" />
            <div
              data-org-key="secretary"
              className={`oc-card bg-white rounded-xl border shadow-sm w-56 ${
                state.highlightUnits.has('secretary') ? 'border-warning-500 ring-2 ring-warning-500/40' : 'border-gray-200'
              }`}
            >
              <div className="h-1.5 rounded-t-xl bg-gradient-to-l from-amber-500 to-amber-300" />
              <div className="p-3">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">السكرتير التنفيذي</span>
                <div className="mt-3">
                  <PersonLine
                    person={secretary}
                    label="تابع للرئيس التنفيذي"
                    tone="bg-gradient-to-br from-amber-400 to-amber-600"
                    highlighted={state.highlightPeople.has(secretary.id)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {rootOpen && (
        <ul className="oc-row">
          {root.children.map((u) => (
            <li key={u.key} className="oc-col">
              <UnitCard unit={u} state={state} />
              {state.expanded.has(u.key) && u.children.length > 0 && <Stack units={u.children} state={state} />}
            </li>
          ))}
        </ul>
      )}

      {/* نص خام: React بيهرّب علامات التنصيص لو اتحط كـchildren فتبوظ content: '' */}
      <style dangerouslySetInnerHTML={{ __html: ORG_CHART_CSS }} />
    </div>
  )
}

// خطوط الربط بخصائص منطقية (inline-start/end) عشان تشتغل صح في RTL
export const ORG_CHART_CSS = `
.oc-canvas { --oc-line: #cbd5e1; --oc-gap: 22px; display: flex; flex-direction: column; align-items: center; min-width: max-content; padding: 8px 260px 24px; }
.oc-card { width: 260px; text-align: start; }
.oc-card-wide { width: 300px; }
.oc-root { position: relative; }
.oc-side { position: absolute; top: 50%; inset-inline-start: 100%; transform: translateY(-50%); display: flex; align-items: center; }
.oc-side-line { width: 40px; border-top: 2px dashed var(--oc-line); }
.oc-row { display: flex; justify-content: center; align-items: flex-start; position: relative; padding-top: var(--oc-gap); margin: 0; }
.oc-row::before { content: ''; position: absolute; top: 0; inset-inline-start: 50%; height: var(--oc-gap); border-inline-start: 2px solid var(--oc-line); }
.oc-col { list-style: none; position: relative; display: flex; flex-direction: column; align-items: center; padding: var(--oc-gap) 10px 0; }
.oc-col::before, .oc-col::after { content: ''; position: absolute; top: 0; width: 50%; height: var(--oc-gap); border-top: 2px solid var(--oc-line); }
.oc-col::before { inset-inline-start: 0; }
.oc-col::after { inset-inline-end: 0; border-inline-start: 2px solid var(--oc-line); }
.oc-col:only-child { padding-top: 0; }
.oc-col:only-child::before, .oc-col:only-child::after { display: none; }
.oc-col:first-child::before { border: 0 none; }
.oc-col:last-child::after { border: 0 none; }
.oc-col:last-child::before { border-inline-end: 2px solid var(--oc-line); border-start-end-radius: 10px; }
.oc-col:first-child::after { border-start-start-radius: 10px; }
.oc-stack { list-style: none; margin: 0; padding: 0; width: 100%; }
.oc-stack-item { position: relative; padding-top: 12px; padding-inline-start: 30px; }
.oc-stack-item::before { content: ''; position: absolute; top: 0; inset-inline-start: 16px; width: 14px; height: 44px; border-inline-start: 2px solid var(--oc-line); border-bottom: 2px solid var(--oc-line); border-end-start-radius: 10px; }
.oc-stack-item:not(:last-child)::after { content: ''; position: absolute; top: 0; bottom: 0; inset-inline-start: 16px; border-inline-start: 2px solid var(--oc-line); }
.oc-stack-item > .oc-card { width: 100%; min-width: 180px; }
@media print {
  @page { size: A3 landscape; margin: 10mm; }
  html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  aside, header, .oc-noprint { display: none !important; }
  .mr-72 { margin-right: 0 !important; }
  main { padding: 0 !important; }
  .oc-scroll { overflow: visible !important; max-height: none !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; }
  .oc-card { box-shadow: none !important; break-inside: avoid; }}
`
