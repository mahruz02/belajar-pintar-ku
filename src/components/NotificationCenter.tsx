import { useState } from 'react';
import { Bell, X, Clock, BookOpen, CheckCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '@/hooks/useNotifications';
import { format } from 'date-fns';

export function NotificationCenter() {
  const {
    notifications,
    permission,
    requestPermission,
    removeNotification,
    clearAllNotifications,
  } = useNotifications();
  
  const [showSettings, setShowSettings] = useState(false);
  const [enableBrowserNotifications, setEnableBrowserNotifications] = useState(
    permission === 'granted'
  );

  const handleToggleBrowserNotifications = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const granted = await requestPermission();
      setEnableBrowserNotifications(granted);
    } else {
      setEnableBrowserNotifications(enabled);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'class':
        return <BookOpen className="h-4 w-4 text-primary" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-warning" />;
      case 'reminder':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'secondary';
    }
  };

  const unreadCount = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hover-scale transition-all duration-200"
          aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-scale-in"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-elegant">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifikasi
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-8 w-8 p-0"
                  aria-label="Pengaturan notifikasi"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className="h-8 w-8 p-0"
                    aria-label="Hapus semua notifikasi"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {showSettings && (
            <div className="p-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Notifikasi Browser</p>
                  <p className="text-xs text-muted-foreground">
                    Terima notifikasi meskipun tab tidak aktif
                  </p>
                </div>
                <Switch
                  checked={enableBrowserNotifications}
                  onCheckedChange={handleToggleBrowserNotifications}
                  aria-label="Toggle browser notifications"
                />
              </div>
              {permission === 'denied' && (
                <p className="text-xs text-destructive mt-2">
                  Notifikasi browser diblokir. Aktifkan melalui pengaturan browser.
                </p>
              )}
            </div>
          )}

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Tidak ada notifikasi
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kamu akan mendapat pemberitahuan tentang kelas dan tugas di sini
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification, index) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-muted/20 transition-colors animate-fade-in group"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium leading-tight">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge
                                  variant={getPriorityColor(notification.priority)}
                                  className="text-xs"
                                >
                                  {notification.priority === 'high' ? 'Tinggi' :
                                   notification.priority === 'medium' ? 'Sedang' : 'Rendah'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(notification.time, 'HH:mm')}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNotification(notification.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 flex-shrink-0"
                              aria-label="Hapus notifikasi"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}