'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { getSettings, updateSettings, getCategories, addCategory, deleteCategory, exportData, clearAllData } from '@/lib/db';
import type { AppSettings, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from 'next/link';

const budgetSchema = z.object({
  monthlyBudget: z.coerce.number().min(0, { message: "Budget must be a positive number." }),
});

const categorySchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }),
});

const defaultCategories = ['Groceries', 'Dining', 'Travel', 'Utilities', 'Shopping', 'Other'];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  const budgetForm = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      monthlyBudget: 0,
    },
  });

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
    },
  });

  const fetchData = async () => {
    const [fetchedSettings, fetchedCategories] = await Promise.all([getSettings(), getCategories()]);
    setSettings(fetchedSettings);
    setCategories(fetchedCategories);
    if (fetchedSettings) {
      budgetForm.reset({ monthlyBudget: fetchedSettings.monthlyBudget });
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateBudget = async (values: z.infer<typeof budgetSchema>) => {
    try {
      await updateSettings(values);
      toast({ title: 'Budget updated successfully!' });
      fetchData();
    } catch (error) {
      toast({ title: 'Failed to update budget.', variant: 'destructive' });
    }
  };

  const handleAddCategory = async (values: z.infer<typeof categorySchema>) => {
    try {
      await addCategory({ name: values.name });
      toast({ title: 'Category added successfully!' });
      categoryForm.reset({ name: '' });
      fetchData();
    } catch (error) {
        toast({ title: 'Category already exists or failed to add.', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (defaultCategories.includes(name)) {
      toast({ title: 'Cannot delete default category.', variant: 'destructive'});
      return;
    }
    try {
      await deleteCategory(id);
      toast({ title: 'Category deleted.' });
      fetchData();
    } catch (error) {
      toast({ title: 'Failed to delete category.', variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `verdantview-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      toast({ title: 'Data exported successfully!' });
    } catch (error) {
      toast({ title: 'Failed to export data.', variant: 'destructive' });
    }
  };

  const handleExportPdf = () => {
    toast({ title: 'Feature Coming Soon!', description: 'PDF export functionality will be available in a future update.' });
  };
  
  const handleClearData = async () => {
    try {
      await clearAllData();
      toast({ title: 'All data has been cleared.' });
       // The useExpenses hook will automatically refetch data
    } catch (error) {
      toast({ title: 'Failed to clear data.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application settings and data.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="grid gap-8">
            <Card>
            <CardHeader><CardTitle>Monthly Budget</CardTitle></CardHeader>
            <Form {...budgetForm}>
                <form onSubmit={budgetForm.handleSubmit(handleUpdateBudget)}>
                <CardContent>
                    <FormField
                    control={budgetForm.control}
                    name="monthlyBudget"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Your monthly budget amount</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="1000" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={budgetForm.formState.isSubmitting}>
                    {budgetForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Budget
                    </Button>
                </CardFooter>
                </form>
            </Form>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Export, import, or clear your application data.</CardDescription>
            </CardHeader>
             <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button onClick={handleExport} variant="outline">Export (JSON)</Button>
                <Button onClick={handleExportPdf} variant="outline">Export (PDF)</Button>
                
                <Button asChild variant="outline" className="sm:col-span-2">
                    <Link href="/scan">AI Import (Scan Receipt)</Link>
                </Button>
                
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="sm:col-span-2">Clear All Data</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all your expenses, categories, and reminders.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearData} className="bg-destructive hover:bg-destructive/90">Yes, delete everything</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
            </Card>
        </div>
        
        <Card>
          <CardHeader><CardTitle>Expense Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <Badge key={cat.id} variant={defaultCategories.includes(cat.name) ? 'default': 'secondary'} className="group text-base pr-1">
                  {cat.name}
                  {!defaultCategories.includes(cat.name) && cat.id && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button className="ml-1 rounded-full opacity-50 group-hover:opacity-100 transition-opacity">
                                <X className="h-3 w-3" />
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete &quot;{cat.name}&quot;?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Are you sure you want to delete this category? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => cat.id && handleDeleteCategory(cat.id, cat.name)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  )}
                </Badge>
              ))}
            </div>
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(handleAddCategory)} className="flex items-start gap-2">
                <FormField
                  control={categoryForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl><Input placeholder="New category name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="outline" disabled={categoryForm.formState.isSubmitting}>
                  {categoryForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
