'use client';

import { Fragment, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, Download, Eye, EyeOff, FileDown, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toastError } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminModal,
  AdminPageShell,
  AdminResponsiveList,
  AdminToolbar,
} from './admin-ui';

type TaxonomyReport = {
  totals: { categories: number; subcategories: number };
  created: { categories: number; subcategories: number };
  updated: { categories: number; subcategories: number };
  skipped: { categories: number; subcategories: number };
};

type TaxonomyResponse = {
  ok: boolean;
  preview?: boolean;
  warnings?: string[];
  errors?: string[];
  report: TaxonomyReport;
  message?: string;
};

type SubcategoryRow = {
  id: string;
  slug: string | null;
  name: string;
  sortOrder: number;
  isActive: boolean;
  categoryId: string;
};

type CategoryRow = {
  id: string;
  slug: string | null;
  name: string;
  sortOrder: number;
  isActive: boolean;
  subcategories: SubcategoryRow[];
};

type SelectableItem = {
  key: string;
  type: 'category' | 'subcategory';
  id: string;
  name: string;
};

const SAMPLE_CSV = `category_ru;subcategory_ru\nСМЕСИТЕЛИ И КОМПЛЕКТУЮЩИЕ;джойстики\nСМЕСИТЕЛИ И КОМПЛЕКТУЮЩИЕ;картриджи\nСИФОНЫ И КОМПЛЕКТУЮЩИЕ;трапы\nСИФОНЫ И КОМПЛЕКТУЮЩИЕ;сетки\n`;

const downloadSampleCsv = () => {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'taxonomy-sample.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function TaxonomyAdmin() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TaxonomyResponse | null>(null);
  const [result, setResult] = useState<TaxonomyResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    slug: '',
    sortOrder: '',
    isActive: true,
  });
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [subcategoryForm, setSubcategoryForm] = useState({
    id: '',
    categoryId: '',
    name: '',
    slug: '',
    sortOrder: '',
    isActive: true,
  });
  const [subcategoryFormError, setSubcategoryFormError] = useState<string | null>(null);
  const [subcategorySubmitting, setSubcategorySubmitting] = useState(false);
  const categoryActiveId = useId();
  const subcategoryActiveId = useId();
  const categoryFormId = useId();
  const subcategoryFormId = useId();

  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const makeKey = useCallback((type: 'category' | 'subcategory', id: string) => `${type}:${id}`, []);

  const loadTaxonomy = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const response = await fetch('/api/admin/taxonomy?includeInactive=1');
      const payload = (await response.json().catch(() => null)) as { categories?: CategoryRow[] } | null;
      if (!response.ok) {
        setListError('Не удалось загрузить категории.');
        return;
      }
      setCategories(payload?.categories ?? []);
    } catch {
      setListError('Не удалось загрузить категории.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadTaxonomy();
  }, [loadTaxonomy]);

  useEffect(() => {
    if (selectedKeys.size === 0) return;
    const available = new Set<string>();
    for (const category of categories) {
      available.add(makeKey('category', category.id));
      for (const subcategory of category.subcategories) {
        available.add(makeKey('subcategory', subcategory.id));
      }
    }
    let changed = false;
    const next = new Set<string>();
    for (const key of selectedKeys) {
      if (available.has(key)) {
        next.add(key);
      } else {
        changed = true;
      }
    }
    if (changed) {
      setSelectedKeys(next);
    }
  }, [categories, makeKey, selectedKeys]);

  const resetCategoryForm = () => {
    setCategoryForm({ id: '', name: '', slug: '', sortOrder: '', isActive: true });
    setCategoryFormError(null);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({ id: '', categoryId: '', name: '', slug: '', sortOrder: '', isActive: true });
    setSubcategoryFormError(null);
  };

  const openCategoryDialog = (category?: CategoryRow) => {
    if (category) {
      setCategoryForm({
        id: category.id,
        name: category.name,
        slug: category.slug ?? '',
        sortOrder: category.sortOrder.toString(),
        isActive: category.isActive,
      });
    } else {
      resetCategoryForm();
    }
    setCategoryDialogOpen(true);
  };

  const openSubcategoryDialog = (subcategory?: SubcategoryRow, categoryId?: string) => {
    if (subcategory) {
      setSubcategoryForm({
        id: subcategory.id,
        categoryId: subcategory.categoryId,
        name: subcategory.name,
        slug: subcategory.slug ?? '',
        sortOrder: subcategory.sortOrder.toString(),
        isActive: subcategory.isActive,
      });
    } else {
      resetSubcategoryForm();
      if (categoryId) {
        setSubcategoryForm((prev) => ({ ...prev, categoryId }));
      }
    }
    setSubcategoryDialogOpen(true);
  };

  const runPreview = async () => {
    if (!file) return;
    setIsPreviewing(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/taxonomy/import-xlsx?mode=preview', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as TaxonomyResponse | null;
      if (!response.ok || !payload) {
        setError('Не удалось выполнить предпросмотр файла.');
        return;
      }
      setPreview(payload);
    } catch {
      setError('Не удалось выполнить предпросмотр файла.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const runImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/taxonomy/import-xlsx', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as TaxonomyResponse | null;
      if (!response.ok || !payload) {
        setError('Не удалось импортировать категории.');
        return;
      }
      setResult(payload);
      await loadTaxonomy();
    } catch {
      setError('Не удалось импортировать категории.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryFormError(null);
    setCategorySubmitting(true);

    const parsedSortOrder = Number(categoryForm.sortOrder);
    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug || null,
      sortOrder: Number.isFinite(parsedSortOrder) ? parsedSortOrder : undefined,
      isActive: categoryForm.isActive,
    };

    try {
      const response = await fetch(
        categoryForm.id ? `/api/admin/taxonomy/categories/${categoryForm.id}` : '/api/admin/taxonomy/categories',
        {
          method: categoryForm.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const resultPayload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setCategoryFormError('Не удалось сохранить категорию.');
        return;
      }
      setCategoryDialogOpen(false);
      resetCategoryForm();
      await loadTaxonomy();
    } catch {
      setCategoryFormError('Не удалось сохранить категорию.');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleSaveSubcategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubcategoryFormError(null);
    setSubcategorySubmitting(true);

    if (!subcategoryForm.categoryId) {
      setSubcategoryFormError('Выберите категорию.');
      setSubcategorySubmitting(false);
      return;
    }

    const parsedSortOrder = Number(subcategoryForm.sortOrder);
    const payload = {
      name: subcategoryForm.name,
      categoryId: subcategoryForm.categoryId,
      slug: subcategoryForm.slug || null,
      sortOrder: Number.isFinite(parsedSortOrder) ? parsedSortOrder : undefined,
      isActive: subcategoryForm.isActive,
    };

    try {
      const response = await fetch(
        subcategoryForm.id
          ? `/api/admin/taxonomy/subcategories/${subcategoryForm.id}`
          : '/api/admin/taxonomy/subcategories',
        {
          method: subcategoryForm.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const resultPayload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setSubcategoryFormError('Не удалось сохранить подкатегорию.');
        return;
      }
      setSubcategoryDialogOpen(false);
      resetSubcategoryForm();
      await loadTaxonomy();
    } catch {
      setSubcategoryFormError('Не удалось сохранить подкатегорию.');
    } finally {
      setSubcategorySubmitting(false);
    }
  };

  const handleToggleCategory = async (category: CategoryRow) => {
    try {
      await fetch(`/api/admin/taxonomy/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      await loadTaxonomy();
    } catch {
      await loadTaxonomy();
    }
  };

  const handleToggleSubcategory = async (subcategory: SubcategoryRow) => {
    try {
      await fetch(`/api/admin/taxonomy/subcategories/${subcategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !subcategory.isActive }),
      });
      await loadTaxonomy();
    } catch {
      await loadTaxonomy();
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/admin/taxonomy/categories/${categoryId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        return payload?.message ?? 'Не удалось удалить категорию.';
      }
      return null;
    } catch {
      return 'Не удалось удалить категорию.';
    }
  };

  const deleteSubcategory = async (subcategoryId: string) => {
    try {
      const response = await fetch(`/api/admin/taxonomy/subcategories/${subcategoryId}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        return payload?.message ?? 'Не удалось удалить подкатегорию.';
      }
      return null;
    } catch {
      return 'Не удалось удалить подкатегорию.';
    }
  };

  const handleDeleteCategory = async (category: CategoryRow) => {
    if (!confirm(`Удалить категорию «${category.name}»? Это действие нельзя отменить.`)) return;
    const errorMessage = await deleteCategory(category.id);
    if (errorMessage) {
      toastError(errorMessage);
      return;
    }
    setSelectedKeys((prev) => {
      if (!prev.has(makeKey('category', category.id))) return prev;
      const next = new Set(prev);
      next.delete(makeKey('category', category.id));
      return next;
    });
    await loadTaxonomy();
  };

  const handleDeleteSubcategory = async (subcategory: SubcategoryRow) => {
    if (!confirm(`Удалить подкатегорию «${subcategory.name}»? Это действие нельзя отменить.`)) return;
    const errorMessage = await deleteSubcategory(subcategory.id);
    if (errorMessage) {
      toastError(errorMessage);
      return;
    }
    setSelectedKeys((prev) => {
      if (!prev.has(makeKey('subcategory', subcategory.id))) return prev;
      const next = new Set(prev);
      next.delete(makeKey('subcategory', subcategory.id));
      return next;
    });
    await loadTaxonomy();
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const selectableItems = useMemo<SelectableItem[]>(
    () =>
      categories.flatMap((category) => {
        const items: SelectableItem[] = [
          {
            key: makeKey('category', category.id),
            type: 'category',
            id: category.id,
            name: category.name,
          },
        ];
        for (const subcategory of category.subcategories) {
          items.push({
            key: makeKey('subcategory', subcategory.id),
            type: 'subcategory',
            id: subcategory.id,
            name: subcategory.name,
          });
        }
        return items;
      }),
    [categories, makeKey]
  );

  const selectedCount = selectedKeys.size;
  const allSelected =
    selectableItems.length > 0 && selectableItems.every((item) => selectedKeys.has(item.key));
  const someSelected = selectableItems.some((item) => selectedKeys.has(item.key));

  const toggleAll = (checked: boolean | 'indeterminate') => {
    const shouldSelect = checked === true;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const item of selectableItems) {
        if (shouldSelect) {
          next.add(item.key);
        } else {
          next.delete(item.key);
        }
      }
      return next;
    });
  };

  const toggleKey = (key: string, checked: boolean | 'indeterminate') => {
    const shouldSelect = checked === true;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (shouldSelect) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) return;
    const count = selectedKeys.size;
    if (!confirm(`Удалить выбранные элементы (${count})? Это действие нельзя отменить.`)) return;
    setBulkDeleting(true);

    const selectedItems = selectableItems.filter((item) => selectedKeys.has(item.key));
    const subcategories = selectedItems.filter((item) => item.type === 'subcategory');
    const categoriesToDelete = selectedItems.filter((item) => item.type === 'category');
    const failures: string[] = [];
    const remaining = new Set(selectedKeys);

    for (const item of subcategories) {
      const errorMessage = await deleteSubcategory(item.id);
      if (errorMessage) {
        failures.push(errorMessage);
      } else {
        remaining.delete(item.key);
      }
    }

    for (const item of categoriesToDelete) {
      const errorMessage = await deleteCategory(item.id);
      if (errorMessage) {
        failures.push(errorMessage);
      } else {
        remaining.delete(item.key);
      }
    }

    setSelectedKeys(remaining);
    await loadTaxonomy();
    setBulkDeleting(false);

    if (failures.length > 0) {
      toastError(`Не удалось удалить ${failures.length} элемент(ов).`, { description: failures[0] });
    }
  };

  const report = result ?? preview;

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, name: category.name })),
    [categories]
  );

  return (
    <AdminPageShell
      title="Таксономия"
      subtitle="Загрузите файл таксономии или управляйте категориями вручную."
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Загрузка файла таксономии</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              setPreview(null);
              setResult(null);
              setError(null);
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button onClick={runPreview} disabled={!file || isPreviewing}>
              <Eye className="size-4" />
              {isPreviewing ? 'Предпросмотр...' : 'Предпросмотр'}
            </Button>
            <Button onClick={runImport} disabled={!file || isImporting}>
              <Upload className="size-4" />
              {isImporting ? 'Импорт...' : 'Импортировать'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/api/admin/taxonomy/export';
              }}
            >
              <Download className="size-4" />
              Скачать экспорт
            </Button>
            <Button variant="outline" onClick={downloadSampleCsv}>
              <FileDown className="size-4" />
              Скачать пример CSV
            </Button>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">
              {report.preview ? 'Итоги предпросмотра' : 'Итоги импорта'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">Категорий: {report.report.totals.categories}</Badge>
              <Badge variant="secondary">Подкатегорий: {report.report.totals.subcategories}</Badge>
            </div>
            {!report.preview && (
              <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <div>Создано категорий: {report.report.created.categories}</div>
                <div>Обновлено категорий: {report.report.updated.categories}</div>
                <div>Пропущено категорий: {report.report.skipped.categories}</div>
                <div>Создано подкатегорий: {report.report.created.subcategories}</div>
                <div>Обновлено подкатегорий: {report.report.updated.subcategories}</div>
                <div>Пропущено подкатегорий: {report.report.skipped.subcategories}</div>
              </div>
            )}
            {(report.warnings?.length ?? 0) > 0 && (
              <div className="space-y-1 text-xs text-amber-900">
                {report.warnings?.map((warning, idx) => (
                  <div key={`warn-${idx}`}>{warning}</div>
                ))}
              </div>
            )}
            {(report.errors?.length ?? 0) > 0 && (
              <div className="space-y-1 text-xs text-destructive">
                {report.errors?.map((err, idx) => (
                  <div key={`err-${idx}`}>{err}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Ручное управление</CardTitle>
            <p className="text-xs text-muted-foreground">
              Добавляйте, редактируйте или отключайте категории и подкатегории.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminToolbar
            actions={
              <>
                <Button variant="outline" onClick={() => openCategoryDialog()}>
                  <Plus className="size-4" />
                  Добавить категорию
                </Button>
                <Button variant="outline" onClick={() => openSubcategoryDialog()}>
                  <Plus className="size-4" />
                  Добавить подкатегорию
                </Button>
              </>
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

          {!isLoadingList && categories.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground md:hidden">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={toggleAll}
                aria-label="Выбрать все категории и подкатегории на странице"
              />
              <span>Выбрать все на странице</span>
            </div>
          )}
          {isLoadingList ? (
            <AdminListSkeleton rows={4} />
          ) : categories.length === 0 ? (
            <AdminEmptyState
              title="Категорий пока нет"
              description="Создайте первую категорию для каталога."
              action={
                <Button onClick={() => openCategoryDialog()}>
                  <Plus className="size-4" />
                  Добавить категорию
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
                              aria-label="Выбрать все категории и подкатегории на странице"
                            />
                            <span className="text-[10px] uppercase text-muted-foreground">Все на странице</span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left">Название</th>
                        <th className="px-4 py-3 text-left">Слаг</th>
                        <th className="px-4 py-3 text-left">Порядок</th>
                        <th className="px-4 py-3 text-left">Статус</th>
                        <th className="px-4 py-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {categories.map((category) => (
                        <Fragment key={category.id}>
                          <tr className={cn('bg-muted/20', !category.isActive && 'opacity-60')}>
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={selectedKeys.has(makeKey('category', category.id))}
                                onCheckedChange={(checked) =>
                                  toggleKey(makeKey('category', category.id), checked)
                                }
                                aria-label={`Выбрать категорию ${category.name}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{category.name}</div>
                              <div className="text-xs text-muted-foreground">Категория</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {category.slug ? category.slug : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{category.sortOrder}</td>
                            <td className="px-4 py-3">
                              <Badge variant={category.isActive ? 'secondary' : 'outline'}>
                                {category.isActive ? 'Активна' : 'Неактивна'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <IconButton
                                  size="icon-sm"
                                  variant="outline"
                                  onClick={() => openCategoryDialog(category)}
                                  aria-label="Редактировать категорию"
                                  title="Редактировать категорию"
                                >
                                  <Pencil className="size-4" />
                                </IconButton>
                                <IconButton
                                  size="icon-sm"
                                  variant="secondary"
                                  onClick={() => handleToggleCategory(category)}
                                  aria-label={category.isActive ? 'Отключить категорию' : 'Включить категорию'}
                                  title={category.isActive ? 'Отключить категорию' : 'Включить категорию'}
                                >
                                  {category.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </IconButton>
                                <IconButton
                                  size="icon-sm"
                                  variant="ghost"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDeleteCategory(category)}
                                  aria-label="Удалить категорию"
                                  title="Удалить категорию"
                                >
                                  <Trash2 className="size-4" />
                                </IconButton>
                                <IconButton
                                  size="icon-sm"
                                  variant="outline"
                                  onClick={() => openSubcategoryDialog(undefined, category.id)}
                                  aria-label="Добавить подкатегорию"
                                  title="Добавить подкатегорию"
                                >
                                  <Plus className="size-4" />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                          {category.subcategories.map((subcategory) => (
                            <tr key={subcategory.id} className={cn(!subcategory.isActive && 'opacity-60')}>
                              <td className="px-4 py-3">
                                <Checkbox
                                  checked={selectedKeys.has(makeKey('subcategory', subcategory.id))}
                                  onCheckedChange={(checked) =>
                                    toggleKey(makeKey('subcategory', subcategory.id), checked)
                                  }
                                  aria-label={`Выбрать подкатегорию ${subcategory.name}`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-2 pl-6">
                                  <span className="mt-2 block size-2 rounded-full bg-muted-foreground/40" />
                                  <div>
                                    <div className="font-medium text-foreground">{subcategory.name}</div>
                                    <div className="text-xs text-muted-foreground">Подкатегория</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {subcategory.slug ? subcategory.slug : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{subcategory.sortOrder}</td>
                              <td className="px-4 py-3">
                                <Badge variant={subcategory.isActive ? 'secondary' : 'outline'}>
                                  {subcategory.isActive ? 'Активна' : 'Неактивна'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <IconButton
                                    size="icon-sm"
                                    variant="outline"
                                    onClick={() => openSubcategoryDialog(subcategory)}
                                    aria-label="Редактировать подкатегорию"
                                    title="Редактировать подкатегорию"
                                  >
                                    <Pencil className="size-4" />
                                  </IconButton>
                                  <IconButton
                                    size="icon-sm"
                                    variant="secondary"
                                    onClick={() => handleToggleSubcategory(subcategory)}
                                    aria-label={subcategory.isActive ? 'Отключить подкатегорию' : 'Включить подкатегорию'}
                                    title={subcategory.isActive ? 'Отключить подкатегорию' : 'Включить подкатегорию'}
                                  >
                                    {subcategory.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                  </IconButton>
                                  <IconButton
                                    size="icon-sm"
                                    variant="ghost"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => handleDeleteSubcategory(subcategory)}
                                    aria-label="Удалить подкатегорию"
                                    title="Удалить подкатегорию"
                                  >
                                    <Trash2 className="size-4" />
                                  </IconButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
              mobile={
                <div className="space-y-3">
                  {categories.map((category) => {
                    const isExpanded = expandedCategoryIds.includes(category.id);
                    return (
                      <div
                        key={category.id}
                        className={cn(
                          'rounded-xl border border-border/60 bg-white p-4 shadow-sm',
                          !category.isActive && 'opacity-60'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-foreground">{category.name}</div>
                          <div className="text-xs text-muted-foreground">
                              {category.slug ? `Слаг: ${category.slug}` : 'Слаг: —'} · Порядок: {category.sortOrder}
                          </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedKeys.has(makeKey('category', category.id))}
                              onCheckedChange={(checked) =>
                                toggleKey(makeKey('category', category.id), checked)
                              }
                              aria-label={`Выбрать категорию ${category.name}`}
                            />
                            <Badge variant={category.isActive ? 'secondary' : 'outline'}>
                              {category.isActive ? 'Активна' : 'Неактивна'}
                            </Badge>
                            <IconButton
                              size="icon-sm"
                              variant="outline"
                              onClick={() => toggleExpanded(category.id)}
                              aria-label={isExpanded ? 'Скрыть подкатегории' : 'Показать подкатегории'}
                              title={isExpanded ? 'Скрыть подкатегории' : 'Показать подкатегории'}
                            >
                              <ChevronDown className={cn('size-4 transition-transform', isExpanded && 'rotate-180')} />
                            </IconButton>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <IconButton
                            size="icon-sm"
                            variant="outline"
                            onClick={() => openCategoryDialog(category)}
                            aria-label="Редактировать категорию"
                            title="Редактировать категорию"
                          >
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton
                            size="icon-sm"
                            variant="secondary"
                            onClick={() => handleToggleCategory(category)}
                            aria-label={category.isActive ? 'Отключить категорию' : 'Включить категорию'}
                            title={category.isActive ? 'Отключить категорию' : 'Включить категорию'}
                          >
                            {category.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </IconButton>
                          <IconButton
                            size="icon-sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteCategory(category)}
                            aria-label="Удалить категорию"
                            title="Удалить категорию"
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                          <IconButton
                            size="icon-sm"
                            variant="outline"
                            onClick={() => openSubcategoryDialog(undefined, category.id)}
                            aria-label="Добавить подкатегорию"
                            title="Добавить подкатегорию"
                          >
                            <Plus className="size-4" />
                          </IconButton>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                            {category.subcategories.length === 0 ? (
                              <div className="text-xs text-muted-foreground">Подкатегорий пока нет.</div>
                            ) : (
                              category.subcategories.map((subcategory) => (
                                <div
                                  key={subcategory.id}
                                  className={cn(
                                    'rounded-lg border border-border/60 bg-muted/10 p-3',
                                    !subcategory.isActive && 'opacity-60'
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium text-foreground">{subcategory.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {subcategory.slug ? `Слаг: ${subcategory.slug}` : 'Слаг: —'} · Порядок: {subcategory.sortOrder}
                                      </div>
                                    </div>
                                    <Checkbox
                                      checked={selectedKeys.has(makeKey('subcategory', subcategory.id))}
                                      onCheckedChange={(checked) =>
                                        toggleKey(makeKey('subcategory', subcategory.id), checked)
                                      }
                                      aria-label={`Выбрать подкатегорию ${subcategory.name}`}
                                    />
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge variant={subcategory.isActive ? 'secondary' : 'outline'}>
                                      {subcategory.isActive ? 'Активна' : 'Неактивна'}
                                    </Badge>
                                    <IconButton
                                      size="icon-sm"
                                      variant="outline"
                                      onClick={() => openSubcategoryDialog(subcategory)}
                                      aria-label="Редактировать подкатегорию"
                                      title="Редактировать подкатегорию"
                                    >
                                      <Pencil className="size-4" />
                                    </IconButton>
                                    <IconButton
                                      size="icon-sm"
                                      variant="secondary"
                                      onClick={() => handleToggleSubcategory(subcategory)}
                                      aria-label={subcategory.isActive ? 'Отключить подкатегорию' : 'Включить подкатегорию'}
                                      title={subcategory.isActive ? 'Отключить подкатегорию' : 'Включить подкатегорию'}
                                    >
                                      {subcategory.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </IconButton>
                                    <IconButton
                                      size="icon-sm"
                                      variant="ghost"
                                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleDeleteSubcategory(subcategory)}
                                      aria-label="Удалить подкатегорию"
                                      title="Удалить подкатегорию"
                                    >
                                      <Trash2 className="size-4" />
                                    </IconButton>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      <AdminModal
        open={categoryDialogOpen}
        onOpenChange={(open) => {
          setCategoryDialogOpen(open);
          if (!open) resetCategoryForm();
        }}
        title={categoryForm.id ? 'Редактировать категорию' : 'Добавить категорию'}
        description="Название (RU) обязательно."
        size="md"
        footer={
          <>
            <Button type="submit" form={categoryFormId} disabled={categorySubmitting}>
              {categorySubmitting ? 'Сохранение...' : categoryForm.id ? 'Сохранить категорию' : 'Создать категорию'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Отмена
            </Button>
          </>
        }
      >
        <form id={categoryFormId} className="space-y-4" onSubmit={handleSaveCategory}>
          <Field label="Название (RU)" required>
            <Input
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </Field>
          <Field label="Слаг (необязательно)">
            <Input
              value={categoryForm.slug}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
          </Field>
          <Field label="Порядок сортировки">
            <Input
              inputMode="numeric"
              value={categoryForm.sortOrder}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              placeholder="Авто"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground" htmlFor={categoryActiveId}>
            <Checkbox
              id={categoryActiveId}
              checked={categoryForm.isActive}
              onCheckedChange={(checked) =>
                setCategoryForm((prev) => ({ ...prev, isActive: checked === true }))
              }
            />
            Активна
          </label>
          {categoryFormError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {categoryFormError}
            </div>
          )}
        </form>
      </AdminModal>

      <AdminModal
        open={subcategoryDialogOpen}
        onOpenChange={(open) => {
          setSubcategoryDialogOpen(open);
          if (!open) resetSubcategoryForm();
        }}
        title={subcategoryForm.id ? 'Редактировать подкатегорию' : 'Добавить подкатегорию'}
        description="Название (RU) и категория обязательны."
        size="md"
        footer={
          <>
            <Button type="submit" form={subcategoryFormId} disabled={subcategorySubmitting}>
              {subcategorySubmitting ? 'Сохранение...' : subcategoryForm.id ? 'Сохранить подкатегорию' : 'Создать подкатегорию'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSubcategoryDialogOpen(false)}>
              Отмена
            </Button>
          </>
        }
      >
        <form id={subcategoryFormId} className="space-y-4" onSubmit={handleSaveSubcategory}>
          <Field label="Категория" required>
            <Select
              value={subcategoryForm.categoryId}
              onValueChange={(value) => setSubcategoryForm((prev) => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Название (RU)" required>
            <Input
              value={subcategoryForm.name}
              onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </Field>
          <Field label="Слаг (необязательно)">
            <Input
              value={subcategoryForm.slug}
              onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
          </Field>
          <Field label="Порядок сортировки">
            <Input
              inputMode="numeric"
              value={subcategoryForm.sortOrder}
              onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              placeholder="Авто"
            />
          </Field>
          <label
            className="flex items-center gap-2 text-sm font-medium text-foreground"
            htmlFor={subcategoryActiveId}
          >
            <Checkbox
              id={subcategoryActiveId}
              checked={subcategoryForm.isActive}
              onCheckedChange={(checked) =>
                setSubcategoryForm((prev) => ({ ...prev, isActive: checked === true }))
              }
            />
            Активна
          </label>
          {subcategoryFormError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {subcategoryFormError}
            </div>
          )}
        </form>
      </AdminModal>
    </AdminPageShell>
  );
}
