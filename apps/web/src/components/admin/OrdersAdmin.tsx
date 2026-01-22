'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Eye, Plus, Search, Send, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDateTime, formatPrice } from '@/lib/avantech/format';
import {
  buildSearchEntries,
  indexCatalog,
  type CatalogCategory,
  type CatalogProduct,
  type CatalogVariant,
  type SearchEntry,
} from '@/lib/avantech/catalogApi';
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
const statusOptions = ['NEW', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED'] as const;

type OrderStatus = (typeof statusOptions)[number];

type CustomerSummary = {
  id: string;
  name: string | null;
  phone: string;
  address: string | null;
  isActive: boolean;
};

type OrderListItem = {
  id: string;
  status: OrderStatus;
  total: number;
  locale: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CustomerSummary | null;
  itemsSummary: string;
};

type OrderDetail = {
  id: string;
  status: OrderStatus;
  total: number;
  locale: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    variantId?: string | null;
    productName?: string | null;
    variantLabel?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
  }>;
  customer: CustomerSummary | null;
};

type CustomerOption = {
  id: string;
  name: string | null;
  phone: string;
  address: string | null;
};

type OrderLineForm = {
  key: string;
  variantId?: string;
  productName: string;
  variantLabel: string;
  quantity: string;
  unitPrice: string;
};

const statusLabels: Record<OrderStatus, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  READY: 'Готов',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
};

const statusBadgeVariant: Record<OrderStatus, 'secondary' | 'outline' | 'destructive'> = {
  NEW: 'secondary',
  IN_PROGRESS: 'secondary',
  READY: 'secondary',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
};

const buildLine = (input?: Partial<OrderLineForm>): OrderLineForm => ({
  key: input?.key ?? `line-${Math.random().toString(36).slice(2, 10)}`,
  variantId: input?.variantId,
  productName: input?.productName ?? '',
  variantLabel: input?.variantLabel ?? '',
  quantity: input?.quantity ?? '1',
  unitPrice: input?.unitPrice ?? '',
});

const parsePositiveInt = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

export default function OrdersAdmin() {
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const currencyLabel = tCommon('labels.currency');
  const createFormId = useId();
  const detailFormId = useId();

  const [items, setItems] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(pageSizeDefault);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [customerSearchValue, setCustomerSearchValue] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  const [catalogEntries, setCatalogEntries] = useState<SearchEntry[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Record<string, CatalogProduct>>({});
  const [catalogVariants, setCatalogVariants] = useState<Record<string, CatalogVariant>>({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [createLines, setCreateLines] = useState<OrderLineForm[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<OrderStatus>('NEW');
  const [detailLines, setDetailLines] = useState<OrderLineForm[]>([]);
  const [detailCustomer, setDetailCustomer] = useState({ name: '', phone: '', address: '' });
  const [detailSubmitting, setDetailSubmitting] = useState(false);
  const [detailSending, setDetailSending] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQuery(searchValue.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchValue]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setCustomerQuery(customerSearchValue.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [customerSearchValue]);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as
        | { items?: OrderListItem[]; total?: number }
        | null;

      if (!response.ok) {
        setListError('Не удалось загрузить заказы.');
        return;
      }

      setItems(payload?.items ?? []);
      setTotal(payload?.total ?? 0);
    } catch {
      setListError('Не удалось загрузить заказы.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, query, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const loadCustomers = useCallback(async (value: string) => {
    setCustomerLoading(true);
    try {
      const params = new URLSearchParams();
      if (value) params.set('q', value);
      params.set('page', '1');
      params.set('pageSize', '10');

      const response = await fetch(`/api/admin/customers?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as
        | { items?: CustomerOption[] }
        | null;

      if (response.ok) {
        setCustomerResults(payload?.items ?? []);
      }
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const response = await fetch(`/api/catalog?locale=${locale}`);
      const payload = (await response.json().catch(() => null)) as { categories?: CatalogCategory[] } | null;
      if (!response.ok || !payload?.categories) {
        setCatalogError('Не удалось загрузить каталог.');
        return;
      }
      const { productsById, variantsById } = indexCatalog(payload.categories);
      const entries = buildSearchEntries(Object.values(variantsById), productsById);
      setCatalogProducts(productsById);
      setCatalogVariants(variantsById);
      setCatalogEntries(entries);
    } catch {
      setCatalogError('Не удалось загрузить каталог.');
    } finally {
      setCatalogLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (!createOpen) return;
    loadCatalog();
  }, [createOpen, loadCatalog]);

  useEffect(() => {
    if (!createOpen) return;
    loadCustomers(customerQuery);
  }, [createOpen, customerQuery, loadCustomers]);

  const resetCreateForm = () => {
    setCreateError(null);
    setCustomerSearchValue('');
    setCustomerQuery('');
    setCustomerResults([]);
    setSelectedCustomer(null);
    setCatalogEntries([]);
    setCatalogProducts({});
    setCatalogVariants({});
    setCatalogError(null);
    setProductQuery('');
    setCreateLines([]);
  };

  const openCreate = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const searchResults = useMemo(() => {
    if (!productQuery.trim()) return [];
    const needle = productQuery.trim().toLowerCase();
    return catalogEntries.filter((entry) => entry.searchText.includes(needle)).slice(0, 8);
  }, [catalogEntries, productQuery]);

  const createTotal = useMemo(() => {
    return createLines.reduce((sum, line) => {
      const qty = parsePositiveInt(line.quantity) ?? 0;
      const price = parsePositiveInt(line.unitPrice) ?? 0;
      return sum + qty * price;
    }, 0);
  }, [createLines]);

  const detailTotal = useMemo(() => {
    return detailLines.reduce((sum, line) => {
      const qty = parsePositiveInt(line.quantity) ?? 0;
      const price = parsePositiveInt(line.unitPrice) ?? 0;
      return sum + qty * price;
    }, 0);
  }, [detailLines]);

  const handleAddVariant = (entry: SearchEntry) => {
    const variant = catalogVariants[entry.variantId];
    const product = catalogProducts[entry.productId];
    if (!variant || !product) return;

    setCreateLines((prev) => {
      const existing = prev.find((line) => line.variantId === variant.id);
      if (existing) {
        return prev.map((line) => {
          if (line.variantId !== variant.id) return line;
          const qty = parsePositiveInt(line.quantity) ?? 0;
          return { ...line, quantity: (qty + 1).toString() };
        });
      }
      return [
        ...prev,
        buildLine({
          variantId: variant.id,
          productName: product.name,
          variantLabel: variant.label,
          quantity: '1',
          unitPrice: variant.price.toString(),
        }),
      ];
    });

    setProductQuery('');
  };

  const handleCreateSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setCreateError(null);

    if (!selectedCustomer) {
      setCreateError('Выберите клиента.');
      return;
    }

    if (createLines.length === 0) {
      setCreateError('Добавьте хотя бы одну позицию.');
      return;
    }

    const itemsPayload = createLines.map((line) => {
      const quantity = parsePositiveInt(line.quantity);
      const unitPrice = parsePositiveInt(line.unitPrice);
      return {
        variantId: line.variantId,
        productName: line.productName.trim(),
        variantLabel: line.variantLabel.trim() || null,
        quantity,
        unitPrice,
      };
    });

    if (itemsPayload.some((item) => !item.quantity || !item.unitPrice || !item.productName)) {
      setCreateError('Проверьте количество и цену.');
      return;
    }

    setCreateSubmitting(true);

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCustomer.id,
          items: itemsPayload,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setCreateError('Не удалось создать заказ.');
        return;
      }

      setCreateOpen(false);
      resetCreateForm();
      await loadOrders();
    } catch {
      setCreateError('Не удалось создать заказ.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openDetail = async (orderId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailOrder(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      const payload = (await response.json().catch(() => null)) as { order?: OrderDetail; message?: string } | null;
      if (!response.ok || !payload?.order) {
        setDetailError('Не удалось загрузить заказ.');
        return;
      }
      setDetailOrder(payload.order);
      setDetailStatus(payload.order.status);
      setDetailLines(
        payload.order.items.map((item) =>
          buildLine({
            variantId: item.variantId ?? undefined,
            productName: item.productName ?? 'Позиция',
            variantLabel: item.variantLabel ?? '',
            quantity: item.quantity?.toString() ?? '1',
            unitPrice: item.unitPrice?.toString() ?? '0',
          })
        )
      );
      setDetailCustomer({
        name: payload.order.customer?.name ?? '',
        phone: payload.order.customer?.phone ?? '',
        address: payload.order.customer?.address ?? '',
      });
    } catch {
      setDetailError('Не удалось загрузить заказ.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateOrder = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!detailOrder) return;
    setDetailError(null);

    if (detailLines.length === 0) {
      setDetailError('В заказе должна быть хотя бы одна позиция.');
      return;
    }

    const itemsPayload = detailLines.map((line) => {
      const quantity = parsePositiveInt(line.quantity);
      const unitPrice = parsePositiveInt(line.unitPrice);
      return {
        variantId: line.variantId,
        productName: line.productName.trim(),
        variantLabel: line.variantLabel.trim() || null,
        quantity,
        unitPrice,
      };
    });

    if (itemsPayload.some((item) => !item.quantity || !item.unitPrice || !item.productName)) {
      setDetailError('Проверьте количество и цену.');
      return;
    }

    setDetailSubmitting(true);

    try {
      const response = await fetch(`/api/admin/orders/${detailOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: detailStatus,
          items: itemsPayload,
          customer: detailOrder.customer
            ? {
                name: detailCustomer.name.trim() || null,
                phone: detailCustomer.phone.trim(),
                address: detailCustomer.address.trim() || null,
              }
            : undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string; order?: OrderDetail } | null;
      if (!response.ok) {
        setDetailError('Не удалось обновить заказ.');
        return;
      }

      if (payload?.order) {
        setDetailOrder(payload.order);
        setDetailStatus(payload.order.status);
        setDetailLines(
          payload.order.items.map((item) =>
            buildLine({
              variantId: item.variantId ?? undefined,
              productName: item.productName ?? 'Позиция',
              variantLabel: item.variantLabel ?? '',
              quantity: item.quantity?.toString() ?? '1',
              unitPrice: item.unitPrice?.toString() ?? '0',
            })
          )
        );
      }

      await loadOrders();
    } catch {
      setDetailError('Не удалось обновить заказ.');
    } finally {
      setDetailSubmitting(false);
    }
  };

  const handleSendTelegram = async () => {
    if (!detailOrder) return;
    setDetailSending(true);
    try {
      await fetch(`/api/admin/orders/${detailOrder.id}/send-telegram`, { method: 'POST' });
    } finally {
      setDetailSending(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = searchValue.trim().length > 0 || statusFilter !== 'all';

  const detailFooter = detailOrder ? (
    <>
      <Button type="submit" form={detailFormId} disabled={detailSubmitting}>
        {detailSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
      </Button>
      <Button type="button" variant="outline" onClick={handleSendTelegram} disabled={detailSending}>
        <Send className="size-4" />
        {detailSending ? 'Отправка...' : 'Отправить в Telegram'}
      </Button>
      <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
        Закрыть
      </Button>
    </>
  ) : (
    <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
      Закрыть
    </Button>
  );

  return (
    <AdminPageShell title="Заказы" subtitle="Просматривайте и управляйте заказами.">
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Список заказов</CardTitle>
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
                  placeholder="Поиск по номеру заказа или клиенту"
                  className="pl-9"
                />
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            }
            filters={
              <>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as 'all' | OrderStatus);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Фильтр по статусу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters ? (
                  <AdminClearButton
                    onClick={() => {
                      setSearchValue('');
                      setQuery('');
                      setStatusFilter('all');
                      setPage(1);
                    }}
                    label="Сбросить фильтры"
                  />
                ) : null}
              </>
            }
            actions={
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Создать заказ
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
              title="Заказов пока нет"
              description="Создайте первый ручной заказ."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Создать заказ
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
                        <th className="px-4 py-3 text-left">Заказ</th>
                        <th className="px-4 py-3 text-left">Клиент</th>
                        <th className="px-4 py-3 text-left">Позиции</th>
                        <th className="px-4 py-3 text-left">Статус</th>
                        <th className="px-4 py-3 text-right">Сумма</th>
                        <th className="px-4 py-3 text-left">Создан</th>
                        <th className="px-4 py-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((order) => (
                        <tr
                          key={order.id}
                          className="cursor-pointer transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                          onClick={() => openDetail(order.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openDetail(order.id);
                            }
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">Заказ №{order.id.slice(0, 8)}</div>
                            <div className="text-xs text-muted-foreground">{order.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-foreground">
                              {order.customer?.name ?? 'Гость'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.customer?.phone ?? 'Нет телефона'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {order.itemsSummary || 'Нет позиций'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusBadgeVariant[order.status]}>
                              {statusLabels[order.status]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatPrice(order.total, locale, currencyLabel)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDateTime(new Date(order.createdAt), locale)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <IconButton
                                size="icon-sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openDetail(order.id);
                                }}
                                aria-label="Открыть заказ"
                                title="Открыть заказ"
                              >
                                <Eye className="size-4" />
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
                  {items.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-border/60 bg-white p-4 shadow-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetail(order.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openDetail(order.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground">
                            Заказ №{order.id.slice(0, 8)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.customer?.name ?? 'Гость'} · {order.customer?.phone ?? 'Нет телефона'}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {order.itemsSummary || 'Нет позиций'}
                          </div>
                        </div>
                        <Badge variant={statusBadgeVariant[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDateTime(new Date(order.createdAt), locale)}</span>
                        <span className="text-sm font-semibold text-foreground">
                          {formatPrice(order.total, locale, currencyLabel)}
                        </span>
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
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
        title="Создать заказ"
        description="Выберите клиента и добавьте позиции."
        size="xl"
        variant="sheetOnMobile"
        footer={
          <>
            <Button type="submit" form={createFormId} disabled={createSubmitting}>
              {createSubmitting ? 'Сохранение...' : 'Создать заказ'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
          </>
        }
      >
        <form id={createFormId} className="space-y-5" onSubmit={handleCreateSubmit}>
          <div className="space-y-2">
            <Field label="Клиент">
              <Input
                value={customerSearchValue}
                onChange={(event) => setCustomerSearchValue(event.target.value)}
                placeholder="Поиск клиента по имени или телефону"
              />
            </Field>
            {customerLoading ? (
              <div className="text-xs text-muted-foreground">Поиск клиентов...</div>
            ) : customerResults.length === 0 ? (
              <div className="text-xs text-muted-foreground">Клиенты не найдены.</div>
            ) : (
              <div className="grid gap-2">
                {customerResults.map((customer) => (
                  <button
                    type="button"
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-sm transition',
                      selectedCustomer?.id === customer.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border/60 hover:border-border'
                      )}
                    >
                      <div className="font-semibold">
                        {customer.name ?? 'Без имени'}
                      </div>
                      <div className="text-xs text-muted-foreground">{customer.phone}</div>
                    </button>
                  ))}
                </div>
            )}
            {selectedCustomer && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                Выбран: {selectedCustomer.name ?? 'Без имени'} · {selectedCustomer.phone}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Field label="Добавить товары">
              <Input
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
                placeholder="Поиск товара или варианта"
              />
            </Field>
            {catalogLoading && <div className="text-xs text-muted-foreground">Загрузка каталога...</div>}
            {catalogError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {catalogError}
              </div>
            )}
            {productQuery.trim() && searchResults.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-white shadow-sm">
                {searchResults.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    onClick={() => handleAddVariant(entry)}
                    className="flex w-full items-center justify-between gap-3 border-b border-border/40 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{entry.title}</div>
                      <div className="text-xs text-muted-foreground">{entry.subtitle}</div>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      {formatPrice(entry.price, locale, currencyLabel)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {createLines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              Позиции пока не добавлены. Найдите товары в каталоге.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Позиции</div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                <div className="hidden grid-cols-[minmax(0,1fr)_120px_140px_auto] items-center gap-3 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground md:grid">
                  <div>Товар</div>
                  <div>Кол-во</div>
                  <div>Цена</div>
                  <div className="text-right">Удалить</div>
                </div>
                <div className="divide-y divide-border/60">
                  {createLines.map((line) => (
                    <div
                      key={line.key}
                      className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_140px_auto] md:items-center"
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">{line.productName}</div>
                        <div className="text-xs text-muted-foreground">{line.variantLabel || '—'}</div>
                      </div>
                      <Input
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(event) =>
                          setCreateLines((prev) =>
                            prev.map((item) =>
                              item.key === line.key ? { ...item, quantity: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Кол-во"
                      />
                      <Input
                        inputMode="numeric"
                        value={line.unitPrice}
                        onChange={(event) =>
                          setCreateLines((prev) =>
                            prev.map((item) =>
                              item.key === line.key ? { ...item, unitPrice: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Цена"
                      />
                      <div className="flex justify-end">
                        <IconButton
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() =>
                            setCreateLines((prev) => prev.filter((item) => item.key !== line.key))
                          }
                          aria-label="Удалить позицию"
                          title="Удалить позицию"
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Итого</div>
            <div className="font-semibold">{formatPrice(createTotal, locale, currencyLabel)}</div>
          </div>

          {createError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {createError}
            </div>
          )}
        </form>
      </AdminModal>

      <AdminModal
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailOrder(null);
            setDetailLines([]);
            setDetailError(null);
          }
        }}
        title="Детали заказа"
        description="Обновите статус, позиции или отправьте в Telegram."
        size="xl"
        variant="sheetOnMobile"
        footer={detailFooter}
      >
        {detailLoading ? (
          <div className="text-sm text-muted-foreground">Загрузка заказа...</div>
        ) : detailOrder ? (
          <form id={detailFormId} className="space-y-5" onSubmit={handleUpdateOrder}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 p-4 text-sm">
                <div className="text-xs text-muted-foreground">ID заказа</div>
                <div className="font-semibold">{detailOrder.id}</div>
                <div className="mt-2 text-xs text-muted-foreground">Создан</div>
                <div>{formatDateTime(new Date(detailOrder.createdAt), locale)}</div>
              </div>
              <div className="rounded-xl border border-border/60 p-4 text-sm">
                <Field label="Статус">
                  <Select value={detailStatus} onValueChange={(value) => setDetailStatus(value as OrderStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            {detailOrder.customer ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Имя клиента">
                  <Input
                    value={detailCustomer.name}
                    onChange={(event) => setDetailCustomer((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </Field>
                <Field label="Телефон">
                  <Input
                    value={detailCustomer.phone}
                    onChange={(event) => setDetailCustomer((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </Field>
                <Field label="Адрес">
                  <Input
                    value={detailCustomer.address}
                    onChange={(event) => setDetailCustomer((prev) => ({ ...prev, address: event.target.value }))}
                  />
                </Field>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                У заказа нет связанного клиента.
              </div>
            )}

            {detailLines.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                В заказе нет позиций.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">Позиции</div>
                <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
                  <div className="hidden grid-cols-[minmax(0,1fr)_120px_140px_auto] items-center gap-3 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground md:grid">
                    <div>Товар</div>
                    <div>Кол-во</div>
                    <div>Цена</div>
                    <div className="text-right">Удалить</div>
                  </div>
                  <div className="divide-y divide-border/60">
                    {detailLines.map((line) => (
                      <div
                        key={line.key}
                        className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_140px_auto] md:items-center"
                      >
                        <div>
                          <div className="text-sm font-semibold text-foreground">{line.productName}</div>
                          <div className="text-xs text-muted-foreground">{line.variantLabel || '—'}</div>
                        </div>
                        <Input
                          inputMode="numeric"
                          value={line.quantity}
                          onChange={(event) =>
                            setDetailLines((prev) =>
                              prev.map((item) =>
                                item.key === line.key ? { ...item, quantity: event.target.value } : item
                              )
                            )
                          }
                        />
                        <Input
                          inputMode="numeric"
                          value={line.unitPrice}
                          onChange={(event) =>
                            setDetailLines((prev) =>
                              prev.map((item) =>
                                item.key === line.key ? { ...item, unitPrice: event.target.value } : item
                              )
                            )
                          }
                        />
                        <div className="flex justify-end">
                          <IconButton
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() =>
                              setDetailLines((prev) => prev.filter((item) => item.key !== line.key))
                            }
                            aria-label="Удалить позицию"
                            title="Удалить позицию"
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <div className="font-medium">Итого</div>
              <div className="font-semibold">{formatPrice(detailTotal, locale, currencyLabel)}</div>
            </div>

            {detailError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {detailError}
              </div>
            )}
          </form>
        ) : (
          <div className="text-sm text-muted-foreground">Заказ не найден.</div>
        )}
      </AdminModal>
    </AdminPageShell>
  );
}
