"use client";

import { useEffect, useState } from "react";
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
import { fetchCalendar, type ApiLeave } from "@/lib/api";

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

const leaveTypeLabels: Record<string, string> = {
  ANNUAL: "سنوية",
  SICK: "مرضية",
  CASUAL: "عارضة",
  UNPAID: "بدون راتب",
};

const arabicMonths = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const pad = (n: number) => String(n).padStart(2, "0");

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTypes, setSelectedTypes] = useState<string[]>(eventTypes.map(t => t.id));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  const [holidays, setHolidays] = useState<ApiHoliday[]>([]);
  const [leaves, setLeaves] = useState<ApiLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    let cancelled = false;
    const monthStr = `${year}-${pad(month + 1)}`;
    setLoading(true);
    setError("");
    fetchCalendar(monthStr)
      .then((data) => {
        if (cancelled) return;
        setHolidays((data.holidays ?? []) as ApiHoliday[]);
        setLeaves(data.leaves ?? []);
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
  }, [year, month]);

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
      description: `إجازة ${leaveTypeLabels[l.leaveType] ?? l.leaveType} (${l.days} يوم)`,
    })),
  ];

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Get previous month days to fill the grid
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Generate calendar grid
  const calendarDays: { date: number; month: number; isCurrentMonth: boolean }[] = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ date: prevMonthDays - i, month: month - 1, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ date: i, month: month, isCurrentMonth: true });
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ date: i, month: month + 1, isCurrentMonth: false });
  }

  const getEventsForDate = (date: number, eventMonth: number) => {
    const d = new Date(year, eventMonth, date);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return events.filter(event => {
      if (!selectedTypes.includes(event.type)) return false;
      if (event.date === dateStr) return true;
      if (event.endDate) {
        const start = new Date(event.date);
        const end = new Date(event.endDate);
        const current = new Date(dateStr);
        return current >= start && current <= end;
      }
      return false;
    });
  };

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
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get upcoming events
  const upcomingEvents = events
    .filter(event => selectedTypes.includes(event.type))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  // Stats
  const stats = {
    leaves: leaves.length,
    holidays: holidays.length,
    employeesOnLeave: new Set(leaves.map(l => l.employeeId)).size,
    leaveDays: leaves.reduce((sum, l) => sum + Number(l.days ?? 0), 0),
    events: events.length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">التقويم الموحد</h1>
            <p className="text-gray-600 mt-1">عرض العطلات الرسمية وإجازات الموظفين في مكان واحد</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة حدث
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarIcon className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.leaves}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.holidays}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.employeesOnLeave}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.leaveDays}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.events}</p>
                <p className="text-sm text-gray-500">أحداث الشهر</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="col-span-3 card p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">
                  {arabicMonths[month]} {year}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToToday}
                  className="btn-secondary text-sm"
                >
                  اليوم
                </button>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setView("month")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      view === "month" ? "bg-white shadow text-gray-900" : "text-gray-600"
                    }`}
                  >
                    شهري
                  </button>
                  <button
                    onClick={() => setView("week")}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      view === "week" ? "bg-white shadow text-gray-900" : "text-gray-600"
                    }`}
                  >
                    أسبوعي
                  </button>
                </div>
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
                  {calendarDays.map((day, index) => {
                    const dayEvents = getEventsForDate(day.date, day.month);
                    const isToday = day.isCurrentMonth &&
                      new Date().getDate() === day.date &&
                      new Date().getMonth() === month &&
                      new Date().getFullYear() === year;

                    return (
                      <div
                        key={index}
                        className={`min-h-[100px] p-2 border rounded-lg transition-colors ${
                          day.isCurrentMonth
                            ? "bg-white border-gray-200 hover:border-primary-300"
                            : "bg-gray-50 border-gray-100"
                        } ${isToday ? "ring-2 ring-primary-500" : ""}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          day.isCurrentMonth ? "text-gray-900" : "text-gray-400"
                        } ${isToday ? "text-primary-600" : ""}`}>
                          {day.date}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer text-white ${getEventColor(event.type)}`}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{dayEvents.length - 3} المزيد
                            </div>
                          )}
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
              <h3 className="font-bold text-gray-900 mb-4">أحداث الشهر</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">لا توجد أحداث هذا الشهر</p>
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
                            {new Date(event.date).toLocaleDateString("ar-SA")}
                            {event.endDate && event.endDate !== event.date &&
                              ` - ${new Date(event.endDate).toLocaleDateString("ar-SA")}`}
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
                    {new Date(selectedEvent.date).toLocaleDateString("ar-SA")}
                    {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.date &&
                      ` - ${new Date(selectedEvent.endDate).toLocaleDateString("ar-SA")}`}
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
