import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/subjects":
        return "Mata Pelajaran";
      case "/tasks":
        return "Tugas";
      case "/calendar":
        return "Kalender";
      default:
        return "Belajar Pintar";
    }
  };

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="lg:hidden" />
          <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <SearchBar />
          <div className="hidden lg:flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}