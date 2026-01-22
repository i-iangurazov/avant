'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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

type CategoryOption = {
  id: string;
  name: string;
  subcategories: Array<{ id: string; name: string }>;
};

type ProductListItem = {
  id: string;
  name: string;
  category: { id: string; name: string };
  subcategory: { id: string; name: string } | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  variantCount: number;
};

type ProductFormVariant = {
  key: string;
  label: string;
  price: string;
  sku: string;
};

type ProductDetail = {
  id: string;
  name: string;
  categoryId: string;
  subcategoryId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  variants: Array<{ id: string; label: string; price: number; sku: string | null; isActive: boolean }>;
};

const buildVariant = (variant?: Partial<ProductFormVariant>): ProductFormVariant => ({
  key: variant?.key ?? `variant-${Math.random().toString(36).slice(2, 10)}`,
  label: variant?.label ?? '',
  price: variant?.price ?? '',
  sku: variant?.sku ?? '',
});

export default function ProductsAdmin() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(pageSizeDefault);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formUploading, setFormUploading] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const productActiveId = useId();
  const formId = useId();

  const [form, setForm] = useState({
    id: '',
    name: '',
    categoryId: '',
    subcategoryId: '',
    imageUrl: '',
    sortOrder: '',
    isActive: true,
    variants: [buildVariant()],
  });

  const subcategoryOptions = useMemo(() => {
    const selected = categories.find((category) => category.id === form.categoryId);
    return selected?.subcategories ?? [];
  }, [categories, form.categoryId]);

  useEffect(() => {
    if (form.subcategoryId && !subcategoryOptions.find((subcategory) => subcategory.id === form.subcategoryId)) {
      setForm((prev) => ({ ...prev, subcategoryId: '' }));
    }
  }, [subcategoryOptions, form.subcategoryId]);

  useEffect(() => {
    if (!form.categoryId && categories.length > 0) {
      setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, form.categoryId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQuery(searchValue.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchValue]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/admin/taxonomy');
      const payload = (await response.json().catch(() => null)) as { categories?: CategoryOption[] } | null;
      if (!response.ok) return;
      setCategories(payload?.categories ?? []);
    } catch {
      /* ignore */
    }
  };

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as
        | { items?: ProductListItem[]; total?: number }
        | null;
      if (!response.ok) {
        setListError('Не удалось загрузить товары.');
        return;
      }
      setItems(payload?.items ?? []);
      setTotal(payload?.total ?? 0);
    } catch {
      setListError('Не удалось загрузить товары.');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, page, pageSize, query]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      categoryId: categories[0]?.id ?? '',
      subcategoryId: '',
      imageUrl: '',
      sortOrder: '',
      isActive: true,
      variants: [buildVariant()],
    });
    setFormError(null);
    setFormUploading(false);
    setFormFile(null);
    setUploadNotice(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = async (id: string) => {
    setDialogOpen(true);
    setFormLoading(true);
    setFormError(null);
    setUploadNotice(null);
    try {
      const response = await fetch(`/api/admin/products/${id}`);
      const payload = (await response.json().catch(() => null)) as { product?: ProductDetail } | null;
      if (!response.ok || !payload?.product) {
        setFormError('Не удалось загрузить товар.');
        return;
      }
      const product = payload.product;
      setForm({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId ?? '',
        imageUrl: product.imageUrl ?? '',
        sortOrder: product.sortOrder.toString(),
        isActive: product.isActive,
        variants: product.variants.length
          ? product.variants.map((variant) =>
              buildVariant({
                label: variant.label,
                price: variant.price.toString(),
                sku: variant.sku ?? '',
              })
            )
          : [buildVariant()],
      });
    } catch {
      setFormError('Не удалось загрузить товар.');
    } finally {
      setFormLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Название товара обязательно.';
    if (!form.categoryId) return 'Категория обязательна.';

    const variants = form.variants.map((variant) => ({
      label: variant.label.trim(),
      price: Number(variant.price),
      sku: variant.sku.trim(),
    }));

    if (variants.length === 0) return 'Нужен хотя бы один вариант.';
    for (const variant of variants) {
      if (!variant.label) return 'Название варианта обязательно.';
      if (!Number.isFinite(variant.price) || variant.price <= 0 || !Number.isInteger(variant.price)) {
        return 'Цена варианта должна быть положительным целым числом.';
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const parsedSortOrder = Number(form.sortOrder);
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId ? form.subcategoryId : null,
      imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
      sortOrder: Number.isFinite(parsedSortOrder) ? parsedSortOrder : undefined,
      isActive: form.isActive,
      variants: form.variants.map((variant) => ({
        label: variant.label.trim(),
        price: Number(variant.price),
        sku: variant.sku.trim() ? variant.sku.trim() : null,
      })),
    };

    setFormSubmitting(true);
    try {
      const response = await fetch(
        form.id ? `/api/admin/products/${form.id}` : '/api/admin/products',
        {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const responsePayload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setFormError('Не удалось сохранить товар.');
        return;
      }
      setDialogOpen(false);
      resetForm();
      await loadProducts();
    } catch {
      setFormError('Не удалось сохранить товар.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpload = async () => {
    if (!formFile) return;
    setFormUploading(true);
    setFormError(null);
    setUploadNotice(null);
    try {
      const formData = new FormData();
      formData.append('file', formFile);
      const response = await fetch('/api/admin/products/upload-image', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!response.ok || !payload?.url) {
        setFormError('Не удалось загрузить изображение.');
        return;
      }
      setForm((prev) => ({ ...prev, imageUrl: payload.url ?? prev.imageUrl }));
      setFormFile(null);
      setUploadNotice('Изображение загружено.');
    } catch {
      setFormError('Не удалось загрузить изображение.');
    } finally {
      setFormUploading(false);
    }
  };

  const handleToggle = async (item: ProductListItem) => {
    try {
      const response = await fetch(`/api/admin/products/${item.id}`);
      const payload = (await response.json().catch(() => null)) as { product?: ProductDetail } | null;
      if (!response.ok || !payload?.product) return;
      const product = payload.product;
      const updatePayload = {
        name: product.name,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        imageUrl: product.imageUrl,
        sortOrder: product.sortOrder,
        isActive: !product.isActive,
        variants: product.variants.map((variant) => ({
          label: variant.label,
          price: variant.price,
          sku: variant.sku,
          isActive: variant.isActive,
        })),
      };
      await fetch(`/api/admin/products/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      await loadProducts();
    } catch {
      await loadProducts();
    }
  };

  const handleDelete = async (item: ProductListItem) => {
    if (!confirm(`Отключить товар «${item.name}»?`)) return;
    await fetch(`/api/admin/products/${item.id}`, { method: 'DELETE' });
    await loadProducts();
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = searchValue.trim().length > 0 || categoryFilter !== 'all';
  const formFooter = formLoading ? (
    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
      Закрыть
    </Button>
  ) : (
    <>
      <Button type="submit" form={formId} disabled={formSubmitting}>
        {formSubmitting ? 'Сохранение...' : form.id ? 'Сохранить товар' : 'Создать товар'}
      </Button>
      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
        Отмена
      </Button>
    </>
  );

  return (
    <AdminPageShell
      title="Товары"
      subtitle="Управляйте товарами и вариантами каталога."
    >
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Список товаров</CardTitle>
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
                  placeholder="Поиск по названию"
                  className="pl-9"
                />
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            }
            filters={
              <>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Фильтр по категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters ? (
                  <AdminClearButton
                    onClick={() => {
                      setSearchValue('');
                      setQuery('');
                      setCategoryFilter('all');
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
                Добавить товар
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
              title="Товаров пока нет"
              description="Добавьте товар, чтобы начать наполнять каталог."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Добавить товар
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
                        <th className="px-4 py-3 text-left">Товар</th>
                        <th className="px-4 py-3 text-left">Категория</th>
                        <th className="px-4 py-3 text-left">Варианты</th>
                        <th className="px-4 py-3 text-left">Статус</th>
                        <th className="px-4 py-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((item) => (
                        <tr key={item.id} className={item.isActive ? '' : 'opacity-60'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted/20">
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-muted-foreground">
                                    Нет фото
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{item.name}</div>
                                <div className="text-xs text-muted-foreground">Порядок: {item.sortOrder}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.category.name}
                            {item.subcategory ? ` · ${item.subcategory.name}` : ''}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{item.variantCount}</td>
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
                                onClick={() => openEdit(item.id)}
                                aria-label="Редактировать товар"
                                title="Редактировать товар"
                              >
                                <Pencil className="size-4" />
                              </IconButton>
                              <IconButton
                                size="icon-sm"
                                variant="secondary"
                                onClick={() => handleToggle(item)}
                                aria-label={item.isActive ? 'Отключить товар' : 'Включить товар'}
                                title={item.isActive ? 'Отключить товар' : 'Включить товар'}
                              >
                                {item.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </IconButton>
                              <IconButton
                                size="icon-sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDelete(item)}
                                aria-label="Удалить товар"
                                title="Удалить товар"
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
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted/20">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-muted-foreground">
                                Нет фото
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.category.name}{item.subcategory ? ` · ${item.subcategory.name}` : ''}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Варианты: {item.variantCount}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={item.isActive ? 'secondary' : 'outline'}>
                            {item.isActive ? 'Активен' : 'Неактивен'}
                          </Badge>
                          <IconButton
                            size="icon-sm"
                            variant="outline"
                            onClick={() => openEdit(item.id)}
                            aria-label="Редактировать товар"
                            title="Редактировать товар"
                          >
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton
                            size="icon-sm"
                            variant="secondary"
                            onClick={() => handleToggle(item)}
                            aria-label={item.isActive ? 'Отключить товар' : 'Включить товар'}
                            title={item.isActive ? 'Отключить товар' : 'Включить товар'}
                          >
                            {item.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </IconButton>
                          <IconButton
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(item)}
                            aria-label="Удалить товар"
                            title="Удалить товар"
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
        title={form.id ? 'Редактировать товар' : 'Добавить товар'}
        description="Название (RU) и минимум один вариант обязательны."
        size="xl"
        variant="sheetOnMobile"
        footer={formFooter}
        bodyClassName="space-y-4"
      >
        {formLoading ? (
          <div className="text-sm text-muted-foreground">Загрузка товара...</div>
        ) : (
          <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field label="Название (RU)" required>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Порядок сортировки">
                <Input
                  inputMode="numeric"
                  value={form.sortOrder}
                  onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  placeholder="Авто"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Категория" required>
                <Select
                  value={form.categoryId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Подкатегория (необязательно)">
                <Select
                  value={form.subcategoryId || 'none'}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, subcategoryId: value === 'none' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подкатегорию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Нет</SelectItem>
                    {subcategoryOptions.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="URL изображения">
                <Input
                  value={form.imageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Загрузка изображения">
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      setFormFile(event.target.files?.[0] ?? null);
                      setUploadNotice(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUpload}
                    disabled={!formFile || formUploading}
                  >
                    <Upload className="size-4" />
                    {formUploading ? 'Загрузка...' : 'Загрузить'}
                  </Button>
                  {uploadNotice ? (
                    <div className="text-xs font-medium text-emerald-600">{uploadNotice}</div>
                  ) : null}
                </div>
              </Field>
            </div>
            <div className="text-xs text-muted-foreground">
              Допустимые типы: jpeg, png, webp. Максимальный размер 5 МБ.
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Варианты</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, variants: [...prev.variants, buildVariant()] }))}
                >
                  <Plus className="size-4" />
                  Добавить вариант
                </Button>
              </div>
              <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_140px_160px_auto] md:gap-2 text-xs font-medium text-muted-foreground">
                <div>Название</div>
                <div>Цена</div>
                <div>Артикул</div>
                <div />
              </div>
              {form.variants.map((variant, index) => (
                <div key={variant.key} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_160px_auto]">
                  <Input
                    value={variant.label}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        variants: prev.variants.map((item, idx) =>
                          idx === index ? { ...item, label: value } : item
                        ),
                      }));
                    }}
                    placeholder="Название варианта"
                  />
                  <Input
                    inputMode="numeric"
                    value={variant.price}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        variants: prev.variants.map((item, idx) =>
                          idx === index ? { ...item, price: value } : item
                        ),
                      }));
                    }}
                    placeholder="Цена"
                  />
                  <Input
                    value={variant.sku}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        variants: prev.variants.map((item, idx) =>
                          idx === index ? { ...item, sku: value } : item
                        ),
                      }));
                    }}
                    placeholder="Артикул (необязательно)"
                  />
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        variants: prev.variants.filter((_, idx) => idx !== index),
                      }));
                    }}
                    disabled={form.variants.length <= 1}
                    aria-label="Удалить вариант"
                    title="Удалить вариант"
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor={productActiveId}>
              <Checkbox
                id={productActiveId}
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked === true }))}
              />
              Активный товар
            </label>

            {formError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {formError}
              </div>
            )}
          </form>
        )}
      </AdminModal>
    </AdminPageShell>
  );
}
