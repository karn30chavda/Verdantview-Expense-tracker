'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Expense, Reminder, AppSettings } from '@/lib/types';
import { getExpenses, getReminders, getSettings } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Calendar, TrendingUp, Wallet } from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfYear, endOfDay, isWithinInterval } from 'date-fns';

const SummaryCard = ({
  title,
  icon: Icon,
  amount,
  loading,
}: {
  title: string;
  icon: React.ElementType;
  amount: number;
  loading: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-2/3" />
      ) : (
        <div className="text-2xl font-bold">
          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [fetchedExpenses, fetchedReminders, fetchedSettings] = await Promise.all([
          getExpenses(),
          getReminders(),
          getSettings(),
        ]);
        setExpenses(fetchedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setReminders(fetchedReminders);
        setSettings(fetchedSettings);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const summaries = useMemo(() => {
    const now = new Date();
    const todayExpenses = expenses.filter(e => isWithinInterval(new Date(e.date), { start: new Date(now.setHours(0,0,0,0)), end: endOfDay(now) }));
    const weekExpenses = expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfWeek(now), end: endOfDay(now) }));
    const monthExpenses = expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfMonth(now), end: endOfDay(now) }));
    const yearExpenses = expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfYear(now), end: endOfDay(now) }));

    return {
      today: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
      week: weekExpenses.reduce((sum, e) => sum + e.amount, 0),
      month: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
      year: yearExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [expenses]);
  
  const budgetProgress = useMemo(() => {
    if (!settings?.monthlyBudget || settings.monthlyBudget === 0) return 0;
    return Math.min((summaries.month / settings.monthlyBudget) * 100, 100);
  }, [summaries.month, settings]);

  const recentExpenses = expenses.slice(0, 5);
  const upcomingReminders = reminders
    .filter(r => new Date(r.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Today's Expenses" icon={DollarSign} amount={summaries.today} loading={loading} />
        <SummaryCard title="This Week's Expenses" icon={Wallet} amount={summaries.week} loading={loading} />
        <SummaryCard title="This Month's Expenses" icon={TrendingUp} amount={summaries.month} loading={loading} />
        <SummaryCard title="This Year's Expenses" icon={Calendar} amount={summaries.year} loading={loading} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Your last 5 transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : recentExpenses.length > 0 ? (
                  recentExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.title}</TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="outline">{expense.category}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell">{format(new Date(expense.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No expenses yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <div className="flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Budget</CardTitle>
              <CardDescription>
                {loading ? <Skeleton className="h-5 w-3/4" /> :
                  `You've spent $${summaries.month.toFixed(2)} of your $${(settings?.monthlyBudget || 0).toFixed(2)} budget.`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-4 w-full" /> : <Progress value={budgetProgress} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Reminders</CardTitle>
              <CardDescription>Your next 5 upcoming bills.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))
                ) : upcomingReminders.length > 0 ? (
                  upcomingReminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center justify-between">
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(reminder.date), 'MMM d')}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-center text-muted-foreground">No upcoming reminders.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
