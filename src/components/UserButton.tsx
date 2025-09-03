import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function UserButton() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full hover-scale transition-all duration-200">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 shadow-elegant border-0" align="end" forceMount>
        <div className="flex items-center justify-start gap-3 p-3 border-b">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-sm">{user?.user_metadata?.full_name || "User"}</p>
            <p className="w-[180px] truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="p-1">
          <DropdownMenuItem className="cursor-pointer rounded-md transition-colors">
            <User className="mr-3 h-4 w-4" />
            Profil Saya
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-md transition-colors">
            <Settings className="mr-3 h-4 w-4" />
            Pengaturan
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem 
            className="cursor-pointer rounded-md transition-colors text-destructive focus:text-destructive" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Keluar
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}