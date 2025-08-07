import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
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

interface DayDetailModalProps {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
}

const priorityLabels = {
  1: "Rendah",
  2: "Sedang",
  3: "Tinggi"
};

const priorityColors = {
  1: "bg-secondary text-secondary-foreground",
  2: "bg-warning text-warning-foreground",
  3: "bg-destructive text-destructive-foreground"
};

export function DayDetailModal({ date, events, onClose }: DayDetailModalProps) {
  const { toast } = useToast();

  const subjects = events.filter(e => e.type === "subject").map(e => e.data as Subject);
  const tasks = events.filter(e => e.type === "task").map(e => e.data as Task);

  const toggleTaskComplete = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: !task.is_completed })
        .eq("id", task.id);

      if (error) throw error;

      // Update the task in the current events
      const updatedTask = { ...task, is_completed: !task.is_completed };
      
      toast({
        title: "Berhasil!",
        description: task.is_completed 
          ? "Tugas ditandai belum selesai" 
          : "Tugas ditandai selesai",
      });

      // Close and reopen to refresh data
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memperbarui status tugas",
        variant: "destructive",
      });
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl">
          {format(date, "EEEE, d MMMM yyyy")}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Subjects */}
        {subjects.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Mata Pelajaran ({subjects.length})
            </h3>
            <div className="space-y-3">
              {subjects
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((subject) => (
                  <Card key={subject.id} className="border-l-4" style={{ borderLeftColor: subject.color }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-lg">{subject.name}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{subject.start_time} - {subject.end_time}</span>
                            </div>
                            {subject.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{subject.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-warning" />
              Tugas ({tasks.length})
            </h3>
            <div className="space-y-3">
              {tasks
                .sort((a, b) => a.priority - b.priority || Number(a.is_completed) - Number(b.is_completed))
                .map((task) => (
                  <Card key={task.id} className="group">
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
                        
                        <div className="flex-1">
                          <h4 className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h4>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className={priorityColors[task.priority as keyof typeof priorityColors]}
                            >
                              {priorityLabels[task.priority as keyof typeof priorityLabels]}
                            </Badge>
                            
                            {task.subjects && (
                              <Badge variant="outline" style={{ borderColor: task.subjects.color }}>
                                {task.subjects.name}
                              </Badge>
                            )}
                            
                            {task.is_completed && (
                              <Badge variant="outline" className="text-success border-success">
                                Selesai
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {subjects.length === 0 && tasks.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Tidak ada jadwal</h3>
            <p className="text-muted-foreground">
              Tidak ada mata pelajaran atau tugas pada tanggal ini
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}