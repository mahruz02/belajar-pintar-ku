import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const taskSchema = z.object({
  title: z.string().min(1, "Judul tugas wajib diisi"),
  description: z.string().optional(),
  subject_id: z.string().optional(),
  due_date: z.date({
    required_error: "Tanggal deadline wajib dipilih",
  }),
  priority: z.string().min(1, "Prioritas wajib dipilih"),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: number;
  is_completed: boolean;
  subject_id?: string;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface TaskFormProps {
  task?: Task | null;
  subjects: Subject[];
  onSuccess: () => void;
  onCancel: () => void;
}

const priorityOptions = [
  { value: "1", label: "Rendah", color: "text-blue-600" },
  { value: "2", label: "Sedang", color: "text-yellow-500" },
  { value: "3", label: "Tinggi", color: "text-red-600" },
];

export function TaskForm({ task, subjects, onSuccess, onCancel }: TaskFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      subject_id: task?.subject_id || "",
      due_date: task?.due_date ? new Date(task.due_date) : undefined,
      priority: task?.priority?.toString() || "1",
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    setLoading(true);
    try {
      // Format due_date sebagai yyyy-MM-dd tanpa timezone offset
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localDate = `${data.due_date.getFullYear()}-${pad(data.due_date.getMonth() + 1)}-${pad(data.due_date.getDate())}`;

      const taskData = {
        title: data.title,
        description: data.description || null,
        subject_id: data.subject_id === "none" ? null : data.subject_id || null,
        due_date: localDate,
        priority: parseInt(data.priority),
        user_id: (await supabase.auth.getUser()).data.user?.id,
      };

      let error;
      if (task) {
        const result = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", task.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("tasks")
          .insert([{
            ...taskData,
            is_completed: false,
          }]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Berhasil!",
        description: task
          ? "Tugas berhasil diperbarui"
          : "Tugas berhasil ditambahkan",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Judul Tugas</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: Kerjakan PR Matematika" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi (Opsional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tambahkan detail tugas..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mata Pelajaran (Opsional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mata pelajaran" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Tidak ada mata pelajaran</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        {subject.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tanggal Deadline</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "dd/MM/yyyy")
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Prioritas</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  {priorityOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label
                        htmlFor={option.value}
                        className={option.color + " font-bold px-3 py-1 rounded shadow-sm transition-all duration-200 text-base bg-white border border-gray-200 hover:scale-105"}
                        style={{
                          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={loading} 
            className="flex-1 bg-gradient-primary hover:opacity-90"
          >
            {loading ? "Menyimpan..." : task ? "Perbarui" : "Simpan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}