import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BookOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { id } from "date-fns/locale";

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

const priorityColors = {
  1: "bg-secondary text-secondary-foreground",
  2: "bg-warning text-warning-foreground",
  3: "bg-destructive text-destructive-foreground"
};

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
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Belajar Pintar-Ku
          </h1>
          <p className="text-muted-foreground text-lg">
            Kelola jadwal belajar dan tugas dengan mudah
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button className="bg-gradient-primary hover:opacity-90 shadow-elegant">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Mata Pelajaran
          </Button>
          <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Tugas
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Jadwal Hari Ini
                <Badge variant="secondary">{dayNames[today.getDay()]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Tidak ada jadwal hari ini
                </p>
              ) : (
                todaySubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {subject.start_time} - {subject.end_time}
                      </p>
                      {subject.location && (
                        <p className="text-xs text-muted-foreground">
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
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                Jadwal Besok
                <Badge variant="secondary">{dayNames[tomorrow.getDay()]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tomorrowSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Tidak ada jadwal besok
                </p>
              ) : (
                tomorrowSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {subject.start_time} - {subject.end_time}
                      </p>
                      {subject.location && (
                        <p className="text-xs text-muted-foreground">
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
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-warning" />
                Tugas Mendatang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Tidak ada tugas mendatang
                </p>
              ) : (
                upcomingTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium truncate">{task.title}</h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markTaskComplete(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                        >
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors]}`}
                        >
                          {priorityLabels[task.priority as keyof typeof priorityLabels]}
                        </Badge>
                        {task.subjects && (
                          <span className="text-xs text-muted-foreground">
                            {task.subjects.name}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {isToday(parseISO(task.due_date)) && "Hari ini"}
                        {isTomorrow(parseISO(task.due_date)) && "Besok"}
                        {!isToday(parseISO(task.due_date)) && !isTomorrow(parseISO(task.due_date)) && 
                          format(parseISO(task.due_date), "d MMM yyyy")
                        }
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center shadow-card border-0">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{todaySubjects.length}</div>
              <p className="text-sm text-muted-foreground">Kelas Hari Ini</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card border-0">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{upcomingTasks.length}</div>
              <p className="text-sm text-muted-foreground">Tugas Pending</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card border-0">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">
                {upcomingTasks.filter(t => isToday(parseISO(t.due_date))).length}
              </div>
              <p className="text-sm text-muted-foreground">Due Hari Ini</p>
            </CardContent>
          </Card>
          
          <Card className="text-center shadow-card border-0">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{tomorrowSubjects.length}</div>
              <p className="text-sm text-muted-foreground">Kelas Besok</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}