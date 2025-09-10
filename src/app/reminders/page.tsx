'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addReminder, getReminders, deleteReminder } from '@/lib/db';
import type { Reminder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Trash2, Bell, BellOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reminderSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
});

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof reminderSchema>>({
    resolver: zodResolver(reminderSchema),
    defaultValues: { title: '' },
  });

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    const fetchedReminders = await getReminders();
    setReminders(fetchedReminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    fetchReminders();
  }, [fetchReminders]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({ title: 'This browser does not support desktop notification', variant: 'destructive' });
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast({ title: 'Notifications enabled!' });
      new Notification('VerdantView notifications are active.');
    } else {
      toast({ title: 'Notifications were not enabled.', variant: 'destructive' });
    }
  };

  const handleAddReminder = async (values: z.infer<typeof reminderSchema>) => {
    try {
      await addReminder({
        title: values.title,
        date: values.date.toISOString(),
      });
      toast({ title: 'Reminder added successfully!' });
      form.reset();
      fetchReminders();
    } catch (error) {
      toast({ title: 'Failed to add reminder.', variant: 'destructive' });
    }
  };

  const handleDeleteReminder = async (id: number) => {
    try {
      await deleteReminder(id);
      toast({ title: 'Reminder deleted.' });
      fetchReminders();
    } catch (error) {
      toast({ title: 'Failed to delete reminder.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">Set and manage your upcoming bill reminders.</p>
        </div>
        {notificationPermission !== 'granted' && (
          <Button onClick={requestNotificationPermission} variant="outline" className="mt-4 md:mt-0">
             <Bell className="mr-2 h-4 w-4" /> Enable Notifications
          </Button>
        )}
         {notificationPermission === 'granted' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 md:mt-0">
             <BellOff className="h-4 w-4" /> Notifications are enabled
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Add New Reminder</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddReminder)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl><Input placeholder="e.g., Electricity Bill" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={'outline'} className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Reminder
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Reminders</CardTitle>
              <CardDescription>A list of your scheduled reminders.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-12 w-full animate-pulse bg-muted rounded-md" />
                  <div className="h-12 w-full animate-pulse bg-muted rounded-md" />
                  <div className="h-12 w-full animate-pulse bg-muted rounded-md" />
                </div>
              ) : reminders.length > 0 ? (
                <ul className="space-y-2">
                  {reminders.map((reminder) => (
                    <li key={reminder.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                      <div>
                        <p className="font-medium">{reminder.title}</p>
                        <p className="text-sm text-muted-foreground">Due: {format(new Date(reminder.date), 'PPP')}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => reminder.id && handleDeleteReminder(reminder.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground">No reminders set yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
