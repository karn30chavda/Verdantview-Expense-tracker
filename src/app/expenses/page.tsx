'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { columns } from '@/app/expenses/columns';
import { DataTable } from '@/app/expenses/data-table';
import { getExpenses, deleteExpense } from '@/lib/db';
import type { Expense } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExpensesPage() {
  const [data, setData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const expenses = await getExpenses();
    setData(expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    await deleteExpense(id);
    fetchData(); // Refresh data
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">
            View and manage all your expenses.
          </p>
        </div>
        <Button asChild>
          <Link href="/expenses/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Link>
        </Button>
      </div>
      {loading ? (
        <div className="space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-96 w-full rounded-md" />
             <div className="flex justify-between">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-64" />
            </div>
        </div>
      ) : (
        <DataTable columns={columns({ handleDelete, refreshData: fetchData })} data={data} />
      )}
    </div>
  );
}
