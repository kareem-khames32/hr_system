"use client";

import Link from "next/link";
import { useLeaveCatalog } from "@/lib/leave-catalog";
import { downloadCsv } from "@/lib/csv";
import { useEffect, useMemo, useState } from "react";
import { calendarRange, localDateKey, parseLocalDate, addLocalDays, intersectDateRange, type CalendarView } from '@/lib/calendar-range';
import { MainLayout } from "@/components/layout";
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Users,
  Briefcase,
  FileText,
  Filter,
  Clock,
  Sun,
  Plus,
  Download,
} from "lucide-react";
import { can, fetchCalendar, type ApiLeave } from "@/lib/api";
import { DISPLAY_LOCALE } from "@/lib/dates";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: "leave" | "holiday";
  employee?: string;
  description?: string;
}

interface ApiHoliday {
  id: number;
  name: string;
  date: string;
  endDate?: string | null;
}

const eventTypes = [
  { id: "leave", name: "إجازة", color: "bg-blue-500", icon: CalendarIcon },
  { id: "holiday", name: "عطلة رسمية", color: "bg-red-500", icon: Sun },
];



const arabicMonths = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];



export default function CalendarPage() {
  const leaveCatalog = useLeaveCatalog();
  const [canAddHoliday, setCanAddHoliday] = useState(false);
  useEffect(() => setCanAddHoliday(can("settings.manage")), []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(eventTypes.map(t => t.id));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [holidays, setHolidays] = useState<ApiHoliday[]>([]);
  const [leaves, setLeaves] = useState<(ApiLeave & { daysInMonth?: number; daysInRange?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const range = useMemo(() => calendarRange(currentDate, view), [currentDate, view]);
  const periodName = view === 'week' ? 'الأسبوع' : 'الشهر';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setHolidays([]); setLeaves([]); setSelectedEvent(null);
    Promise.all(range.months.map((monthKey) => fetchCalendar(monthKey, { from: range.from, to: range.to })))
      .then((responses) => {
        if (cancelled) return;
        setHolidays([...new Map(responses.flatMap((data) => data.holidays).map((holiday) => [holiday.id, holiday])).values()]);
        setLeaves([...new Map(responses.flatMap((data) => data.leaves).map((leave) => [leave.id, leave])).values()]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "تعذر تحميل التقويم");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const events: CalendarEvent[] = [
    ...holidays.map((h) => ({
      id: `h-${h.id}`,
      title: h.name,
      date: h.date,
      endDate: h.endDate ?? undefined,
      type: "holiday" as const,
      description: "عطلة رسمية",
    })),
    ...leaves.map((l) => ({
      id: `l-${l.id}`,
      title: l.employeeName ? `إجازة ${l.employeeName}` : "إجازة",
      date: l.fromDate,
      endDate: l.toDate,
      type: "leave" as const,
      employee: l.employeeName,
      description: `${leaveCatalog.label(l.leaveType)} (${l.period === "MORNING" ? "نصف يوم صباحي" : l.period === "EVENING" ? "نصف يوم مسائي" : `${l.days} يوم`})`,
    })),
  ];

  const displayedDays = range.days.map((date) => ({ date: date.getDate(), key: localDateKey(date), value: date, isInRange: localDateKey(date) >= range.from && localDateKey(date) <= range.to }));
  const visibleEvents = events.filter((event) => selectedTypes.includes(event.type) && intersectDateRange(event.date, event.endDate ?? event.date, range.from, range.to));
  const getEventsForDate = (date: string) => date < range.from || date > range.to ? [] : visibleEvents.filter((event) => event.date <= date && (event.endDate ?? event.date) >= date);

  const toggleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      setSelectedTypes(selectedTypes.filter(t => t !== typeId));
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  const getEventColor = (type: string) => {
    return eventTypes.find(t => t.id === type)?.color || "bg-gray-500";
  };

  const getEventIcon = (type: string) => {
    return eventTypes.find(t => t.id === type)?.icon || CalendarIcon;
  };

  const prevMonth = () => {
    setCurrentDate(view === 'week' ? addLocalDays(currentDate, -7) : new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(view === 'week' ? addLocalDays(currentDate, 7) : new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get upcoming events
  const upcomingEvents = [...visibleEvents].sort((a, b) => a.date.localeCompare(b.date));

  // Stats
  const stats = {
    leaves: selectedTypes.includes('leave') ? leaves.length : 0,
    holidays: selectedTypes.includes('holiday') ? holidays.length : 0,
    employeesOnLeave: selectedTypes.includes('leave') ? new Set(leaves.map(l => l.employeeId)).size : 0,
    leaveDays: selectedTypes.includes('leave') ? leaves.reduce((sum, l) => sum + Number(l.daysInRange ?? l.daysInMonth ?? 0), 0) : 0,
    events: visibleEvents.length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {leaveCatalog.error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">تعذر تحميل أنواع الإجازات: {leaveCatalog.error} <button type="button" className="underline" onClick={leaveCatalog.retry}>إعادة المحاولة</button></div>}
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التقويم</h1>
            <p className="text-gray-600 mt-1">عرض العطلات الرسمية وإجازات الموظفين في مكان واحد</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadCsv(`calendar-${range.from}-${range.to}.csv`, ["الحدث", "النوع", "البداية الأصلية", "النهاية الأصلية", "بداية الحدث ضمن العرض", "نهاية الحدث ضمن العرض", "الموظف", "الوصف"], visibleEvents.map(event => { const clipped = intersectDateRange(event.date, event.endDate ?? event.date, range.from, range.to); return [event.title, event.type === "leave" ? "إجازة" : "عطلة رسمية", event.date, event.endDate ?? event.date, clipped?.from, clipped?.to, event.employee, event.description]; }))} disabled={loading || !!error || !visibleEvents.length} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
              <Download size={18} />
              تصدير
            </button>
            {canAddHoliday && <Link href="/leaves/holidays" className="btn-primary flex items-center gap-2"><Plus size={18} />إضافة عطلة</Link>}
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <p className="text-xs text-gray-500">الإحصاءات والتصدير حسب الفلاتر، من {parseLocalDate(range.from).toLocaleDateString(DISPLAY_LOCALE)} إلى {parseLocalDate(range.to).toLocaleDateString(DISPLAY_LOCALE)}. أيام الإجازة هي الأيام الفعلية داخل النطاق.</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarIcon className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : error ? '—' : stats.leaves}</p>
                <p className="text-sm text-gray-500">إجازات</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Sun className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : error ? '—' : stats.holidays}</p>
                <p className="text-sm text-gray-500">عطلات رسمية</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : error ? '—' : stats.employeesOnLeave}</p>
                <p className="text-sm text-gray-500">موظفون في إجازة</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : error ? '—' : stats.leaveDays}</p>
                <p className="text-sm text-gray-500">أيام إجازة</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Briefcase className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '…' : error ? '—' : stats.events}</p>
                <p className="text-sm text-gray-500">أحداث {periodName}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="xl:col-span-3 card p-4 min-w-0">
            {/* Calendar Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  aria-label={`${periodName} السابق`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
                <h2 className="text-base font-bold text-gray-900">
                  {view === 'week' ? `${parseLocalDate(range.from).toLocaleDateString(DISPLAY_LOCALE, { day: 'numeric', month: 'short' })} — ${parseLocalDate(range.to).toLocaleDateString(DISPLAY_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })}` : `${arabicMonths[month]} ${year}`}
                </h2>
                <button
                  onClick={nextMonth}
                  aria-label={`${periodName} التالي`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-gray-100 p-1"><button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')} className={`px-3 py-1.5 text-xs rounded-md ${view === 'month' ? 'bg-white shadow-sm text-primary-700 font-bold' : 'text-gray-500'}`}>شهري</button><button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')} className={`px-3 py-1.5 text-xs rounded-md ${view === 'week' ? 'bg-white shadow-sm text-primary-700 font-bold' : 'text-gray-500'}`}>أسبوعي</button></div>
                <button
                  onClick={goToToday}
                  className="btn-secondary text-sm"
                >
                  اليوم
                </button>

              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {arabicDays.map((day) => (
                    <div key={day} className="text-center py-2 text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {displayedDays.map((day) => {
                    const dayEvents = getEventsForDate(day.key);
                    const isToday = day.key === localDateKey(new Date());

                    return (
                      <div
                        key={day.key}
                        data-date={day.key}
                        className={`${view === 'week' ? 'min-h-[330px]' : 'min-h-[100px]'} min-w-0 p-1.5 border rounded-lg transition-colors ${
                          day.isInRange
                            ? "bg-white border-gray-200 hover:border-primary-300"
                            : "bg-gray-50 border-gray-100"
                        } ${isToday ? "ring-2 ring-primary-500" : ""}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          day.isInRange ? "text-gray-900" : "text-gray-400"
                        } ${isToday ? "text-primary-600" : ""}`}>
                          {day.date}
                          {view === 'week' && <span className="block text-[10px] text-gray-400">{arabicMonths[day.value.getMonth()]}</span>}
                        </div>
                        <div className={`space-y-1 overflow-y-auto ${view === 'week' ? 'max-h-[450px]' : 'max-h-[100px]'}`}>
                          {dayEvents.map((event) => (
                            <button
                              type="button"
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`block w-full text-right text-[11px] px-1.5 py-1 rounded break-words text-white ${getEventColor(event.type)}`}
                              title={event.title}
                            >
                              {event.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Filters */}
            <div className="card p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Filter size={18} />
                تصفية الأحداث
              </h3>
              <div className="space-y-2">
                {eventTypes.map((type) => (
                  <label
                    key={type.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.id)}
                      onChange={() => toggleType(type.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <div className={`w-3 h-3 rounded-full ${type.color}`} />
                    <span className="text-sm text-gray-700">{type.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="card p-4">
              <h3 className="font-bold text-gray-900 mb-4">أحداث {periodName}</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">لا توجد أحداث وفق الفلاتر في هذا {periodName}</p>
                ) : (
                  upcomingEvents.map((event) => {
                    const EventIcon = getEventIcon(event.type);
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getEventColor(event.type)}`}>
                          <EventIcon size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{event.title}</p>
                          <p className="text-xs text-gray-500">
                            {parseLocalDate(event.date).toLocaleDateString(DISPLAY_LOCALE)}
                            {event.endDate && event.endDate !== event.date &&
                              ` - ${parseLocalDate(event.endDate).toLocaleDateString(DISPLAY_LOCALE)}`}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className={`p-6 rounded-t-xl ${getEventColor(selectedEvent.type)}`}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const EventIcon = getEventIcon(selectedEvent.type);
                    return <EventIcon size={24} className="text-white" />;
                  })()}
                  <h2 className="text-xl font-bold text-white">{selectedEvent.title}</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <CalendarIcon size={18} className="text-gray-400" />
                  <span className="text-gray-700">
                    {parseLocalDate(selectedEvent.date).toLocaleDateString(DISPLAY_LOCALE)}
                    {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.date &&
                      ` - ${parseLocalDate(selectedEvent.endDate).toLocaleDateString(DISPLAY_LOCALE)}`}
                  </span>
                </div>
                {selectedEvent.employee && (
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-gray-400" />
                    <span className="text-gray-700">{selectedEvent.employee}</span>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="flex items-start gap-3">
                    <FileText size={18} className="text-gray-400 mt-0.5" />
                    <span className="text-gray-700">{selectedEvent.description}</span>
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end rounded-b-xl">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="btn-secondary"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
