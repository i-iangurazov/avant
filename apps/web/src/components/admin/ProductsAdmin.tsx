'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Copy, Eye, EyeOff, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toastError } from '@/lib/toast';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formUploading, setFormUploading] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const productActiveId = useId();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);

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

  useEffect(() => {
    if (selectedIds.size === 0) return;
    const available = new Set(items.map((item) => item.id));
    const next = new Set<string>();
    let changed = false;
    for (const id of selectedIds) {
      if (available.has(id)) {
        next.add(id);
      } else {
        changed = true;
      }
    }
    if (changed) {
      setSelectedIds(next);
    }
  }, [items, selectedIds]);

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

  const validateImageFile = useCallback((file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return 'Допустимы только изображения JPEG, PNG или WebP.';
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Размер файла не должен превышать 5 МБ.';
    }
    return null;
  }, []);

  const uploadImageFile = useCallback(async (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormUploading(true);
    setFormError(null);
    setUploadNotice(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/products/upload-image', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!response.ok || !payload?.url) {
        setFormError(payload?.message ?? 'Не удалось загрузить изображение.');
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
  }, [validateImageFile]);

  const handleUpload = async () => {
    if (!formFile) return;
    await uploadImageFile(formFile);
  };

  useEffect(() => {
    if (!dialogOpen) {
      setIsDragActive(false);
      dragCounter.current = 0;
      return;
    }

    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');

    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounter.current += 1;
      setIsDragActive(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragActive(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounter.current = 0;
      setIsDragActive(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        void uploadImageFile(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [dialogOpen, uploadImageFile]);

  useEffect(() => {
    if (!isDragActive) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      dragCounter.current = 0;
      setIsDragActive(false);
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isDragActive]);

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
    if (!confirm(`Удалить товар «${item.name}»? Это действие нельзя отменить.`)) return;
    try {
      const response = await fetch(`/api/admin/products/${item.id}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        toastError(payload?.message ?? 'Не удалось удалить товар.');
        return;
      }
      setSelectedIds((prev) => {
        if (!prev.has(item.id)) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      await loadProducts();
    } catch {
      toastError('Не удалось удалить товар.');
    }
  };

  const handleDuplicate = async (item: ProductListItem) => {
    try {
      const response = await fetch(`/api/admin/products/${item.id}/duplicate`, { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as
        | { product?: ProductListItem; message?: string }
        | null;
      if (!response.ok || !payload?.product) {
        toastError(payload?.message ?? 'Не удалось продублировать товар.');
        return;
      }
      setTotal((prev) => prev + 1);
      if (page === 1) {
        setItems((prev) => [payload.product as ProductListItem, ...prev].slice(0, pageSize));
        await loadProducts();
      } else {
        setPage(1);
      }
    } catch {
      toastError('Не удалось продублировать товар.');
    }
  };

  const selectedCount = selectedIds.size;
  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const someSelected = items.some((item) => selectedIds.has(item.id));

  const toggleAll = (checked: boolean | 'indeterminate') => {
    const shouldSelect = checked === true;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (shouldSelect) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
      }
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean | 'indeterminate') => {
    const shouldSelect = checked === true;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shouldSelect) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (!confirm(`Удалить выбранные товары (${ids.length})? Это действие нельзя отменить.`)) return;
    setBulkDeleting(true);
    const failures: string[] = [];
    const remaining = new Set(selectedIds);

    for (const id of ids) {
      try {
        const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        if (!response.ok) {
          failures.push(payload?.message ?? 'Не удалось удалить товар.');
        } else {
          remaining.delete(id);
        }
      } catch {
        failures.push('Не удалось удалить товар.');
      }
    }

    setSelectedIds(remaining);
    await loadProducts();
    setBulkDeleting(false);

    if (failures.length > 0) {
      toastError(`Не удалось удалить ${failures.length} товар(ов).`, { description: failures[0] });
    }
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

          {selectedCount > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="font-medium text-foreground">Выбрано: {selectedCount}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  <Trash2 className="size-4" />
                  {bulkDeleting ? 'Удаление...' : 'Удалить'}
                </Button>
                <Button variant="outline" onClick={clearSelection} disabled={bulkDeleting}>
                  Снять выделение
                </Button>
              </div>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground md:hidden">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={toggleAll}
                aria-label="Выбрать все товары на странице"
              />
              <span>Выбрать все на странице</span>
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
                        <th className="px-4 py-3 text-left">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                              onCheckedChange={toggleAll}
                              aria-label="Выбрать все товары на странице"
                            />
                            <span className="text-[10px] uppercase text-muted-foreground">Все на странице</span>
                          </div>
                        </th>
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
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={(checked) => toggleOne(item.id, checked)}
                              aria-label={`Выбрать товар ${item.name}`}
                            />
                          </td>
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
                                variant="outline"
                                onClick={() => handleDuplicate(item)}
                                aria-label="Дублировать товар"
                                title="Дублировать товар"
                              >
                                <Copy className="size-4" />
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
                        <div className="flex items-start justify-between gap-3">
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
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={(checked) => toggleOne(item.id, checked)}
                            aria-label={`Выбрать товар ${item.name}`}
                          />
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
                            variant="outline"
                            onClick={() => handleDuplicate(item)}
                            aria-label="Дублировать товар"
                            title="Дублировать товар"
                          >
                            <Copy className="size-4" />
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
                  <button
                    type="button"
                    className="group relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 text-xs font-medium text-muted-foreground transition hover:border-brandTint/60 hover:bg-brandTint/10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {form.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.imageUrl}
                        alt="Превью"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                    <span className="relative z-10">
                      {form.imageUrl ? 'Нажмите, чтобы заменить' : 'Нажмите или перетащите файл'}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      setFormFile(event.target.files?.[0] ?? null);
                      setUploadNotice(null);
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={formUploading}
                    >
                      <Upload className="size-4" />
                      Выбрать файл
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUpload}
                      disabled={!formFile || formUploading}
                    >
                      <Upload className="size-4" />
                      {formUploading ? 'Загрузка...' : 'Загрузить'}
                    </Button>
                  </div>
                  {formFile ? (
                    <div className="text-xs text-muted-foreground">Файл: {formFile.name}</div>
                  ) : null}
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

      {dialogOpen && isDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/20 bg-white/90 px-6 py-4 text-sm font-semibold text-foreground shadow-xl">
            Drop to upload
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
