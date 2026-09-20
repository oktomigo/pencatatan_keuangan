// categories.js - daftar dan CRUD kategori berbasis API.

import { apiFetch, ApiError } from './api.js';
import {
  openModal,
  openBottomSheet,
  openConfirmDialog,
  closeModal,
  closeBottomSheet,
} from './modal.js';
import { showToast } from './toast.js';

let categories = [];
let activeType = 'expense';
let pageRoot;
let categoryList;
let emptyState;
let errorState;

export async function init() {
  createPageShell();
  bindPageEvents();
  renderLoading();
  await loadCategories();
}

function createPageShell() {
  pageRoot = document.getElementById('categories-page');
  if (!pageRoot) {
    pageRoot = document.createElement('section');
    pageRoot.id = 'categories-page';
    pageRoot.setAttribute('aria-labelledby', 'categories-title');
    pageRoot.style.cssText = 'max-width:720px;margin:0 auto;padding:var(--space-6) var(--space-4) var(--space-20);';
    pageRoot.innerHTML = `
    <header style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-5)">
      <div>
        <p style="color:var(--color-text-secondary);font-size:var(--text-body-md);margin-bottom:var(--space-1)">Pengaturan pencatatan</p>
        <h1 id="categories-title" style="font-size:var(--text-heading-1);font-weight:700">Kategori</h1>
      </div>
      <button id="btn-add-category" type="button" style="min-height:44px;padding:0 var(--space-4);border-radius:var(--rounded-md);background:var(--color-primary-500);color:var(--color-text-inverse);font-weight:600">+ Tambah</button>
    </header>
    <div id="category-tabs" role="tablist" aria-label="Jenis kategori" style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4)">
      <button id="tab-expense" type="button" role="tab" aria-selected="true" data-type="expense" style="flex:1;min-height:44px;border-radius:var(--rounded-md);font-weight:600">Pengeluaran</button>
      <button id="tab-income" type="button" role="tab" aria-selected="false" data-type="income" style="flex:1;min-height:44px;border-radius:var(--rounded-md);font-weight:600">Pemasukan</button>
    </div>
    <div id="categories-error" class="hidden" role="alert" style="padding:var(--space-4);margin-bottom:var(--space-4);border:1px solid var(--color-danger-500);border-radius:var(--rounded-md);background:var(--color-danger-50);color:var(--color-danger-700)"></div>
    <div id="categories-empty" class="hidden" role="status" style="padding:var(--space-6);margin-bottom:var(--space-4);text-align:center;border:1px dashed var(--color-border-medium);border-radius:var(--rounded-lg);color:var(--color-text-secondary)">Belum ada kategori custom.</div>
    <div id="categories-list" aria-live="polite"></div>
    `;
    document.getElementById('page-content')?.appendChild(pageRoot);
  }

  categoryList = pageRoot.querySelector('#categories-list');
  emptyState = pageRoot.querySelector('#categories-empty');
  errorState = pageRoot.querySelector('#categories-error');
  styleTab(pageRoot.querySelector('#tab-expense'), true);
  styleTab(pageRoot.querySelector('#tab-income'), false);
}

function bindPageEvents() {
  pageRoot.querySelector('#btn-add-category')?.addEventListener('click', () => openCategoryForm());
  pageRoot.querySelector('#tab-expense')?.addEventListener('click', () => setActiveType('expense'));
  pageRoot.querySelector('#tab-income')?.addEventListener('click', () => setActiveType('income'));
}

function setActiveType(type) {
  activeType = type;
  const expenseTab = pageRoot.querySelector('#tab-expense');
  const incomeTab = pageRoot.querySelector('#tab-income');
  styleTab(expenseTab, type === 'expense');
  styleTab(incomeTab, type === 'income');
  expenseTab?.setAttribute('aria-selected', String(type === 'expense'));
  incomeTab?.setAttribute('aria-selected', String(type === 'income'));
  renderCategories();
}

function styleTab(tab, active) {
  if (!tab) return;
  tab.classList.toggle('active', active);
  tab.style.background = active ? 'var(--color-primary-500)' : 'var(--color-surface-raised)';
  tab.style.color = active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)';
}

async function loadCategories(showLoadingState = true) {
  try {
    if (showLoadingState) renderLoading();
    const data = await apiFetch('/api/categories');
    categories = Array.isArray(data) ? data : [];
    clearError();
    renderCategories();
  } catch (error) {
    renderError(error);
  }
}

function renderLoading() {
  if (!categoryList) return;
  emptyState?.classList.add('hidden');
  errorState?.classList.add('hidden');
  categoryList.innerHTML = '';
  for (let index = 0; index < 4; index += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    skeleton.style.cssText = 'height:72px;margin-bottom:var(--space-3);';
    categoryList.appendChild(skeleton);
  }
  categoryList.setAttribute('aria-busy', 'true');
}

function renderCategories() {
  if (!categoryList) return;
  categoryList.setAttribute('aria-busy', 'false');
  categoryList.innerHTML = '';

  const visibleCategories = categories.filter(category => category.type === activeType);
  const customCategories = visibleCategories.filter(category => !category.is_default);
  emptyState?.classList.toggle('hidden', customCategories.length > 0);

  if (!visibleCategories.length) {
    const noDefaultState = document.createElement('p');
    noDefaultState.textContent = 'Belum ada kategori untuk jenis ini.';
    noDefaultState.style.cssText = 'padding:var(--space-6);text-align:center;color:var(--color-text-secondary);';
    categoryList.appendChild(noDefaultState);
    return;
  }

  visibleCategories
    .slice()
    .sort((left, right) => Number(right.is_default) - Number(left.is_default) || left.name.localeCompare(right.name, 'id'))
    .forEach(category => categoryList.appendChild(createCategoryItem(category)));
}

function createCategoryItem(category) {
  const item = document.createElement('article');
  item.className = 'category-item';
  item.dataset.catId = category.id;
  item.dataset.catName = category.name;
  item.dataset.catType = category.type;
  item.dataset.catDefault = String(Boolean(category.is_default));
  item.style.cssText = 'display:flex;align-items:center;gap:var(--space-3);padding:var(--space-4);margin-bottom:var(--space-3);background:var(--color-surface-card);border:1px solid var(--color-border-light);border-radius:var(--rounded-lg);box-shadow:var(--shadow-sm);';

  const icon = document.createElement('span');
  icon.textContent = category.icon || '📦';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.cssText = `display:grid;place-items:center;width:40px;height:40px;border-radius:var(--rounded-full);background:${category.color || 'var(--color-primary-50)'};font-size:1.25rem;`;

  const content = document.createElement('div');
  content.style.cssText = 'min-width:0;flex:1;';
  const name = document.createElement('strong');
  name.className = 'cat-name';
  name.textContent = category.name;
  const type = document.createElement('p');
  type.textContent = category.is_default ? 'Kategori bawaan' : 'Kategori custom';
  type.style.cssText = 'margin-top:var(--space-1);font-size:var(--text-caption);color:var(--color-text-secondary);';
  content.append(name, type);

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:var(--space-1);';
  if (!category.is_default) {
    actions.append(createActionButton('Edit', 'edit', () => openCategoryForm(category)));
    actions.append(createActionButton('Hapus', 'delete', () => requestDelete(category)));
  }

  item.append(icon, content, actions);
  return item;
}

function createActionButton(label, action, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn-${action}-cat`;
  button.setAttribute('aria-label', `${label} kategori`);
  button.textContent = action === 'edit' ? 'Edit' : 'Hapus';
  button.style.cssText = `min-height:44px;padding:0 var(--space-2);border-radius:var(--rounded-md);color:${action === 'delete' ? 'var(--color-danger-700)' : 'var(--color-primary-700)'};font-size:var(--text-body-md);`;
  button.addEventListener('click', event => {
    event.stopPropagation();
    handler();
  });
  return button;
}

function openCategoryForm(category = null) {
  const isEdit = Boolean(category);
  const type = category?.type || activeType;
  const formHTML = `
    <form id="category-form" novalidate>
      <label for="cat-name-input" style="display:block;margin-bottom:var(--space-2);font-weight:600">Nama kategori</label>
      <input id="cat-name-input" name="name" type="text" maxlength="50" required value="${escapeHtml(category?.name || '')}" style="width:100%;min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md);" />
      <p id="cat-name-error" class="hidden" role="alert" style="margin-top:var(--space-2);color:var(--color-danger-700);font-size:var(--text-body-md)"></p>
      <div id="cat-type-toggle" style="${isEdit ? 'display:none;' : 'display:flex;gap:var(--space-2);margin-top:var(--space-4);'}">
        <button type="button" data-type="expense" style="flex:1;min-height:44px;border-radius:var(--rounded-md);">Pengeluaran</button>
        <button type="button" data-type="income" style="flex:1;min-height:44px;border-radius:var(--rounded-md);">Pemasukan</button>
      </div>
      <button id="category-submit" type="submit" style="width:100%;min-height:44px;margin-top:var(--space-5);border-radius:var(--rounded-md);background:var(--color-primary-500);color:var(--color-text-inverse);font-weight:600">${isEdit ? 'Simpan perubahan' : 'Tambah kategori'}</button>
    </form>`;

  const isMobile = window.innerWidth < 768;
  (isMobile ? openBottomSheet : openModal)({ title: isEdit ? 'Edit Kategori' : 'Tambah Kategori', contentHTML: formHTML });

  setTimeout(() => {
    const form = document.getElementById('category-form');
    if (!form) return;
    const nameInput = form.querySelector('#cat-name-input');
    const nameError = form.querySelector('#cat-name-error');
    const typeButtons = [...form.querySelectorAll('#cat-type-toggle [data-type]')];
    let selectedType = type;

    typeButtons.forEach(button => {
      styleFormTypeButton(button, button.dataset.type === selectedType);
      button.addEventListener('click', () => {
        selectedType = button.dataset.type;
        typeButtons.forEach(item => styleFormTypeButton(item, item.dataset.type === selectedType));
      });
    });

    nameInput.addEventListener('input', () => clearFieldError(nameInput, nameError));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        showFieldError(nameInput, nameError, 'Nama kategori wajib diisi');
        return;
      }
      if (name.length > 50) {
        showFieldError(nameInput, nameError, 'Nama kategori maksimal 50 karakter');
        return;
      }

      const duplicate = categories.some(item => item.name.toLowerCase() === name.toLowerCase()
        && item.type === selectedType && (!isEdit || item.id !== category.id));
      if (duplicate) {
        showFieldError(nameInput, nameError, 'Nama kategori sudah digunakan');
        return;
      }

      const submit = form.querySelector('#category-submit');
      submit.disabled = true;
      submit.textContent = 'Menyimpan...';
      try {
        const path = isEdit ? `/api/categories/${encodeURIComponent(category.id)}` : '/api/categories';
        const body = isEdit ? { name } : { name, type: selectedType };
        const saved = await apiFetch(path, { method: isEdit ? 'PUT' : 'POST', body });
        const savedCategory = saved && !Array.isArray(saved) ? saved : null;
        if (savedCategory?.id) {
          categories = isEdit
            ? categories.map(item => item.id === savedCategory.id ? savedCategory : item)
            : [...categories, savedCategory];
        } else {
          await loadCategories(false);
        }
        closeForm(isMobile);
        renderCategories();
        showToast(isEdit ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan', 'success');
      } catch (error) {
        if (error instanceof ApiError && (error.status === 409 || error.code === 'CONFLICT')) {
          showFieldError(nameInput, nameError, 'Nama kategori sudah digunakan');
        } else {
          showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error');
        }
        submit.disabled = false;
        submit.textContent = isEdit ? 'Simpan perubahan' : 'Tambah kategori';
      }
    });
  }, 0);
}

function requestDelete(category) {
  openConfirmDialog({
    title: `Hapus "${escapeHtml(category.name)}"?`,
    message: 'Kategori ini akan dihapus permanen.',
    variant: 'danger',
    confirmLabel: 'Hapus',
    onConfirm: () => deleteCategory(category),
  });
}

async function deleteCategory(category, reassignTo = null) {
  const query = reassignTo ? `?reassign_to=${encodeURIComponent(reassignTo)}` : '';
  try {
    await apiFetch(`/api/categories/${encodeURIComponent(category.id)}${query}`, { method: 'DELETE' });
    categories = categories.filter(item => item.id !== category.id);
    renderCategories();
    showToast('Kategori berhasil dihapus', 'success');
    return true;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 409 || error.code === 'CONFLICT')) {
      openReassignDialog(category, getConflictTargets(error));
      return false;
    }
    showToast(error.message || 'Gagal memuat data. Coba refresh halaman.', 'error');
    return false;
  }
}

function getConflictTargets(error) {
  return error.data?.available_targets || error.available_targets || error.fields?.available_targets || [];
}

function openReassignDialog(category, targets) {
  const options = targets.map(target => `<option value="${escapeHtml(target.id)}">${escapeHtml(target.name)}</option>`).join('');
  const hasTargets = targets.length > 0;
  const contentHTML = `
    <p style="margin-bottom:var(--space-4);color:var(--color-text-secondary)">Kategori ini masih memiliki transaksi. Silakan pindahkan transaksi ke kategori lain.</p>
    ${hasTargets
      ? `<label for="move-cat-select" style="display:block;margin-bottom:var(--space-2);font-weight:600">Pindahkan transaksi ke</label><select id="move-cat-select" style="width:100%;min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border-light);border-radius:var(--rounded-md)">${options}</select>`
      : '<p style="color:var(--color-text-tertiary)">Tidak ada kategori lain untuk memindahkan transaksi.</p>'}
    <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5)">
      <button id="move-cancel-btn" type="button" style="flex:1;min-height:44px;border:1px solid var(--color-border-medium);border-radius:var(--rounded-md)">Batal</button>
      ${hasTargets ? '<button id="move-confirm-btn" type="button" style="flex:1;min-height:44px;background:var(--color-danger-500);color:#fff;border-radius:var(--rounded-md);font-weight:600">Pindah & Hapus</button>' : ''}
    </div>`;
  const isMobile = window.innerWidth < 768;
  (isMobile ? openBottomSheet : openModal)({ title: `Hapus "${escapeHtml(category.name)}"`, contentHTML });

  setTimeout(() => {
    document.getElementById('move-cancel-btn')?.addEventListener('click', () => closeForm(isMobile));
    document.getElementById('move-confirm-btn')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Memindahkan...';
      const deleted = await deleteCategory(category, document.getElementById('move-cat-select')?.value);
      if (deleted) closeForm(isMobile);
    });
  }, 0);
}

function renderError(error) {
  categoryList?.setAttribute('aria-busy', 'false');
  categoryList?.replaceChildren();
  emptyState?.classList.add('hidden');
  if (!errorState) return;
  errorState.classList.remove('hidden');
  errorState.replaceChildren();
  const text = document.createElement('span');
  text.textContent = error.message || 'Gagal memuat data. Coba refresh halaman.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Coba lagi';
  retry.style.cssText = 'margin-left:var(--space-3);min-height:44px;padding:0 var(--space-3);border:1px solid currentColor;border-radius:var(--rounded-md);';
  retry.addEventListener('click', () => loadCategories());
  errorState.append(text, retry);
}

function clearError() {
  errorState?.classList.add('hidden');
}

function styleFormTypeButton(button, active) {
  button.style.background = active ? 'var(--color-primary-500)' : 'var(--color-surface-raised)';
  button.style.color = active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)';
}

function showFieldError(input, errorElement, message) {
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
  input.setAttribute('aria-invalid', 'true');
  input.style.borderColor = 'var(--color-border-error)';
}

function clearFieldError(input, errorElement) {
  errorElement.textContent = '';
  errorElement.classList.add('hidden');
  input.removeAttribute('aria-invalid');
  input.style.borderColor = 'var(--color-border-light)';
}

function closeForm(isMobile) {
  if (isMobile) closeBottomSheet(); else closeModal();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
