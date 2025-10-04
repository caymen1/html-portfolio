(() => {
  const STORAGE_KEY = 'homeViewing.properties.v1';
  /** @type {{
   *  id: string,
   *  createdAt: string,
   *  updatedAt: string,
   *  address: string,
   *  price: number,
   *  propertyType: string,
   *  roomsDownstairs: number,
   *  roomsUpstairs: number,
   *  garage: string,
   *  gardenSize: string,
   *  notes: Array<{ id: string, text: string, createdAt: string }>
   * }[]} */
  let properties = [];

  let editingId = null;
  let filterText = '';

  const els = {};

  function $(id) { return document.getElementById(id); }

  function initRefs() {
    els.form = $('propertyForm');
    els.formTitle = $('formTitle');
    els.propertyId = $('propertyId');
    els.address = $('address');
    els.price = $('price');
    els.propertyType = $('propertyType');
    els.roomsDownstairs = $('roomsDownstairs');
    els.roomsUpstairs = $('roomsUpstairs');
    els.garage = $('garage');
    els.gardenSize = $('gardenSize');
    els.notes = $('notes');
    els.saveBtn = $('saveBtn');
    els.cancelEditBtn = $('cancelEditBtn');

    els.searchInput = $('searchInput');
    els.clearAllBtn = $('clearAllBtn');
    els.resultCount = $('resultCount');
    els.propertyList = $('propertyList');
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      console.warn('Failed to parse saved properties', e);
      return [];
    }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
  }

  function uuid() {
    if (crypto && 'randomUUID' in crypto) return crypto.randomUUID();
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowIso() { return new Date().toISOString(); }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatNumber(n) {
    try { return new Intl.NumberFormat(navigator.language).format(n); }
    catch { return String(n); }
  }

  function clearForm() {
    editingId = null;
    els.propertyId.value = '';
    els.formTitle.textContent = 'Add Property';
    els.saveBtn.textContent = 'Save Property';
    els.cancelEditBtn.hidden = true;

    els.address.value = '';
    els.price.value = '';
    els.propertyType.value = 'House';
    els.roomsDownstairs.value = '0';
    els.roomsUpstairs.value = '0';
    els.garage.value = 'None';
    els.gardenSize.value = '';
    els.notes.value = '';
  }

  function validate(formData) {
    const errors = [];
    if (!formData.address || formData.address.trim().length < 3) errors.push('Address is required');
    if (Number.isNaN(formData.price) || formData.price < 0) errors.push('Price must be a non-negative number');
    return errors;
  }

  function collectForm() {
    const fd = {
      address: els.address.value.trim(),
      price: Number(els.price.value),
      propertyType: els.propertyType.value || 'House',
      roomsDownstairs: Number(els.roomsDownstairs.value || 0),
      roomsUpstairs: Number(els.roomsUpstairs.value || 0),
      garage: els.garage.value || 'None',
      gardenSize: els.gardenSize.value.trim(),
      notesText: els.notes.value.trim(),
    };
    return fd;
  }

  function addProperty(fd) {
    const errors = validate(fd);
    if (errors.length) { alert(errors.join('\n')); return; }
    const id = uuid();
    const createdAt = nowIso();
    /** @type {any} */
    const item = {
      id,
      createdAt,
      updatedAt: createdAt,
      address: fd.address,
      price: fd.price,
      propertyType: fd.propertyType,
      roomsDownstairs: fd.roomsDownstairs,
      roomsUpstairs: fd.roomsUpstairs,
      garage: fd.garage,
      gardenSize: fd.gardenSize,
      notes: [],
    };
    if (fd.notesText) item.notes.push({ id: uuid(), text: fd.notesText, createdAt });
    properties.unshift(item);
    save();
    clearForm();
    render();
  }

  function updateProperty(id, fd) {
    const errors = validate(fd);
    if (errors.length) { alert(errors.join('\n')); return; }
    const idx = properties.findIndex(p => p.id === id);
    if (idx === -1) return;
    const prev = properties[idx];
    properties[idx] = {
      ...prev,
      address: fd.address,
      price: fd.price,
      propertyType: fd.propertyType,
      roomsDownstairs: fd.roomsDownstairs,
      roomsUpstairs: fd.roomsUpstairs,
      garage: fd.garage,
      gardenSize: fd.gardenSize,
      updatedAt: nowIso(),
    };
    if (fd.notesText) {
      properties[idx].notes.push({ id: uuid(), text: fd.notesText, createdAt: nowIso() });
    }
    save();
    clearForm();
    render();
  }

  function onSubmit(e) {
    e.preventDefault();
    const fd = collectForm();
    if (editingId) updateProperty(editingId, fd);
    else addProperty(fd);
  }

  function onCancelEdit() {
    clearForm();
  }

  function onSearchInput() {
    filterText = els.searchInput.value.trim().toLowerCase();
    render();
  }

  function onClearAll() {
    if (!properties.length) return;
    if (confirm('This will remove all saved properties. Continue?')) {
      properties = [];
      save();
      render();
    }
  }

  function populateFormForEdit(p) {
    editingId = p.id;
    els.propertyId.value = p.id;
    els.formTitle.textContent = 'Edit Property';
    els.saveBtn.textContent = 'Update Property';
    els.cancelEditBtn.hidden = false;

    els.address.value = p.address;
    els.price.value = String(p.price);
    els.propertyType.value = p.propertyType || 'House';
    els.roomsDownstairs.value = String(p.roomsDownstairs ?? 0);
    els.roomsUpstairs.value = String(p.roomsUpstairs ?? 0);
    els.garage.value = p.garage || 'None';
    els.gardenSize.value = p.gardenSize || '';
    els.notes.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleListClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    const p = properties.find(x => x.id === id);
    if (!p) return;

    if (action === 'edit') {
      populateFormForEdit(p);
      return;
    }
    if (action === 'delete') {
      if (confirm('Delete this property?')) {
        properties = properties.filter(x => x.id !== id);
        save();
        render();
      }
      return;
    }
    if (action === 'add-note') {
      const text = prompt('Add note');
      if (text && text.trim()) {
        p.notes.push({ id: uuid(), text: text.trim(), createdAt: nowIso() });
        p.updatedAt = nowIso();
        save();
        render();
      }
      return;
    }
  }

  function noteSummary(p) {
    const count = p.notes?.length || 0;
    if (!count) return 'No notes yet';
    const last = p.notes[count - 1];
    const dt = new Date(last.createdAt);
    const when = isNaN(dt.getTime()) ? '' : ` · ${dt.toLocaleString()}`;
    const snippet = last.text.length > 140 ? last.text.slice(0, 137) + '…' : last.text;
    return `${snippet}${when} (${count} total)`;
  }

  function propertyCardHTML(p) {
    const totalRooms = (p.roomsDownstairs || 0) + (p.roomsUpstairs || 0);
    return `
      <article class="property-card" data-id="${p.id}">
        <div class="pc-header">
          <div class="address">${escapeHtml(p.address)}</div>
          <div class="price">${formatNumber(p.price)}</div>
        </div>
        <div class="pc-body">
          <div class="kv">
            <div><span class="badge">Type</span> ${escapeHtml(p.propertyType || '—')}</div>
            <div><span class="badge">Garage</span> ${escapeHtml(p.garage || '—')}</div>
            <div><span class="badge">Downstairs</span> ${formatNumber(p.roomsDownstairs || 0)}</div>
            <div><span class="badge">Upstairs</span> ${formatNumber(p.roomsUpstairs || 0)}</div>
            <div><span class="badge">Total Rooms</span> ${formatNumber(totalRooms)}</div>
            <div><span class="badge">Garden</span> ${escapeHtml(p.gardenSize || '—')}</div>
          </div>
          <div class="notes">${escapeHtml(noteSummary(p))}</div>
        </div>
        <div class="pc-actions">
          <button class="btn" data-action="add-note" data-id="${p.id}">Add Note</button>
          <button class="btn" data-action="edit" data-id="${p.id}">Edit</button>
          <button class="btn btn-danger" data-action="delete" data-id="${p.id}">Delete</button>
        </div>
      </article>
    `;
  }

  function getFiltered() {
    if (!filterText) return properties;
    const ft = filterText;
    return properties.filter(p => {
      const hay = [p.address, p.propertyType, p.gardenSize, p.garage, ...(p.notes?.map(n => n.text) || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(ft);
    });
  }

  function render() {
    const list = getFiltered();
    els.resultCount.textContent = `${list.length} of ${properties.length} shown`;
    els.propertyList.innerHTML = list.map(propertyCardHTML).join('');
  }

  function bindEvents() {
    els.form.addEventListener('submit', onSubmit);
    els.cancelEditBtn.addEventListener('click', onCancelEdit);
    els.searchInput.addEventListener('input', onSearchInput);
    els.clearAllBtn.addEventListener('click', onClearAll);
    els.propertyList.addEventListener('click', handleListClick);
  }

  function boot() {
    initRefs();
    properties = load();
    bindEvents();
    clearForm();
    render();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
