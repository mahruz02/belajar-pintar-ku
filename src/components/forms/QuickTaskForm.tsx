import { useState, useEffect } from "react";
import { TaskForm } from "./TaskForm";
import { supabase } from "@/integrations/supabase/client";

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface QuickTaskFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuickTaskForm({ onSuccess, onCancel }: QuickTaskFormProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, color")
        .order("name");

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TaskForm
      subjects={subjects}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}