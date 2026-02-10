"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout";
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Briefcase,
  GraduationCap,
  Cake,
  FileText,
  AlertTriangle,
  Plus,
  Filter,
  Download,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: "leave" | "holiday" | "birthday" | "training" | "interview" | "contract" | "meeting";
  employee?: string;
  department?: string;
  description?: string;
}

const eventTypes = [
  { id: "leave", name: "إجازات", color: "bg-blue-500", icon: CalendarIcon },
  { id: "holiday", name: "عطلات رسمية", color: "bg-red-500", icon: CalendarIcon },
  { id: "birthday", name: "أعياد ميلاد", color: "bg-pink-500", icon: Cake },
  { id: "training", name: "تدريبات", color: "bg-purple-500", icon: GraduationCap },
  { id: "interview", name: "مقابلات", color: "bg-green-500", icon: Users },
  { id: "contract", name: "انتهاء عقود", color: "bg-orange-500", icon: FileText },
  { id: "meeting", name: "اجتماعات", color: "bg-cyan-500", icon: Briefcase },
];

const mockEvents: CalendarEvent[] = [
  // Leaves
  { id: "1", title: "إجازة أحمد محمد", date: "2024-02-05", endDate: "2024-02-08", type: "leave", employee: "أحمد محمد", department: "تقنية المعلومات" },
  { id: "2", title: "إجازة سارة أحمد", date: "2024-02-12", endDate: "2024-02-14", type: "leave", employee: "سارة أحمد", department: "الموارد البشرية" },
  { id: "3", title: "إجازة محمد خالد", date: "2024-02-18", endDate: "2024-02-22", type: "leave", employee: "محمد خالد", department: "المبيعات" },

  // Holidays
  { id: "4", title: "يوم التأسيس", date: "2024-02-22", type: "holiday", description: "عطلة رسمية" },

  // Birthdays
  { id: "5", title: "عيد ميلاد فهد عبدالله", date: "2024-02-10", type: "birthday", employee: "فهد عبدالله", department: "تقنية المعلومات" },
  { id: "6", title: "عيد ميلاد نورة محمد", date: "2024-02-15", type: "birthday", employee: "نورة محمد", department: "الموارد البشرية" },
  { id: "7", title: "عيد ميلاد خالد سعود", date: "2024-02-25", type: "birthday", employee: "خالد سعود", department: "المالية" },

  // Training
  { id: "8", title: "دورة القيادة الإدارية", date: "2024-02-07", endDate: "2024-02-09", type: "training", description: "دورة للمدراء" },
  { id: "9", title: "ورشة أمن المعلومات", date: "2024-02-20", type: "training", description: "ورشة إلزامية" },

  // Interviews
  { id: "10", title: "مقابلة مطور برمجيات", date: "2024-02-06", type: "interview", description: "مرشح: علي محمد" },
  { id: "11", title: "مقابلة محاسب", date: "2024-02-13", type: "interview", description: "مرشح: سعاد أحمد" },

  // Contract expiry
  { id: "12", title: "انتهاء عقد عمر السالم", date: "2024-02-28", type: "contract", employee: "عمر السالم", department: "العمليات" },
  { id: "13", title: "انتهاء عقد ريم الدوسري", date: "2024-03-15", type: "contract", employee: "ريم الدوسري", department: "تقنية المعلومات" },

  // Meetings
  { id: "14", title: "اجتماع الإدارة الشهري", date: "2024-02-04", type: "meeting", description: "قاعة الاجتماعات الرئيسية" },
  { id: "15", title: "مراجعة الأداء الربعي", date: "2024-02-26", type: "meeting", description: "جميع المدراء" },
];

const arabicMonths = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 1, 1)); // February 2024
  const [selectedTypes, setSelectedTypes] = useState<string[]>(eventTypes.map(t => t.id));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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
    const dateStr = `${year}-${String(eventMonth + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    return mockEvents.filter(event => {
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
  const upcomingEvents = mockEvents
    .filter(event => selectedTypes.includes(event.type))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  // Stats
  const stats = {
    leaves: mockEvents.filter(e => e.type === "leave").length,
    birthdays: mockEvents.filter(e => e.type === "birthday").length,
    trainings: mockEvents.filter(e => e.type === "training").length,
    interviews: mockEvents.filter(e => e.type === "interview").length,
    contracts: mockEvents.filter(e => e.type === "contract").length,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">التقويم الموحد</h1>
            <p className="text-gray-600 mt-1">عرض جميع الأحداث والمناسبات في مكان واحد</p>
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
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <Cake className="text-pink-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.birthdays}</p>
                <p className="text-sm text-gray-500">أعياد ميلاد</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.trainings}</p>
                <p className="text-sm text-gray-500">تدريبات</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.interviews}</p>
                <p className="text-sm text-gray-500">مقابلات</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.contracts}</p>
                <p className="text-sm text-gray-500">عقود تنتهي</p>
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
                const events = getEventsForDate(day.date, day.month);
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
                      {events.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer text-white ${getEventColor(event.type)}`}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{events.length - 3} المزيد
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
              <h3 className="font-bold text-gray-900 mb-4">الأحداث القادمة</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {upcomingEvents.map((event) => {
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
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                    {selectedEvent.endDate && ` - ${new Date(selectedEvent.endDate).toLocaleDateString("ar-SA")}`}
                  </span>
                </div>
                {selectedEvent.employee && (
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-gray-400" />
                    <span className="text-gray-700">{selectedEvent.employee}</span>
                  </div>
                )}
                {selectedEvent.department && (
                  <div className="flex items-center gap-3">
                    <Briefcase size={18} className="text-gray-400" />
                    <span className="text-gray-700">{selectedEvent.department}</span>
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
