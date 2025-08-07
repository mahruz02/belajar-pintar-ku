import { useState, useEffect } from "react";
import { Search, Clock, CheckSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  title: string;
  type: "subject" | "task";
  subtitle?: string;
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }

    const searchData = async () => {
      try {
        // Search subjects
        const { data: subjects } = await supabase
          .from("subjects")
          .select("id, name, start_time, end_time")
          .ilike("name", `%${search}%`)
          .limit(5);

        // Search tasks
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, due_date")
          .ilike("title", `%${search}%`)
          .limit(5);

        const searchResults: SearchResult[] = [
          ...(subjects || []).map((s) => ({
            id: s.id,
            title: s.name,
            type: "subject" as const,
            subtitle: `${s.start_time} - ${s.end_time}`,
          })),
          ...(tasks || []).map((t) => ({
            id: t.id,
            title: t.title,
            type: "task" as const,
            subtitle: `Due: ${new Date(t.due_date).toLocaleDateString()}`,
          })),
        ];

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === "subject") {
      navigate("/subjects");
    } else {
      navigate("/tasks");
    }
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari mata pelajaran atau tugas..."
            className="pl-9 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setOpen(true)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandList>
            {results.length === 0 && search.length >= 2 && (
              <CommandEmpty>Tidak ada hasil ditemukan.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-2"
                  >
                    {result.type === "subject" ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <CheckSquare className="h-4 w-4" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-muted-foreground">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}