import { SubjectForm } from "./SubjectForm";

interface QuickSubjectFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuickSubjectForm({ onSuccess, onCancel }: QuickSubjectFormProps) {
  return (
    <SubjectForm
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}