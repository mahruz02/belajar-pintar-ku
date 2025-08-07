import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle2, Circle, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TaskForm } from "@/components/forms/TaskForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, isPast } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
    fetchSubjects();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          subjects (name, color)
        `)
        .order("due_date")
        .order("priority", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat tugas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, color");

      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      console.error("Error fetching subjects:", error);
    }
  };

  const toggleTaskComplete = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: !task.is_completed })
        .eq("id", task.id);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, is_completed: !t.is_completed } : t
      ));

      toast({
        title: "Berhasil!",
        description: task.is_completed 
          ? "Tugas ditandai belum selesai" 
          : "Tugas ditandai selesai",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memperbarui status tugas",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Berhasil!",
        description: "Tugas berhasil dihapus",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menghapus tugas",
        variant: "destructive",
      });
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === "all" || task.subject_id === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const pendingTasks = filteredTasks.filter(t => !t.is_completed);
  const completedTasks = filteredTasks.filter(t => t.is_completed);

  const handleFormSuccess = () => {
    fetchTasks();
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const getTaskDateStatus = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return { text: "Hari ini", color: "text-warning" };
    if (isTomorrow(date)) return { text: "Besok", color: "text-primary" };
    if (isPast(date)) return { text: "Terlambat", color: "text-destructive" };
    return { text: format(date, "d MMM yyyy"), color: "text-muted-foreground" };
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const dateStatus = getTaskDateStatus(task.due_date);
    
    return (
      <Card className="group hover:shadow-lg transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => toggleTaskComplete(task)}
              className="mt-1 transition-colors"
            >
              {task.is_completed ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </h3>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingTask(task);
                      setIsFormOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Tugas</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus tugas "{task.title}"? 
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteTask(task.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              {task.description && (
                <p className={`text-sm mt-1 ${task.is_completed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                  {task.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                  {priorityLabels[task.priority as keyof typeof priorityLabels]}
                </Badge>
                
                {task.subjects && (
                  <Badge variant="outline" style={{ borderColor: task.subjects.color }}>
                    {task.subjects.name}
                  </Badge>
                )}
                
                <span className={`text-xs ${dateStatus.color}`}>
                  {dateStatus.text}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tugas</h1>
          <p className="text-muted-foreground">Kelola dan lacak semua tugas Anda</p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-elegant">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tugas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Edit Tugas" : "Tambah Tugas"}
              </DialogTitle>
            </DialogHeader>
            <TaskForm
              task={editingTask}
              subjects={subjects}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingTask(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari tugas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter mata pelajaran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Mata Pelajaran</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Belum Selesai
            <Badge variant="secondary">{pendingTasks.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Selesai
            <Badge variant="secondary">{completedTasks.length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingTasks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Semua tugas selesai!</h3>
                    <p className="text-muted-foreground">
                      Anda belum memiliki tugas yang perlu dikerjakan
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Tugas Baru
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {completedTasks.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Circle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Belum ada tugas selesai</h3>
                    <p className="text-muted-foreground">
                      Tugas yang sudah selesai akan muncul di sini
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}