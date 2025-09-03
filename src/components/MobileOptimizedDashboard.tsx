import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BookOpen, CheckCircle2, AlertCircle, ChevronRight, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CalendarWidget } from "@/components/CalendarWidget";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { usePerformanceMonitor, useMemoizedData } from "@/hooks/usePerformance";
import { useAccessibility } from "@/components/AccessibilityProvider";

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
  subject_id?: string;
  subjects?: { name: string; color: string };
}

const priorityLabels = {
  1: "Rendah",
  2: "Sedang", 
  3: "Tinggi"
};

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function MobileOptimizedDashboard() {
  const [todaySubjects, setTodaySubjects] = useState<Subject[]>([]);
  const [tomorrowSubjects, setTomorrowSubjects] = useState<Subject[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedule' | 'tasks' | 'calendar'>('schedule');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { announceToScreenReader, reducedMotion } = useAccessibility();
  const { getAverageRenderTime } = usePerformanceMonitor();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Memoized calculations for better performance
  const todayTasksCount = useMemoizedData(
    upcomingTasks,
    (tasks) => tasks.filter(t => isToday(parseISO(t.due_date))).length,
    [upcomingTasks]
  );

  const urgentTasksCount = useMemoizedData(
    upcomingTasks,
    (tasks) => tasks.filter(t => t.priority === 3).length,
    [upcomingTasks]
  );

  const fetchDashboardData = async () => {
    try {
      // Batch all queries for better performance
      const [todayResult, tomorrowResult, tasksResult] = await Promise.all([
        supabase
          .from("subjects")
          .select("*")
          .eq("day_of_week", today.getDay())
          .order("start_time"),
        
        supabase
          .from("subjects")
          .select("*")
          .eq("day_of_week", tomorrow.getDay())
          .order("start_time"),
        
        supabase
          .from("tasks")
          .select(`*, subjects (name, color)`)
          .gte("due_date", today.toISOString().split('T')[0])
          .lte("due_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq("is_completed", false)
          .order("due_date")
          .order("priority", { ascending: false })
      ]);

      if (todayResult.error) throw todayResult.error;
      if (tomorrowResult.error) throw tomorrowResult.error;
      if (tasksResult.error) throw tasksResult.error;

      setTodaySubjects(todayResult.data || []);
      setTomorrowSubjects(tomorrowResult.data || []);
      setUpcomingTasks(tasksResult.data || []);
      
      // Announce to screen reader for accessibility
      announceToScreenReader(
        `Dashboard loaded. ${todayResult.data?.length || 0} classes today, ${tasksResult.data?.length || 0} pending tasks.`
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markTaskComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: true })
        .eq("id", taskId);

      if (error) throw error;

      setUpcomingTasks(prev => prev.filter(task => task.id !== taskId));
      toast({
        title: "Berhasil!",
        description: "Tugas telah ditandai selesai",
      });
      
      announceToScreenReader("Tugas telah ditandai selesai");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menandai tugas selesai",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center" role="status" aria-label="Loading dashboard">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" aria-hidden="true"></div>
        <span className="sr-only">Memuat dashboard...</span>
      </div>
    );
  }

  const tabContent = {
    schedule: (
      <div className="space-y-4">
        {/* Today's Schedule */}
        <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-300" role="region" aria-labelledby="today-schedule">
          <CardHeader className="pb-3">
            <CardTitle id="today-schedule" className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              Jadwal Hari Ini
              <Badge variant="secondary" className="ml-auto">
                {dayNames[today.getDay()]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-60 overflow-y-auto">
            {todaySubjects.length === 0 ? (
              <div className="text-center py-8" role="status">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" aria-hidden="true" />
                <p className="text-muted-foreground text-sm">
                  Tidak ada jadwal hari ini
                </p>
              </div>
            ) : (
              <div role="list" aria-label="Jadwal mata pelajaran hari ini">
                {todaySubjects.map((subject, index) => (
                  <div
                    key={subject.id}
                    role="listitem"
                    className={`flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-all duration-200 ${!reducedMotion ? 'animate-fade-in hover-scale' : ''}`}
                    style={{ animationDelay: reducedMotion ? '0ms' : `${index * 0.1}s` }}
                  >
                    <div
                      className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${!reducedMotion ? 'animate-scale-in' : ''}`}
                      style={{ 
                        backgroundColor: subject.color,
                        animationDelay: reducedMotion ? '0ms' : `${index * 0.1 + 0.2}s`
                      }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <time>{subject.start_time} - {subject.end_time}</time>
                      </p>
                      {subject.location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span aria-label="Lokasi">📍</span> {subject.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tomorrow's Schedule */}
        <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-300" role="region" aria-labelledby="tomorrow-schedule">
          <CardHeader className="pb-3">
            <CardTitle id="tomorrow-schedule" className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              Jadwal Besok
              <Badge variant="secondary" className="ml-auto">
                {dayNames[tomorrow.getDay()]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-60 overflow-y-auto">
            {tomorrowSubjects.length === 0 ? (
              <div className="text-center py-8" role="status">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" aria-hidden="true" />
                <p className="text-muted-foreground text-sm">
                  Tidak ada jadwal besok
                </p>
              </div>
            ) : (
              <div role="list" aria-label="Jadwal mata pelajaran besok">
                {tomorrowSubjects.map((subject, index) => (
                  <div
                    key={subject.id}
                    role="listitem"
                    className={`flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-all duration-200 ${!reducedMotion ? 'animate-fade-in hover-scale' : ''}`}
                    style={{ animationDelay: reducedMotion ? '0ms' : `${index * 0.1}s` }}
                  >
                    <div
                      className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${!reducedMotion ? 'animate-scale-in' : ''}`}
                      style={{ 
                        backgroundColor: subject.color,
                        animationDelay: reducedMotion ? '0ms' : `${index * 0.1 + 0.2}s`
                      }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <time>{subject.start_time} - {subject.end_time}</time>
                      </p>
                      {subject.location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span aria-label="Lokasi">📍</span> {subject.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    ),
    
    tasks: (
      <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-300" role="region" aria-labelledby="upcoming-tasks">
        <CardHeader className="pb-3">
          <CardTitle id="upcoming-tasks" className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-warning" aria-hidden="true" />
            Tugas Mendatang
            {upcomingTasks.length > 0 && (
              <Badge variant="priority-medium" className="ml-auto">
                {upcomingTasks.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-8" role="status">
              <CheckCircle2 className="h-12 w-12 text-success/50 mx-auto mb-3" aria-hidden="true" />
              <p className="text-muted-foreground text-sm">
                Semua tugas selesai!
              </p>
            </div>
          ) : (
            <div role="list" aria-label="Daftar tugas mendatang">
              {upcomingTasks.map((task, index) => (
                <div
                  key={task.id}
                  role="listitem"
                  className={`flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-all duration-200 group ${!reducedMotion ? 'animate-fade-in hover-scale' : ''}`}
                  style={{ animationDelay: reducedMotion ? '0ms' : `${index * 0.1}s` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium truncate">{task.title}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markTaskComplete(task.id)}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 p-1 h-auto hover-scale"
                        aria-label={`Tandai tugas ${task.title} sebagai selesai`}
                      >
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={task.priority === 3 ? "priority-high" : task.priority === 2 ? "priority-medium" : "priority-low"}
                        className={`text-xs ${!reducedMotion ? 'animate-scale-in' : ''}`}
                        style={{ animationDelay: reducedMotion ? '0ms' : `${index * 0.1 + 0.3}s` }}
                      >
                        {priorityLabels[task.priority as keyof typeof priorityLabels]}
                      </Badge>
                      {task.subjects && (
                        <span className="text-xs text-muted-foreground truncate">
                          {task.subjects.name}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {isToday(parseISO(task.due_date)) && <><span aria-label="Tanggal">📅</span> Hari ini</>}
                      {isTomorrow(parseISO(task.due_date)) && <><span aria-label="Tanggal">📅</span> Besok</>}
                      {!isToday(parseISO(task.due_date)) && !isTomorrow(parseISO(task.due_date)) && 
                        <><span aria-label="Tanggal">📅</span> <time>{format(parseISO(task.due_date), "d MMM yyyy")}</time></>
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    ),
    
    calendar: (
      <div className="sticky top-6">
        <CalendarWidget />
      </div>
    )
  };

  return (
    <div className={`space-y-6 ${!reducedMotion ? 'animate-fade-in' : ''}`}>
      <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 py-6">
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent ${!reducedMotion ? 'animate-scale-in' : ''}`}>
            Belajar Pintar-Ku
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Kelola jadwal belajar dan tugas dengan mudah
          </p>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden">
          <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Dashboard navigation">
            {[
              { key: 'schedule', label: 'Jadwal', icon: BookOpen },
              { key: 'tasks', label: 'Tugas', icon: AlertCircle },
              { key: 'calendar', label: 'Kalender', icon: Calendar }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                aria-controls={`${key}-panel`}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(key as typeof activeTab)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xs:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:hidden">
          <div id={`${activeTab}-panel`} role="tabpanel" tabIndex={0}>
            {tabContent[activeTab]}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-4 xl:col-span-3">
            {tabContent.calendar}
          </div>

          {/* Schedule and Tasks */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {tabContent.schedule}
            {tabContent.tasks}
          </div>
        </div>

        {/* Quick Actions - Mobile Bottom Fixed */}
        <div className="lg:hidden fixed bottom-6 right-4 flex flex-col gap-3">
          <Button 
            className="rounded-full h-12 w-12 bg-gradient-primary hover:opacity-90 shadow-elegant transition-all duration-300 hover-scale"
            onClick={() => navigate("/subjects")}
            aria-label="Tambah mata pelajaran"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button 
            className="rounded-full h-10 w-10 bg-secondary hover:bg-secondary/80 shadow-card transition-all duration-300 hover-scale"
            onClick={() => navigate("/tasks")}
            aria-label="Tambah tugas"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className={`text-center shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale ${!reducedMotion ? 'animate-fade-in' : ''}`}>
            <CardContent className="pt-6">
              <div className={`text-2xl sm:text-3xl font-bold text-primary ${!reducedMotion ? 'animate-scale-in' : ''}`} style={{ animationDelay: reducedMotion ? '0ms' : '0.2s' }}>
                {todaySubjects.length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Kelas Hari Ini</p>
            </CardContent>
          </Card>
          
          <Card className={`text-center shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale ${!reducedMotion ? 'animate-fade-in' : ''}`}>
            <CardContent className="pt-6">
              <div className={`text-2xl sm:text-3xl font-bold text-warning ${!reducedMotion ? 'animate-scale-in' : ''}`} style={{ animationDelay: reducedMotion ? '0ms' : '0.3s' }}>
                {upcomingTasks.length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Tugas Pending</p>
            </CardContent>
          </Card>
          
          <Card className={`text-center shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale ${!reducedMotion ? 'animate-fade-in' : ''}`}>
            <CardContent className="pt-6">
              <div className={`text-2xl sm:text-3xl font-bold text-success ${!reducedMotion ? 'animate-scale-in' : ''}`} style={{ animationDelay: reducedMotion ? '0ms' : '0.4s' }}>
                {todayTasksCount}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Due Hari Ini</p>
            </CardContent>
          </Card>
          
          <Card className={`text-center shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale ${!reducedMotion ? 'animate-fade-in' : ''}`}>
            <CardContent className="pt-6">
              <div className={`text-2xl sm:text-3xl font-bold text-muted-foreground ${!reducedMotion ? 'animate-scale-in' : ''}`} style={{ animationDelay: reducedMotion ? '0ms' : '0.5s' }}>
                {tomorrowSubjects.length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Kelas Besok</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Debug Info (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground text-center">
            Avg render time: {getAverageRenderTime().toFixed(2)}ms
          </div>
        )}
      </div>
    </div>
  );
}