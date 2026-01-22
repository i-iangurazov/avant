'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toastInfo } from '@/lib/toast';
import { formatDateTime } from '@/lib/avantech/format';
import { useLanguage } from '@/lib/useLanguage';
import {
  AdminClearButton,
  AdminEmptyState,
  AdminListSkeleton,
  AdminModal,
  AdminPageShell,
  AdminResponsiveList,
  AdminToolbar,
} from './admin-ui';

const pageSizeDefault = 20;

type CustomerListItem = {
  id: string;
  name: string | null;
  phone: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function CustomersAdmin() {
  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(pageSizeDefault);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: '',
    name: '',
    phone: '',
    address: '',
    password: '',
    isActive: true,
  });
  const activeId = useId();
  const formId = useId();
  const { lang } = useLanguage();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQuery(searchValue.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchValue]);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      const response = await fetch(`/api/admin/customers?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as
        | { items?: CustomerListItem[]; total?: number }
        | null;
      if (!response.ok) {
        setListError(payload?.items ? 'Не удалось загрузить клиентов.' : 'Не удалось загрузить клиентов.');
        return;
      }
      setItems(payload?.items ?? []);
      setTotal(payload?.total ?? 0);
    } catch {
      setListError('Не удалось загрузить клиентов.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, query]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const resetForm = () => {
    setForm({ id: '', name: '', phone: '', address: '', password: '', isActive: true });
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (customer: CustomerListItem) => {
    setForm({
      id: customer.id,
      name: customer.name ?? '',
      phone: customer.phone,
      address: customer.address ?? '',
      password: '',
      isActive: customer.isActive,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    const payload = {
      name: form.name.trim() || null,
      phone: form.phone.trim(),
      address: form.address.trim() || null,
      isActive: form.isActive,
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
    };

    try {
      const response = await fetch(
        form.id ? `/api/admin/customers/${form.id}` : '/api/admin/customers',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const resultPayload = (await response.json().catch(() => null)) as
        | { message?: string; tempPassword?: string }
        | null;
      if (!response.ok) {
        setFormError('Не удалось сохранить клиента.');
        return;
      }
      if (resultPayload?.tempPassword) {
        toastInfo('Сгенерирован временный пароль', { description: resultPayload.tempPassword });
      }
      setDialogOpen(false);
      resetForm();
      await loadCustomers();
    } catch {
      setFormError('Не удалось сохранить клиента.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggle = async (customer: CustomerListItem) => {
    await fetch(`/api/admin/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !customer.isActive }),
    });
    await loadCustomers();
  };

  const handleDelete = async (customer: CustomerListItem) => {
    if (!confirm(`Отключить клиента «${customer.phone}»?`)) return;
    await fetch(`/api/admin/customers/${customer.id}`, { method: 'DELETE' });
    await loadCustomers();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = searchValue.trim().length > 0 || query.trim().length > 0;

  return (
    <AdminPageShell
      title="Клиенты"
      subtitle="Управляйте контактами клиентов для ручных заказов."
    >
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Список клиентов</CardTitle>
            <div className="text-xs text-muted-foreground">
              {total} всего · страница {page} из {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminToolbar
            search={
              <div className="relative">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Поиск по имени, телефону или адресу"
                  className="pl-9"
                />
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            }
            filters={
              hasFilters ? (
                <AdminClearButton
                  onClick={() => {
                    setSearchValue('');
                    setQuery('');
                    setPage(1);
                  }}
                  label="Сбросить фильтры"
                />
              ) : null
            }
            actions={
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Добавить клиента
              </Button>
            }
          />

          {listError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {listError}
            </div>
          )}

          {isLoading ? (
            <AdminListSkeleton rows={4} />
          ) : items.length === 0 ? (
            <AdminEmptyState
              title="Клиентов пока нет"
              description="Создайте первого клиента для ручных заказов."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Добавить клиента
                </Button>
              }
            />
          ) : (
            <AdminResponsiveList
              desktop={
                <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Клиент</th>
                        <th className="px-4 py-3 text-left">Телефон</th>
                        <th className="px-4 py-3 text-left">Адрес</th>
                        <th className="px-4 py-3 text-left">Создан</th>
                        <th className="px-4 py-3 text-left">Статус</th>
                        <th className="px-4 py-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((item) => (
                        <tr key={item.id} className={item.isActive ? '' : 'opacity-60'}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">
                              {item.name ?? 'Без имени'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{item.phone}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.address ? item.address : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDateTime(new Date(item.createdAt), lang)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={item.isActive ? 'secondary' : 'outline'}>
                              {item.isActive ? 'Активен' : 'Неактивен'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <IconButton
                                size="icon-sm"
                                variant="outline"
                                onClick={() => openEdit(item)}
                                aria-label="Редактировать клиента"
                                title="Редактировать клиента"
                              >
                                <Pencil className="size-4" />
                              </IconButton>
                              <IconButton
                                size="icon-sm"
                                variant="secondary"
                                onClick={() => handleToggle(item)}
                                aria-label={item.isActive ? 'Отключить клиента' : 'Включить клиента'}
                                title={item.isActive ? 'Отключить клиента' : 'Включить клиента'}
                              >
                                {item.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </IconButton>
                              <IconButton
                                size="icon-sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDelete(item)}
                                aria-label="Удалить клиента"
                                title="Удалить клиента"
                              >
                                <Trash2 className="size-4" />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
              mobile={
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border border-border/60 bg-white p-4 shadow-sm ${item.isActive ? '' : 'opacity-60'}`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground">
                            {item.name ?? 'Без имени'}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.phone}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.address ? item.address : 'Адрес: —'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(new Date(item.createdAt), lang)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={item.isActive ? 'secondary' : 'outline'}>
                            {item.isActive ? 'Активен' : 'Неактивен'}
                          </Badge>
                          <IconButton
                            size="icon-sm"
                            variant="outline"
                            onClick={() => openEdit(item)}
                            aria-label="Редактировать клиента"
                            title="Редактировать клиента"
                          >
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton
                            size="icon-sm"
                            variant="secondary"
                            onClick={() => handleToggle(item)}
                            aria-label={item.isActive ? 'Отключить клиента' : 'Включить клиента'}
                            title={item.isActive ? 'Отключить клиента' : 'Включить клиента'}
                          >
                            {item.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </IconButton>
                          <IconButton
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(item)}
                            aria-label="Удалить клиента"
                            title="Удалить клиента"
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            />
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              Назад
            </Button>
            <div className="text-xs text-muted-foreground">
              Показано {items.length} из {total}
            </div>
            <Button
              variant="outline"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Далее
            </Button>
          </div>
        </CardContent>
      </Card>

      <AdminModal
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
        title={form.id ? 'Редактировать клиента' : 'Добавить клиента'}
        description="Номер телефона обязателен."
        size="md"
        footer={
          <>
            <Button type="submit" form={formId} disabled={formSubmitting}>
              {formSubmitting ? 'Сохранение...' : form.id ? 'Сохранить клиента' : 'Создать клиента'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
          </>
        }
      >
        <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Имя">
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </Field>
            <Field label="Телефон" required>
              <Input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                required
              />
            </Field>
          </div>
          <Field label="Адрес">
            <Input
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </Field>
          <Field label={form.id ? 'Сброс пароля (необязательно)' : 'Пароль (необязательно)'}>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder={form.id ? 'Оставьте пустым, чтобы сохранить текущий пароль' : 'Оставьте пустым для автогенерации'}
            />
          </Field>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id={activeId}
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: Boolean(checked) }))}
            />
            <label htmlFor={activeId}>Активный клиент</label>
          </div>

          {formError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </div>
          )}
        </form>
      </AdminModal>
    </AdminPageShell>
  );
}
