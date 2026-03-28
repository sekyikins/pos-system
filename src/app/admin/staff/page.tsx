'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StaffRecord as UserRecord } from '@/lib/types';
import { getUsers, addUser, updateUser, deleteUser } from '@/lib/db';
import { useToastStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Plus, Search, Edit, Trash2, Loader2, ShieldCheck, ShieldAlert, ArrowUpDown, Calendar, UserCheck } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

const ROLE_BADGE = {
  ADMIN: { label: 'Admin', class: 'bg-destructive/10 text-destructive' },
  MANAGER: { label: 'Manager', class: 'bg-primary/10 text-primary' },
  CASHIER: { label: 'Cashier', class: 'bg-info/10 text-info' },
  CUSTOMER: { label: 'Customer', class: 'bg-muted text-muted-foreground' },
};

type SortKey = 'name' | 'date';

export default function StaffPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const { addToast } = useToastStore();
  const { user: currentUser } = useAuth();

  const [addForm, setAddForm] = useState({ name: '', username: '', password: '', role: 'CASHIER' });
  const [editForm, setEditForm] = useState({ name: '', role: 'CASHIER', password: '' });

  const { data: users, isLoading, refetch } = useRealtimeTable<UserRecord>({
    table: 'pos_staff',
    initialData: [],
    fetcher: getUsers,
    refetchOnChange: true
  });

  const processed = useMemo(() => {
    const filtered = users.filter(u => {
      if (currentUser?.role === 'MANAGER' && u.role !== 'CASHIER') return false;
      return (
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    return filtered.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortKey === 'date') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, searchQuery, currentUser, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.username || !addForm.password) return;
    setIsSaving(true);
    try {
      const hash = await bcrypt.hash(addForm.password, 10);
      await addUser({ 
        name: addForm.name, 
        username: addForm.username, 
        passwordHash: hash, 
        role: addForm.role as UserRecord['role']
      });
      addToast('User created successfully', 'success');
      refetch();
      setIsAddOpen(false);
      setAddForm({ name: '', username: '', password: '', role: 'CASHIER' });
    } catch { addToast('Failed to create user', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEditOpen = (u: UserRecord) => {
    setEditingUser(u);
    setEditForm({ name: u.name, role: u.role, password: '' });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await updateUser(editingUser.id, { name: editForm.name, role: editForm.role, password: editForm.password || undefined });
      addToast('User updated', 'success');
      refetch();
      setIsEditOpen(false);
    } catch { addToast('Failed to update', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (u: UserRecord) => {
    if (u.id === currentUser?.id) { addToast("You can't delete your own account", 'error'); return; }
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    try {
      await deleteUser(u.id);
      addToast('User deleted', 'info');
      refetch();
    } catch { addToast('Failed to delete user', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-primary" />
            Staff Management
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Coordinate system access and team coordination</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 shrink-0 font-bold rounded-xl shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      <Card className="border-2 border-border/50">
        <CardHeader className="pb-0 border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search staff..." 
                className="pl-10 h-11 rounded-xl border-border bg-muted/20" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="flex gap-2">
               <Button variant={sortKey === 'name' ? 'primary' : 'outline'} size="sm" onClick={() => toggleSort('name')} className="rounded-lg h-10 px-4">
                  <ArrowUpDown className="h-4 w-4 mr-2" /> Name {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
               </Button>
               <Button variant={sortKey === 'date' ? 'primary' : 'outline'} size="sm" onClick={() => toggleSort('date')} className="rounded-lg h-10 px-4">
                  <Calendar className="h-4 w-4 mr-2" /> Date Added {sortKey === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
               </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="rounded-xl overflow-hidden">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="flex items-center gap-6 px-6 py-5 border-b border-border last:border-0 bg-muted/5">
                   <Skeleton className="h-10 w-10 rounded-2xl" />
                   <div className="flex-1 space-y-2">
                     <Skeleton className="h-4 w-1/4" />
                     <Skeleton className="h-3 w-1/6" />
                   </div>
                   <Skeleton className="h-6 w-24 rounded-full" />
                   <div className="flex gap-2">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <Skeleton className="h-9 w-9 rounded-xl" />
                   </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left align-middle">
                <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground/70 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Account Access</th>
                    <th className="px-6 py-4">Position</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {processed.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium italic">No staff found.</td></tr>
                  ) : processed.map(u => {
                    const isSelf = u.id === currentUser?.id;
                    const roleBadge = ROLE_BADGE[u.role as keyof typeof ROLE_BADGE] ?? { label: u.role, class: 'bg-muted text-muted-foreground' };
                    return (
                      <tr key={u.id} className="hover:bg-primary/5 transition-all group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-primary/10">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                               <p className="font-bold text-foreground text-base tracking-tight">{u.name}</p>
                               {isSelf && <Badge className="bg-success text-white text-[10px] h-4 font-bold mt-0.5">YOU</Badge>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-muted-foreground font-bold">@{u.username}</td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold tracking-wide ${roleBadge.class} border border-current/10 shadow-sm`}>
                            {u.role === 'ADMIN' ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                            {roleBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-xs text-muted-foreground font-medium">
                          <div className="flex items-center gap-2">
                             <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                             {new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="pr-0 p-5 text-right">
                          <div className="flex justify-around">
                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-muted/50 text-info hover:bg-info/20" onClick={() => handleEditOpen(u)}>
                              <Edit className="h-4.5 w-4.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-destructive rounded-xl bg-muted/50 hover:bg-destructive/10" onClick={() => handleDelete(u)} disabled={isSelf}>
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

      {/* Add Staff Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Staff Member">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Full Name" placeholder="e.g. Alice Johnson" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
          <Input label="Username" placeholder="e.g. alice_j" value={addForm.username} onChange={(e) => setAddForm({ ...addForm, username: e.target.value })} required />
          <Input label="Password" type="password" placeholder="Min 8 characters" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required />
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Access Role</label>
            <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })} className="w-full h-11 px-4 text-sm rounded-xl border-2 border-border bg-card font-bold focus:outline-none focus:border-primary transition-all">
              {currentUser?.role === 'ADMIN' && <option value="ADMIN">Administrator</option>}
              {currentUser?.role === 'ADMIN' && <option value="MANAGER">Manager</option>}
              <option value="CASHIER">Cashier</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[140px] shadow-lg shadow-primary/20">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Launch Profile'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Staff: ${editingUser?.name}`}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input label="Full Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Access Role</label>
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full h-11 px-4 text-sm rounded-xl border-2 border-border bg-card font-bold focus:outline-none focus:border-primary transition-all">
              {currentUser?.role === 'ADMIN' && <option value="ADMIN">Administrator</option>}
              {currentUser?.role === 'ADMIN' && <option value="MANAGER">Manager</option>}
              <option value="CASHIER">Cashier</option>
            </select>
          </div>
          <Input label="New Password (leave blank to keep current)" type="password" placeholder="Enter new password..." value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving} className="rounded-xl">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="rounded-xl font-bold min-w-[140px]">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Update Access'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
