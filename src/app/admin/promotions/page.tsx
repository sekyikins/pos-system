'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Promotion } from '@/lib/types';
import { getPromotions, addPromotion, updatePromotion, deletePromotion } from '@/lib/db';
import { useToastStore, useSettingsStore } from '@/lib/store';
import { Plus, Search, Edit, Trash2, Ticket, Loader2, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { CopyableId } from '@/components/ui/CopyableId';

// ─── Status Helper ────────────────────────────────────────────────────────────
type PromoStatus = 'active' | 'past' | 'upcoming' | 'manual-active' | 'manual-inactive';

function getPromoStatus(p: Promotion): PromoStatus {
  const now = new Date();
  if (p.startDate && p.endDate) {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    if (now < start) return 'upcoming';
    if (now > end) return 'past';
    return 'active';
  }
  return p.isActive ? 'manual-active' : 'manual-inactive';
}

const STATUS_CONFIG: Record<PromoStatus, {
  label: string;
  color: string;
  icon: React.ElementType;
  dateKey: 'endDate' | 'startDate' | null;
  dateLabel: string;
}> = {
  'active':          { label: 'Active',   color: 'bg-success/10 text-success',                        icon: CheckCircle, dateKey: 'endDate',   dateLabel: 'till'  },
  'past':            { label: 'Past',     color: 'bg-muted text-muted-foreground',                    icon: Clock,       dateKey: 'endDate',   dateLabel: 'since' },
  'upcoming':        { label: 'Upcoming', color: 'bg-primary/10 text-primary',                        icon: Calendar,    dateKey: 'startDate', dateLabel: 'from'  },
  'manual-active':   { label: 'Active',   color: 'bg-success/10 text-success hover:bg-success/20',    icon: CheckCircle, dateKey: null,         dateLabel: ''      },
  'manual-inactive': { label: 'Inactive', color: 'bg-destructive/10 text-destructive hover:bg-destructive/20', icon: XCircle, dateKey: null,   dateLabel: ''      },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const { addToast } = useToastStore();
  const { currencySymbol } = useSettingsStore();

  const { data: promotions, isLoading, refetch } = useRealtimeTable<Promotion>({
    table: 'promotions',
    initialData: [],
    fetcher: getPromotions,
    refetchOnChange: true,
    cacheKey: 'admin-promotions'
  });

  const [form, setForm] = useState({
    name: '',
    code: '',
    discountType: 'PERCENT' as 'FLAT' | 'PERCENT',
    discountValue: 0,
    minSubtotal: 0,
    isActive: true,
    useSchedule: false,
    startDate: '',
    endDate: '',
  });

  const filtered = promotions.filter((p: Promotion) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return;
    setIsSaving(true);
    try {
      await addPromotion({
        name: form.name,
        code: form.code,
        discountType: form.discountType,
        discountValue: form.discountValue,
        minSubtotal: form.minSubtotal,
        isActive: form.useSchedule ? true : form.isActive,
        startDate: form.useSchedule && form.startDate ? form.startDate : undefined,
        endDate: form.useSchedule && form.endDate ? form.endDate : undefined,
        usageCount: 0,
      });
      addToast('Promotion created successfully', 'success');
      refetch();
      setIsAddOpen(false);
      resetForm();
    } catch { addToast('Failed to create promotion', 'error'); }
    finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setForm({ name: '', code: '', discountType: 'PERCENT', discountValue: 0, minSubtotal: 0, isActive: true, useSchedule: false, startDate: '', endDate: '' });
  };

  const handleEditOpen = (p: Promotion) => {
    setEditingPromotion(p);
    const hasSchedule = !!(p.startDate || p.endDate);
    setForm({
      name: p.name,
      code: p.code,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minSubtotal: p.minSubtotal || 0,
      isActive: p.isActive,
      useSchedule: hasSchedule,
      startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 16) : '',
      endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 16) : '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromotion) return;
    setIsSaving(true);
    try {
      await updatePromotion(editingPromotion.id, {
        name: form.name,
        code: form.code,
        discountType: form.discountType,
        discountValue: form.discountValue,
        minSubtotal: form.minSubtotal,
        isActive: form.useSchedule ? true : form.isActive,
        startDate: form.useSchedule && form.startDate ? form.startDate : undefined,
        endDate: form.useSchedule && form.endDate ? form.endDate : undefined,
      });
      addToast('Promotion updated', 'success');
      refetch();
      setIsEditOpen(false);
    } catch { addToast('Failed to update promotion', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (p: Promotion) => {
    if (!window.confirm(`Delete promotion "${p.name}"?`)) return;
    try {
      await deletePromotion(p.id);
      addToast('Promotion deleted', 'info');
      refetch();
    } catch { addToast('Failed to delete promotion', 'error'); }
  };

  const toggleStatus = async (p: Promotion) => {
    if (p.startDate || p.endDate) return; // schedule-controlled, no manual toggle
    try {
      await updatePromotion(p.id, { isActive: !p.isActive });
      addToast(`Promotion ${!p.isActive ? 'activated' : 'deactivated'}`, 'success');
      refetch();
    } catch { addToast('Failed to toggle status', 'error'); }
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
            <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
              Promotions &amp; Offers
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Manage discounts and seasonal campaigns</p>
          </div>
        )}
        <div className="flex items-center gap-4">
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="gap-2 shrink-0 font-bold rounded-xl shadow-lg shadow-primary/20" disabled={isLoading}>
            <Plus className="h-4 w-4" /> Add Promotion
          </Button>
        </div>
      </div>

      <Card className="border-2 border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Search promotions..."
                className="pl-10 h-11 rounded-xl border-border bg-muted/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {isLoading ? (
            <div className="space-y-0.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-6 px-6 py-5 border-b border-border last:border-0 bg-muted/5">
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-28 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-[calc(100vh-210px)] overflow-x-auto">
              <table className="w-full text-sm text-left align-middle font-medium">
                <thead className="sticky top-0 bg-muted text-[10px] uppercase font-bold text-muted-foreground/70 border-b border-border/50 z-20">
                  <tr>
                    <th className="px-6 py-4">Campaign Name</th>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Value</th>
                    <th className="px-6 py-4 text-center">Usage</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium italic">No promotions found.</td></tr>
                  ) : filtered.map(p => {
                    const status = getPromoStatus(p);
                    const cfg = STATUS_CONFIG[status];
                    const Icon = cfg.icon;
                    const isScheduled = !!(p.startDate || p.endDate);
                    const dateVal = cfg.dateKey ? p[cfg.dateKey] : null;
                    const isEffectivelyActive = status === 'active' || status === 'manual-active';

                    return (
                      <tr key={p.id} className="hover:bg-primary/5 transition-all group">
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border transition-transform group-hover:scale-110 ${isEffectivelyActive ? 'bg-primary/10 text-primary border-primary/10' : 'bg-muted text-muted-foreground border-border'}`}>
                              <Ticket className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-base tracking-tight">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" /> Added {new Date(p.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <CopyableId id={p.code} truncate={false} className="bg-primary/5 text-primary scale-90 origin-left" />
                        </td>
                        <td className="p-5 font-bold">
                          {p.discountType === 'PERCENT' ? `${p.discountValue}%` : `${currencySymbol}${p.discountValue}`}
                          {(p.minSubtotal || 0) > 0 && <p className="text-[10px] text-muted-foreground font-normal">Min. {currencySymbol}{p.minSubtotal}</p>}
                        </td>
                        <td className="p-5 font-bold text-muted-foreground text-center">
                          {p.usageCount || 0}
                        </td>
                        <td className="p-5">
                          <button
                            onClick={() => toggleStatus(p)}
                            disabled={isScheduled}
                            title={isScheduled ? 'Status auto-controlled by schedule' : 'Click to toggle'}
                            className={`flex flex-col items-start px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${cfg.color} ${isScheduled ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <span className="flex items-center gap-1">
                              <Icon className="h-3 w-3" />
                              {cfg.label.toUpperCase()}
                            </span>
                          </button>

                          {isScheduled && dateVal && (
                            <span className="text-[12px] opacity-90 font-semibold">
                              {cfg.dateLabel} {new Date(dateVal).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                        <td className="p-5 pr-0">
                          <div className="flex justify-end gap-2 pr-4">
                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-muted/50 text-info hover:bg-info/20" onClick={() => handleEditOpen(p)}>
                              <Edit className="h-4.5 w-4.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-destructive rounded-xl bg-muted/50 hover:bg-destructive/10" onClick={() => handleDelete(p)}>
                              <Trash2 className="h-4.5 w-4.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={isAddOpen || isEditOpen}
        onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }}
        title={isAddOpen ? 'Create Promotion' : 'Update Promotion'}
      >
        <form onSubmit={isAddOpen ? handleAdd : handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Promotion Name" placeholder="e.g. Summer Sale" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Unique Code" placeholder="e.g. SUMMER23" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Discount Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as 'FLAT' | 'PERCENT' })}
                className="w-full h-11 px-4 text-sm rounded-xl border-2 border-border bg-card font-bold focus:outline-none focus:border-primary transition-all shadow-sm"
              >
                <option value="PERCENT">Percentage (%)</option>
                <option value="FLAT">Flat Amount ({currencySymbol})</option>
              </select>
            </div>
            <Input
              label={`Discount Value (${form.discountType === 'PERCENT' ? '%' : currencySymbol})`}
              type="number"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
              required
            />
          </div>

          <Input
            label={`Minimum Spend (${currencySymbol})`}
            type="number"
            value={form.minSubtotal}
            onChange={(e) => setForm({ ...form, minSubtotal: Number(e.target.value) })}
          />

          {/* Activation Mode — card-style radio selectors */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">Activation Mode</p>
            <div className="grid grid-cols-2 gap-3">

              {/* Card: Scheduled */}
              <label className={`relative flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.useSchedule
                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
              }`}>
                <input type="radio" name="activationMode" value="schedule" checked={form.useSchedule}
                  onChange={() => setForm({ ...form, useSchedule: true })} className="sr-only" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4 w-4 ${form.useSchedule ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-bold leading-tight ${form.useSchedule ? 'text-primary' : 'text-foreground'}`}>Scheduled</span>
                  </div>
                  <span className={`h-2 w-2 rounded-full transition-all ${form.useSchedule ? 'bg-primary scale-110' : 'bg-border'}`} />
                </div>
                <span className="text-[10px] text-muted-foreground leading-snug">Auto status via dates</span>
              </label>

              {/* Card: Manual */}
              <label className={`relative flex flex-col gap-1.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                !form.useSchedule
                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
              }`}>
                <input type="radio" name="activationMode" value="manual" checked={!form.useSchedule}
                  onChange={() => setForm({ ...form, useSchedule: false })} className="sr-only" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`h-4 w-4 ${!form.useSchedule ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-bold leading-tight ${!form.useSchedule ? 'text-primary' : 'text-foreground'}`}>Manual</span>
                  </div>
                  <span className={`h-2 w-2 rounded-full transition-all ${!form.useSchedule ? 'bg-primary scale-110' : 'bg-border'}`} />
                </div>
                <span className="text-[10px] text-muted-foreground leading-snug">You control the status</span>
              </label>
            </div>

            {/* Sub-panel: Scheduled → date pickers */}
            {form.useSchedule && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/10 rounded-xl border border-border/60">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full h-10 rounded-xl border-2 border-border bg-card px-3 text-sm font-bold focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full h-10 rounded-xl border-2 border-border bg-card px-3 text-sm font-bold focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            {/* Sub-panel: Manual → Active / Inactive */}
            {!form.useSchedule && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/10 rounded-xl border border-border/60">
                <label className={`flex items-start gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.isActive ? 'border-success bg-success/5' : 'border-border bg-card hover:border-success/40'
                }`}>
                  <input type="radio" name="isActive" value="active" checked={form.isActive}
                    onChange={() => setForm({ ...form, isActive: true })} className="sr-only" />
                  <span className={`h-3 w-3 rounded-full border-2 shrink-0 transition-all m-1j ${
                    form.isActive ? 'bg-success border-success' : 'border-muted-foreground'
                  }`} />
                  <div>
                    <p className={`text-sm font-bold ${form.isActive ? 'text-success' : 'text-foreground'}`}>Active</p>
                    <p className="text-[10px] text-muted-foreground">Live immediately</p>
                  </div>
                </label>

                <label className={`flex items-start gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  !form.isActive ? 'border-destructive bg-destructive/5' : 'border-border bg-card hover:border-destructive/40'
                }`}>
                  <input type="radio" name="isActive" value="inactive" checked={!form.isActive}
                    onChange={() => setForm({ ...form, isActive: false })} className="sr-only" />
                  <span className={`h-3 w-3 rounded-full border-2 shrink-0 transition-all m-1 ${
                    !form.isActive ? 'bg-destructive border-destructive' : 'border-muted-foreground'
                  }`} />
                  <div>
                    <p className={`text-sm font-bold ${!form.isActive ? 'text-destructive' : 'text-foreground'}`}>Inactive</p>
                    <p className="text-[10px] text-muted-foreground">Save as draft</p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} disabled={isSaving} className="rounded-xl font-bold h-11 px-6">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[180px] h-11 shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : (isAddOpen ? 'Launch Campaign' : 'Confirm Updates')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
