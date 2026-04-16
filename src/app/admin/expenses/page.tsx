'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, Search, Trash2, Calendar, User, DollarSign, Loader2, TrendingDown, Receipt } from 'lucide-react';
import { Expense } from '@/lib/types';
import { getExpenses, addExpense, deleteExpense } from '@/lib/db_extended';
import { useToastStore, useSettingsStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { CopyableId } from '@/components/ui/CopyableId';

export default function ExpensesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();
  const { user } = useAuth();

  const { data: expenses, isLoading, refetch } = useRealtimeTable<Expense>({
    table: 'expenses',
    initialData: [],
    fetcher: getExpenses,
    refetchOnChange: true,
    cacheKey: 'admin-expenses'
  });

  // Modal Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => 
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.loggedByName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [expenses, searchQuery]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !expenseDate) { 
      addToast('Fill all required fields', 'error'); 
      return; 
    }

    setIsSaving(true);
    try {
      await addExpense({
        description,
        amount: parseFloat(amount),
        expenseDate,
        loggedBy: user?.id || null,
      });
      addToast('Expense recorded', 'success');
      setIsModalOpen(false);
      setDescription('');
      setAmount('');
      refetch();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      addToast('Expense removed', 'info');
      refetch();
    } catch {
      addToast('Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 opacity-50" />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Operating Expenses
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Log and monitor maintenance and overhead costs</p>
          </div>
        )}
        <div className="flex items-center gap-4">
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shrink-0 h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
            <Plus className="h-4 w-4" /> Log Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-primary/5 border-primary/20 shadow-none overflow-hidden">
           <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Period Total
              </CardTitle>
           </CardHeader>
           <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <div className="text-xl font-bold text-primary">{currencySymbol}{totalExpenses.toFixed(2)}</div>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Based on visible filters</p>
           </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20 shadow-none overflow-hidden">
           <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-warning/70 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Avg. Per Entry
              </CardTitle>
           </CardHeader>
           <CardContent>
              {isLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <div className="text-xl font-bold text-warning">
                  {currencySymbol}{(filteredExpenses.length ? totalExpenses / filteredExpenses.length : 0).toFixed(2)}
                </div>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{(filteredExpenses?.length || 0)} entries</p>
           </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border/50">
        <CardHeader className="border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search description, staff..." 
                className="pl-10 h-11 rounded-xl bg-muted/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="max-h-[calc(100vh-210px)] overflow-x-auto">
              <table className="w-full text-sm font-medium">
                <thead className="sticky top-0 bg-muted text-[10px] uppercase font-bold text-muted-foreground/70 border-b border-border/50 z-20">
                  <tr>
                    <th className="p-5 text-left">Expense Item</th>
                    <th className="p-5 text-left">Date</th>
                    <th className="p-5 text-left">Logged By</th>
                    <th className="p-5 text-right font-bold">Amount</th>
                    <th className="p-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-muted-foreground font-semibold">No records found.</td></tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-primary/5 transition-all group">
                        <td className="p-5">
                          <p className="font-bold text-foreground line-clamp-1">{exp.description}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">ID:</span>
                            <CopyableId id={exp.id} truncateLength={6} className="scale-75 origin-left" />
                          </div>
                        </td>
                        <td className="p-5">
                           <div className="flex items-center gap-2">
                             <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                             <span className="font-semibold">{new Date(exp.expenseDate).toLocaleDateString()}</span>
                           </div>
                        </td>
                        <td className="p-5">
                           <div className="flex items-center gap-2">
                             <User className="h-3.5 w-3.5 text-muted-foreground/60" />
                             <span className="font-semibold text-muted-foreground">{exp.loggedByName || 'System'}</span>
                           </div>
                        </td>
                        <td className="p-5 text-right font-bold text-base text-destructive">
                          -{currencySymbol}{exp.amount.toFixed(2)}
                        </td>
                        <td className="p-5">
                          <div className="flex justify-center">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id)} className="h-9 w-9 p-0 text-destructive rounded-xl hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log New Expense Entry">
        <form onSubmit={handleAddExpense} className="space-y-5">
          <Input 
            label="What was the expense for?" 
            placeholder="e.g. Utility Bills, Equipment Repair..." 
            className="rounded-xl h-11"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
               <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
                 <DollarSign className="h-3.5 w-3.5 text-primary" /> Amount ({currencySymbol})
               </label>
               <Input 
                 type="number" 
                 step="0.01" 
                 min="0" 
                 className="rounded-xl h-11"
                 placeholder="250.00"
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 required
               />
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 ml-1">
                 <Calendar className="h-3.5 w-3.5 text-primary" /> Entry Date
               </label>
               <Input 
                 type="date" 
                 className="rounded-xl h-11"
                 value={expenseDate}
                 onChange={(e) => setExpenseDate(e.target.value)}
                 required
               />
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="font-bold rounded-xl">Discard</Button>
            <Button type="submit" disabled={isSaving} className="font-bold rounded-xl min-w-[160px] shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : 'Record Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
