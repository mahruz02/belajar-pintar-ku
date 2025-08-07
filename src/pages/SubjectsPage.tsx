import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Clock, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubjectForm } from "@/components/forms/SubjectForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("day_of_week")
        .order("start_time");

      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat mata pelajaran",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSubjects(prev => prev.filter(s => s.id !== id));
      toast({
        title: "Berhasil!",
        description: "Mata pelajaran berhasil dihapus",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menghapus mata pelajaran",
        variant: "destructive",
      });
    }
  };

  const filteredSubjects = selectedDay === "all" 
    ? subjects
    : subjects.filter(s => s.day_of_week === parseInt(selectedDay));

  const groupedSubjects = filteredSubjects.reduce((acc, subject) => {
    const day = subject.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(subject);
    return acc;
  }, {} as Record<number, Subject[]>);

  const handleFormSuccess = () => {
    fetchSubjects();
    setIsFormOpen(false);
    setEditingSubject(null);
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
          <h1 className="text-3xl font-bold">Mata Pelajaran</h1>
          <p className="text-muted-foreground">Kelola jadwal mata pelajaran Anda</p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-elegant">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Mata Pelajaran
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
              </DialogTitle>
            </DialogHeader>
            <SubjectForm
              subject={editingSubject}
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingSubject(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter hari" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Hari</SelectItem>
              {dayNames.map((day, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary">
          {filteredSubjects.length} mata pelajaran
        </Badge>
      </div>

      {/* Subjects Grid */}
      {Object.keys(groupedSubjects).length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Belum ada mata pelajaran</h3>
                <p className="text-muted-foreground">
                  Tambahkan mata pelajaran pertama Anda untuk memulai
                </p>
              </div>
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Mata Pelajaran
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSubjects)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([day, daySubjects]) => (
              <div key={day}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  {dayNames[parseInt(day)]}
                  <Badge variant="secondary">{daySubjects.length}</Badge>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {daySubjects.map((subject) => (
                    <Card key={subject.id} className="group hover:shadow-lg transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: subject.color }}
                            />
                            <CardTitle className="text-lg">{subject.name}</CardTitle>
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingSubject(subject);
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
                                  <AlertDialogTitle>Hapus Mata Pelajaran</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Apakah Anda yakin ingin menghapus mata pelajaran "{subject.name}"? 
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSubject(subject.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Hapus
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{subject.start_time} - {subject.end_time}</span>
                        </div>
                        
                        {subject.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{subject.location}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}