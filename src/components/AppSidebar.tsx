import { Home, BookOpen, CheckSquare, Calendar, Search } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Mata Pelajaran", url: "/subjects", icon: BookOpen },
  { title: "Tugas", url: "/tasks", icon: CheckSquare },
  { title: "Kalender", url: "/calendar", icon: Calendar },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar className={`${state === "collapsed" ? "w-14" : "w-64"} bg-sidebar`} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {state !== "collapsed" && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-sidebar-foreground">
                Belajar Pintar
              </h2>
              <p className="text-xs text-sidebar-foreground/70">Student Portal</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground font-medium">Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}