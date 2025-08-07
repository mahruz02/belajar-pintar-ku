import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ColorPicker } from "@/components/ColorPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const subjectSchema = z.object({
  name: z.string().min(1, "Nama mata pelajaran wajib diisi"),
  day_of_week: z.string().min(1, "Hari wajib dipilih"),
  start_time: z.string().min(1, "Jam mulai wajib diisi"),
  end_time: z.string().min(1, "Jam selesai wajib diisi"),
  location: z.string().optional(),
  color: z.string().min(1, "Warna wajib dipilih"),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

interface Subject {
  id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  color: string;
}

interface SubjectFormProps {
  subject?: Subject | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const defaultColors = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
];

export function SubjectForm({ subject, onSuccess, onCancel }: SubjectFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: subject?.name || "",
      day_of_week: subject?.day_of_week?.toString() || "",
      start_time: subject?.start_time || "",
      end_time: subject?.end_time || "",
      location: subject?.location || "",
      color: subject?.color || defaultColors[0],
    },
  });

  const onSubmit = async (data: SubjectFormData) => {
    setLoading(true);
    try {
      const subjectData = {
        name: data.name,
        day_of_week: parseInt(data.day_of_week),
        start_time: data.start_time,
        end_time: data.end_time,
        location: data.location || null,
        color: data.color,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      };

      let error;
      if (subject) {
        const result = await supabase
          .from("subjects")
          .update(subjectData)
          .eq("id", subject.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("subjects")
          .insert([subjectData]);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Berhasil!",
        description: subject
          ? "Mata pelajaran berhasil diperbarui"
          : "Mata pelajaran berhasil ditambahkan",
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

  // Validate time range
  const validateTimeRange = () => {
    const startTime = form.getValues("start_time");
    const endTime = form.getValues("end_time");
    
    if (startTime && endTime) {
      return startTime < endTime;
    }
    return true;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Mata Pelajaran</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: Matematika" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="day_of_week"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hari</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih hari" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {dayNames.map((day, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jam Mulai</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jam Selesai</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // Trigger validation after a short delay
                      setTimeout(() => {
                        if (!validateTimeRange()) {
                          form.setError("end_time", {
                            message: "Jam selesai harus setelah jam mulai"
                          });
                        } else {
                          form.clearErrors("end_time");
                        }
                      }, 100);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lokasi (Opsional)</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: Ruang 301" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warna</FormLabel>
              <FormControl>
                <ColorPicker
                  value={field.value}
                  onChange={field.onChange}
                  colors={defaultColors}
                />
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
            disabled={loading || !validateTimeRange()} 
            className="flex-1 bg-gradient-primary hover:opacity-90"
          >
            {loading ? "Menyimpan..." : subject ? "Perbarui" : "Simpan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}