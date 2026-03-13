import { useEffect } from 'react';
import { toast } from 'sonner';

export const useNotifications = () => {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'gtd-reminder',
      });
    }
    
    toast.info(body, {
      description: title,
      duration: 5000,
    });
  };

  return { showNotification };
};

export const ReminderNotification: React.FC = () => {
  const { showNotification } = useNotifications();

  useEffect(() => {
    const checkReminders = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/data/gtd/reminders/pending');
        if (response.ok) {
          const data = await response.json();
          if (data.reminders && data.reminders.length > 0) {
            data.reminders.forEach((reminder: { title: string; due_date?: string }) => {
              showNotification(
                '任务提醒',
                `${reminder.title} - 到期日期: ${reminder.due_date || '未设置'}`
              );
            });
          }
        }
      } catch (error) {
        console.error('获取提醒失败:', error);
      }
    };

    const interval = setInterval(checkReminders, 60000);
    checkReminders();

    return () => clearInterval(interval);
  }, [showNotification]);

  return null;
};
