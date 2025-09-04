import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DayDetailModal } from "@/components/DayDetailModal";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Clock, CheckSquare, BookOpen, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";

interface Subject {
  id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: number;
  is_completed: boolean;
  subjects?: { name: string; color: string };
}

interface CalendarEvent {
  type: "subject" | "task";
  data: Subject | Task;
  date: Date;
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalEvents, setModalEvents] = useState<CalendarEvent[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*");

      if (subjectsError) throw subjectsError;

      // Fetch tasks for the current month
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          subjects (name, color)
        `)
        .gte("due_date", monthStart.toISOString().split('T')[0])
        .lte("due_date", monthEnd.toISOString().split('T')[0]);

      if (tasksError) throw tasksError;

      setSubjects(subjectsData || []);
      setTasks(tasksData || []);

      // Generate calendar events
      generateCalendarEvents(subjectsData || [], tasksData || [], monthStart, monthEnd);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data kalender",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarEvents = (
    subjects: Subject[],
    tasks: Task[],
    monthStart: Date,
    monthEnd: Date
  ) => {
    const events: CalendarEvent[] = [];

    // Add subject events (recurring weekly)
    const currentDate = new Date(monthStart);
    while (currentDate <= monthEnd) {
      subjects.forEach((subject) => {
        if (currentDate.getDay() === subject.day_of_week) {
          events.push({
            type: "subject",
            data: subject,
            date: new Date(currentDate),
          });
        }
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add task events (fix timezone bug)
    tasks.forEach((task) => {
      // Ensure the date is parsed as local date, not UTC
      events.push({
        type: "task",
        data: task,
        date: new Date(task.due_date + "T00:00:00"),
      });
    });

    setEvents(events);
  };

  const getEventsForDate = (date: Date) => {
    // Filter events for the selected date (subjects and tasks)
    return events.filter(event => isSameDay(event.date, date));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    setSelectedDayEvents(dayEvents);
    // Modal detail tetap muncul meskipun hanya ada tugas
    if (dayEvents.length > 0) {
      setIsDayModalOpen(true);
    }
  };

  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  const getDateClassName = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 0) return "";
    
    const hasSubjects = dayEvents.some(e => e.type === "subject");
    const hasTasks = dayEvents.some(e => e.type === "task" && !(e.data as Task).is_completed);
    const hasCompletedTasks = dayEvents.some(e => e.type === "task" && (e.data as Task).is_completed);
    
    if (hasSubjects && hasTasks) return "bg-gradient-to-br from-primary/30 to-warning/30 hover:from-primary/40 hover:to-warning/40";
    if (hasSubjects) return "bg-primary/30 hover:bg-primary/40";
    if (hasTasks) return "bg-warning/30 hover:bg-warning/40";
    if (hasCompletedTasks) return "bg-success/30 hover:bg-success/40";
    
    return "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const todayEvents = getEventsForDate(new Date());
  const todaySubjects = todayEvents.filter(e => e.type === "subject");
  const todayTasks = todayEvents.filter(e => e.type === "task");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Kalender</h1>
        <p className="text-muted-foreground">
          Lihat jadwal mata pelajaran dan tugas dalam tampilan kalender
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(selectedDate, "MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-lg border-0 pointer-events-auto"
                modifiers={{
                  hasEvents: (date) => hasEventsOnDate(date),
                }}
                modifiersClassNames={{
                  hasEvents: "relative",
                }}
                components={{
                  Day: ({ date, ...props }) => {
                    const dayEvents = getEventsForDate(date);
                    return (
                      <div className="relative w-full h-full">
                        <button
                          {...props}
                          className={`w-full h-full text-center hover:bg-accent hover:text-accent-foreground rounded-md transition-colors ${getDateClassName(date)}`}
                          onClick={() => handleDateSelect(date)}
                        >
                          {date.getDate()}
                          {dayEvents.length > 0 && (
                            <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2">
                              <div className="flex gap-0.5">
                                {dayEvents.slice(0, 3).map((_, index) => (
                                  <div
                                    key={index}
                                    className="w-1.5 h-1.5 rounded-full bg-current opacity-80"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  },
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hari Ini</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Tidak ada jadwal hari ini
                </p>
              ) : (
                <>
                  {todaySubjects.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Mata Pelajaran
                      </h4>
                      <div className="space-y-2">
                        {todaySubjects.map((event) => {
                          const subject = event.data as Subject;
                          return (
                            <div
                              key={subject.id}
                              className="flex items-center gap-2 p-2 rounded border"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: subject.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{subject.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {subject.start_time} - {subject.end_time}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {todayTasks.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        Tugas
                      </h4>
                      <div className="space-y-2">
                        {todayTasks.map((event) => {
                          const task = event.data as Task;
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 p-2 rounded border"
                            >
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm truncate ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                   <Badge
                                     variant={task.priority === 3 ? "priority-high" : task.priority === 2 ? "priority-medium" : "priority-low"}
                                     className="text-xs"
                                   >
                                     {task.priority === 3 ? "Tinggi" : task.priority === 2 ? "Sedang" : "Rendah"}
                                   </Badge>
                                   {task.is_completed && (
                                     <Badge variant="success" className="text-xs">
                                       Selesai
                                     </Badge>
                                   )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Keterangan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-primary/30"></div>
                <span>Mata Pelajaran</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-warning/30"></div>
                <span>Tugas Belum Selesai</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-success/30"></div>
                <span>Tugas Selesai</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-gradient-to-br from-primary/30 to-warning/30"></div>
                <span>Mata Pelajaran + Tugas</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day Detail Modal with Dialog */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DayDetailModal
          date={selectedDate}
          events={selectedDayEvents}
          onClose={() => setIsDayModalOpen(false)}
        />
      </Dialog>
    </div>
  );
}