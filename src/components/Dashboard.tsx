import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BookOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CalendarWidget } from "@/components/CalendarWidget";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

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

export function Dashboard() {
  const [todaySubjects, setTodaySubjects] = useState<Subject[]>([]);
  const [tomorrowSubjects, setTomorrowSubjects] = useState<Subject[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch today's subjects
      const { data: todayData, error: todayError } = await supabase
        .from("subjects")
        .select("*")
        .eq("day_of_week", today.getDay())
        .order("start_time");

      if (todayError) throw todayError;

      // Fetch tomorrow's subjects
      const { data: tomorrowData, error: tomorrowError } = await supabase
        .from("subjects")
        .select("*")
        .eq("day_of_week", tomorrow.getDay())
        .order("start_time");

      if (tomorrowError) throw tomorrowError;

      // Fetch upcoming tasks (next 7 days)
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          subjects (name, color)
        `)
        .gte("due_date", today.toISOString().split('T')[0])
        .lte("due_date", nextWeek.toISOString().split('T')[0])
        .eq("is_completed", false)
        .order("due_date")
        .order("priority", { ascending: false });

      if (tasksError) throw tasksError;

      setTodaySubjects(todayData || []);
      setTomorrowSubjects(tomorrowData || []);
      setUpcomingTasks(tasksData || []);
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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-scale-in">
            Belajar Pintar-Ku
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Kelola jadwal belajar dan tugas dengan mudah
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 shadow-elegant transition-all duration-300 hover-scale"
            onClick={() => navigate("/subjects")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Mata Pelajaran
          </Button>
          <Button 
            variant="outline" 
            className="w-full sm:w-auto border-primary/20 hover:bg-primary/5 transition-all duration-300 hover-scale"
            onClick={() => navigate("/tasks")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Tugas
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Widget - Responsive positioning */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-6">
              <CalendarWidget />
            </div>
          </div>

          {/* Schedule Cards */}
          <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Today's Schedule */}
            <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="hidden sm:inline">Jadwal Hari Ini</span>
                  <span className="sm:hidden">Hari Ini</span>
                  <Badge variant="secondary" className="ml-auto">
                    {dayNames[today.getDay()]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {todaySubjects.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Tidak ada jadwal hari ini
                    </p>
                  </div>
                ) : (
                  todaySubjects.map((subject, index) => (
                    <div
                      key={subject.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-all duration-200 animate-fade-in hover-scale"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full mt-2 flex-shrink-0 animate-scale-in"
                        style={{ 
                          backgroundColor: subject.color,
                          animationDelay: `${index * 0.1 + 0.2}s`
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{subject.name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {subject.start_time} - {subject.end_time}
                        </p>
                        {subject.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {subject.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Tomorrow's Schedule */}
            <Card className="shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="hidden sm:inline">Jadwal Besok</span>
                  <span className="sm:hidden">Besok</span>
                  <Badge variant="secondary" className="ml-auto">
                    {dayNames[tomorrow.getDay()]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {tomorrowSubjects.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Tidak ada jadwal besok
                    </p>
                  </div>
                ) : (
                  tomorrowSubjects.map((subject, index) => (
                    <div
                      key={subject.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-all duration-200 animate-fade-in hover-scale"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full mt-2 flex-shrink-0 animate-scale-in"
                        style={{ 
                          backgroundColor: subject.color,
                          animationDelay: `${index * 0.1 + 0.2}s`
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{subject.name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {subject.start_time} - {subject.end_time}
                        </p>
                        {subject.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {subject.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card className="md:col-span-2 xl:col-span-1 shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <span className="hidden sm:inline">Tugas Mendatang</span>
                  <span className="sm:hidden">Tugas</span>
                  {upcomingTasks.length > 0 && (
                    <Badge variant="priority-medium" className="ml-auto">
                      {upcomingTasks.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {upcomingTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-success/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      Semua tugas selesai!
                    </p>
                  </div>
                ) : (
                  upcomingTasks.slice(0, 4).map((task, index) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-all duration-200 group animate-fade-in hover-scale"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium truncate">{task.title}</h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markTaskComplete(task.id)}
                            className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 h-auto hover-scale"
                          >
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant={task.priority === 3 ? "priority-high" : task.priority === 2 ? "priority-medium" : "priority-low"}
                            className="text-xs animate-scale-in"
                            style={{ animationDelay: `${index * 0.1 + 0.3}s` }}
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
                          {isToday(parseISO(task.due_date)) && "📅 Hari ini"}
                          {isTomorrow(parseISO(task.due_date)) && "📅 Besok"}
                          {!isToday(parseISO(task.due_date)) && !isTomorrow(parseISO(task.due_date)) && 
                            `📅 ${format(parseISO(task.due_date), "d MMM yyyy")}`
                          }
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale animate-fade-in">
            <CardContent className="pt-6">
              <div className="text-2xl sm:text-3xl font-bold text-primary animate-scale-in" style={{ animationDelay: "0.2s" }}>
                {todaySubjects.length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Kelas Hari Ini</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale animate-fade-in">
            <CardContent className="pt-6">
              <div className="text-2xl sm:text-3xl font-bold text-warning animate-scale-in" style={{ animationDelay: "0.3s" }}>
                {upcomingTasks.length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Tugas Pending</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale animate-fade-in">
            <CardContent className="pt-6">
              <div className="text-2xl sm:text-3xl font-bold text-success animate-scale-in" style={{ animationDelay: "0.4s" }}>
                {upcomingTasks.filter(t => isToday(parseISO(t.due_date))).length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Due Hari Ini</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card border-0 hover:shadow-elegant transition-all duration-300 hover-scale animate-fade-in">
            <CardContent className="pt-6">
              <div className="text-2xl sm:text-3xl font-bold text-muted-foreground animate-scale-in" style={{ animationDelay: "0.5s" }}>
                {tomorrowSubjects.length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Kelas Besok</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}