import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { DayDetailModal } from "@/components/DayDetailModal";
import { Dialog } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

export function CalendarWidget() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*");

      if (subjectsError) throw subjectsError;

      // Fetch tasks for the current month
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          subjects (name, color)
        `)
        .gte("due_date", monthStart.toISOString().split('T')[0])
        .lte("due_date", monthEnd.toISOString().split('T')[0]);

      if (tasksError) throw tasksError;

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

    // Add task events
    tasks.forEach((task) => {
      events.push({
        type: "task",
        data: task,
        date: new Date(task.due_date),
      });
    });

    setEvents(events);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    const dayEvents = getEventsForDate(date);
    setSelectedDayEvents(dayEvents);
    
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
      <Card className="shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Kalender
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-300 animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Kalender
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-lg border-0 p-0 pointer-events-auto w-full"
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
                      onClick={() => handleDateSelect(date)}
                      className={`w-full h-full text-center hover:bg-accent hover:text-accent-foreground rounded-md transition-all duration-200 text-sm sm:text-base cursor-pointer ${getDateClassName(date)}`}
                    >
                      {date.getDate()}
                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2">
                          <div className="flex gap-0.5 flex-wrap justify-center max-w-full">
                            {dayEvents.slice(0, 4).map((event, index) => {
                              const isSubject = event.type === "subject";
                              const isTask = event.type === "task";
                              const isCompleted = isTask && (event.data as Task).is_completed;
                              
                              return (
                                <div
                                  key={`${event.type}-${event.data.id}-${index}`}
                                  className={`w-1 h-1 rounded-full animate-scale-in ${
                                    isSubject ? 'bg-primary' :
                                    isCompleted ? 'bg-success' : 'bg-warning'
                                  }`}
                                  style={{ animationDelay: `${index * 0.1}s` }}
                                />
                              );
                            })}
                            {dayEvents.length > 4 && (
                              <div className="w-1 h-1 rounded-full bg-muted-foreground animate-scale-in" />
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                );
              },
            }}
          />
          
          {/* Mini legend */}
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded bg-primary"></div>
              <span className="text-muted-foreground">Mata Pelajaran</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded bg-warning"></div>
              <span className="text-muted-foreground">Tugas Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded bg-success"></div>
              <span className="text-muted-foreground">Tugas Selesai</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Modal */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DayDetailModal
          date={selectedDate}
          events={selectedDayEvents}
          onClose={() => setIsDayModalOpen(false)}
        />
      </Dialog>
    </>
  );
}