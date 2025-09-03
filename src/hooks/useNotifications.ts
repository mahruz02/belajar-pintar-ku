import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, addMinutes, differenceInMinutes } from 'date-fns';

interface NotificationItem {
  id: string;
  type: 'class' | 'task' | 'reminder';
  title: string;
  message: string;
  time: Date;
  priority: 'low' | 'medium' | 'high';
  data?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: NotificationItem) => {
    if (permission === 'granted' && 'Notification' in window) {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => browserNotification.close(), 5000);
    }
  }, [permission]);

  // Show in-app toast notification
  const showToastNotification = useCallback((notification: NotificationItem) => {
    const variant = notification.priority === 'high' ? 'destructive' : 
                   notification.priority === 'medium' ? 'default' : 'default';
    
    toast({
      title: notification.title,
      description: notification.message,
      variant,
    });
  }, [toast]);

  // Create notification
  const createNotification = useCallback((item: Omit<NotificationItem, 'id'>) => {
    const notification: NotificationItem = {
      ...item,
      id: `${item.type}-${Date.now()}-${Math.random()}`,
    };

    setNotifications(prev => [...prev, notification]);
    
    // Show both browser and toast notifications
    showBrowserNotification(notification);
    showToastNotification(notification);

    return notification.id;
  }, [showBrowserNotification, showToastNotification]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Check for upcoming classes and tasks
  const checkUpcomingItems = useCallback(async () => {
    try {
      const now = new Date();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check for classes starting in the next 15 minutes
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('day_of_week', today.getDay());

      subjects?.forEach((subject) => {
        const [hours, minutes] = subject.start_time.split(':').map(Number);
        const classTime = new Date();
        classTime.setHours(hours, minutes, 0, 0);

        const minutesUntilClass = differenceInMinutes(classTime, now);
        
        if (minutesUntilClass > 0 && minutesUntilClass <= 15) {
          createNotification({
            type: 'class',
            title: `Kelas ${subject.name} Segera Dimulai`,
            message: `Kelas dimulai dalam ${minutesUntilClass} menit di ${subject.location || 'lokasi tidak disebutkan'}`,
            time: classTime,
            priority: 'high',
            data: subject,
          });
        }
      });

      // Check for tasks due today
      const { data: todayTasks } = await supabase
        .from('tasks')
        .select('*, subjects(name)')
        .eq('due_date', today.toISOString().split('T')[0])
        .eq('is_completed', false);

      todayTasks?.forEach((task) => {
        createNotification({
          type: 'task',
          title: 'Tugas Jatuh Tempo Hari Ini',
          message: `${task.title} ${task.subjects?.name ? `(${task.subjects.name})` : ''} harus diselesaikan hari ini`,
          time: new Date(),
          priority: task.priority === 3 ? 'high' : task.priority === 2 ? 'medium' : 'low',
          data: task,
        });
      });

      // Check for tasks due tomorrow (morning reminder)
      if (now.getHours() === 8 && now.getMinutes() === 0) {
        const { data: tomorrowTasks } = await supabase
          .from('tasks')
          .select('*, subjects(name)')
          .eq('due_date', tomorrow.toISOString().split('T')[0])
          .eq('is_completed', false);

        if (tomorrowTasks && tomorrowTasks.length > 0) {
          createNotification({
            type: 'reminder',
            title: 'Pengingat Tugas Besok',
            message: `Kamu memiliki ${tomorrowTasks.length} tugas yang jatuh tempo besok`,
            time: new Date(),
            priority: 'medium',
            data: tomorrowTasks,
          });
        }
      }

    } catch (error) {
      console.error('Error checking upcoming items:', error);
    }
  }, [createNotification]);

  // Initialize notifications
  useEffect(() => {
    // Check current permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Request permission if not already granted
    if (permission === 'default') {
      requestPermission();
    }

    // Check for upcoming items immediately
    checkUpcomingItems();

    // Set up interval to check every minute
    const interval = setInterval(checkUpcomingItems, 60000);

    return () => clearInterval(interval);
  }, [permission, requestPermission, checkUpcomingItems]);

  return {
    notifications,
    permission,
    requestPermission,
    createNotification,
    removeNotification,
    clearAllNotifications,
    checkUpcomingItems,
  };
}