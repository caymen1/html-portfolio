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
   *  notes: Array<{ id: string, text: string, createdAt: string }>,
   *  images?: Array<{ id: string, dataUrl: string, createdAt: string, width?: number, height?: number }>
   * }[]} */
  let properties = [];

  let editingId = null;
  let filterText = '';
  let workingImages = [];

  const filters = {
    type: 'All',
    garage: 'All',
    minPrice: '',
    maxPrice: '',
    minRooms: '',
  };

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
    els.imagesInput = $('imagesInput');
    els.imagePreview = $('imagePreview');
    els.saveBtn = $('saveBtn');
    els.cancelEditBtn = $('cancelEditBtn');

    els.searchInput = $('searchInput');
    els.clearAllBtn = $('clearAllBtn');
    els.resultCount = $('resultCount');
    els.propertyList = $('propertyList');

    // Filters and export
    els.filterType = $('filterType');
    els.filterGarage = $('filterGarage');
    els.filterMinPrice = $('filterMinPrice');
    els.filterMaxPrice = $('filterMaxPrice');
    els.filterMinRooms = $('filterMinRooms');
    els.resetFiltersBtn = $('resetFiltersBtn');
    els.exportJsonBtn = $('exportJsonBtn');
    els.exportCsvBtn = $('exportCsvBtn');
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
    workingImages = [];
    renderImagePreview();
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
      images: [...workingImages],
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
      images: [...workingImages],
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
    workingImages = Array.isArray(p.images) ? [...p.images] : [];
    renderImagePreview();
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
    if (action === 'print') {
      openPrintWindow(p);
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
    const thumbs = (p.images || []).slice(0, 4).map(img => `<img src="${img.dataUrl}" alt="${escapeHtml(p.address)} image" />`).join('');
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
          ${(p.images && p.images.length) ? `<div class="thumb-row">${thumbs}</div>` : ''}
        </div>
        <div class="pc-actions">
          <button class="btn" data-action="add-note" data-id="${p.id}">Add Note</button>
          <button class="btn" data-action="edit" data-id="${p.id}">Edit</button>
          <button class="btn" data-action="print" data-id="${p.id}">Print</button>
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
      if (!hay.includes(ft)) return false;
      return true;
    });
  }

  function applyFilters(list) {
    return list.filter(p => {
      if (filters.type !== 'All' && p.propertyType !== filters.type) return false;
      if (filters.garage !== 'All' && p.garage !== filters.garage) return false;
      const minPrice = Number(filters.minPrice);
      if (!Number.isNaN(minPrice) && filters.minPrice !== '' && p.price < minPrice) return false;
      const maxPrice = Number(filters.maxPrice);
      if (!Number.isNaN(maxPrice) && filters.maxPrice !== '' && p.price > maxPrice) return false;
      const totalRooms = (p.roomsDownstairs || 0) + (p.roomsUpstairs || 0);
      const minRooms = Number(filters.minRooms);
      if (!Number.isNaN(minRooms) && filters.minRooms !== '' && totalRooms < minRooms) return false;
      return true;
    });
  }

  function render() {
    let list = getFiltered();
    list = applyFilters(list);
    els.resultCount.textContent = `${list.length} of ${properties.length} shown`;
    els.propertyList.innerHTML = list.map(propertyCardHTML).join('');
  }

  function bindEvents() {
    els.form.addEventListener('submit', onSubmit);
    els.cancelEditBtn.addEventListener('click', onCancelEdit);
    els.searchInput.addEventListener('input', onSearchInput);
    els.clearAllBtn.addEventListener('click', onClearAll);
    els.propertyList.addEventListener('click', handleListClick);
    if (els.imagesInput) {
      els.imagesInput.addEventListener('change', onImagesSelected);
      els.imagePreview.addEventListener('click', onPreviewClick);
    }
    // Filters
    if (els.filterType) {
      els.filterType.addEventListener('change', () => { filters.type = els.filterType.value; render(); });
      els.filterGarage.addEventListener('change', () => { filters.garage = els.filterGarage.value; render(); });
      els.filterMinPrice.addEventListener('input', () => { filters.minPrice = els.filterMinPrice.value; render(); });
      els.filterMaxPrice.addEventListener('input', () => { filters.maxPrice = els.filterMaxPrice.value; render(); });
      els.filterMinRooms.addEventListener('input', () => { filters.minRooms = els.filterMinRooms.value; render(); });
      els.resetFiltersBtn.addEventListener('click', resetFilters);
    }
    // Export
    if (els.exportJsonBtn) els.exportJsonBtn.addEventListener('click', exportJSON);
    if (els.exportCsvBtn) els.exportCsvBtn.addEventListener('click', exportCSV);
  }

  // Image handling
  async function onImagesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const maxImages = 10;
    const remaining = Math.max(0, maxImages - workingImages.length);
    const toProcess = files.slice(0, remaining);
    for (const file of toProcess) {
      try {
        const imgObj = await fileToCompressedDataUrl(file);
        workingImages.push({ id: uuid(), dataUrl: imgObj.dataUrl, createdAt: nowIso(), width: imgObj.width, height: imgObj.height });
      } catch (err) {
        console.warn('Failed to process image', err);
      }
    }
    e.target.value = '';
    renderImagePreview();
  }

  function onPreviewClick(e) {
    const btn = e.target.closest('button.remove');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    workingImages = workingImages.filter(img => img.id !== id);
    renderImagePreview();
  }

  function renderImagePreview() {
    if (!els.imagePreview) return;
    if (!workingImages.length) { els.imagePreview.innerHTML = '<div class="muted">No images selected</div>'; return; }
    els.imagePreview.innerHTML = workingImages.map(img => `
      <div class="thumb">
        <img src="${img.dataUrl}" alt="Selected image" />
        <button type="button" class="remove" data-id="${img.id}">Remove</button>
      </div>
    `).join('');
  }

  function fileToCompressedDataUrl(file, maxWidth = 1600, maxHeight = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
          const targetW = Math.round(width * ratio);
          const targetH = Math.round(height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ dataUrl, width: targetW, height: targetH });
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Filters helpers
  function resetFilters() {
    filters.type = 'All';
    filters.garage = 'All';
    filters.minPrice = '';
    filters.maxPrice = '';
    filters.minRooms = '';
    if (els.filterType) {
      els.filterType.value = 'All';
      els.filterGarage.value = 'All';
      els.filterMinPrice.value = '';
      els.filterMaxPrice.value = '';
      els.filterMinRooms.value = '';
    }
    render();
  }

  // Export helpers
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  function exportJSON() {
    const data = JSON.stringify(properties, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    downloadBlob(blob, `properties-${new Date().toISOString().slice(0,10)}.json`);
  }

  function csvEscape(value) {
    if (value == null) return '';
    const str = String(value).replaceAll('"', '""');
    return `"${str}` + `"`;
  }

  function exportCSV() {
    const headers = [
      'id','createdAt','updatedAt','address','price','propertyType','roomsDownstairs','roomsUpstairs','totalRooms','garage','gardenSize','noteCount','notes','imageCount'
    ];
    const lines = [headers.join(',')];
    for (const p of properties) {
      const totalRooms = (p.roomsDownstairs || 0) + (p.roomsUpstairs || 0);
      const noteCount = p.notes?.length || 0;
      const notesJoined = (p.notes || []).map(n => n.text).join(' | ');
      const imageCount = p.images?.length || 0;
      const row = [
        p.id, p.createdAt, p.updatedAt, p.address, p.price, p.propertyType,
        p.roomsDownstairs, p.roomsUpstairs, totalRooms, p.garage, p.gardenSize,
        noteCount, notesJoined, imageCount
      ].map(csvEscape).join(',');
      lines.push(row);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `properties-${new Date().toISOString().slice(0,10)}.csv`);
  }

  // Print helpers
  function openPrintWindow(p) {
    const w = window.open('', '_blank');
    if (!w) { alert('Popup blocked. Please allow popups to print.'); return; }
    const totalRooms = (p.roomsDownstairs || 0) + (p.roomsUpstairs || 0);
    const imgs = (p.images || []).map(img => `<img src="${img.dataUrl}" alt="Image" />`).join('');
    const notes = (p.notes || []).map(n => `<li>${escapeHtml(n.text)} <span style="color:#666">(${new Date(n.createdAt).toLocaleString()})</span></li>`).join('');
    const html = `<!doctype html>
    <html><head><meta charset="utf-8" />
    <title>Print - ${escapeHtml(p.address)}</title>
    <style>
      body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial; margin:24px; }
      h1{ margin:0 0 10px 0; font-size:22px }
      .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin:10px 0 }
      .images{ display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-top:10px }
      .images img{ width:100%; height:150px; object-fit:cover; border:1px solid #ddd; border-radius:6px }
      ul{ padding-left: 16px }
      .meta span{ display:inline-block; margin-right:16px }
    </style></head>
    <body>
    <h1>${escapeHtml(p.address)}</h1>
    <div class="meta">
      <span><strong>Price:</strong> ${formatNumber(p.price)}</span>
      <span><strong>Type:</strong> ${escapeHtml(p.propertyType || '')}</span>
      <span><strong>Garage:</strong> ${escapeHtml(p.garage || '')}</span>
    </div>
    <div class="grid">
      <div><strong>Downstairs rooms:</strong> ${formatNumber(p.roomsDownstairs || 0)}</div>
      <div><strong>Upstairs rooms:</strong> ${formatNumber(p.roomsUpstairs || 0)}</div>
      <div><strong>Total rooms:</strong> ${formatNumber(totalRooms)}</div>
      <div><strong>Garden:</strong> ${escapeHtml(p.gardenSize || '—')}</div>
    </div>
    ${(p.images && p.images.length) ? `<div class="images">${imgs}</div>` : ''}
    ${(p.notes && p.notes.length) ? `<h3>Notes</h3><ul>${notes}</ul>` : '<div>No notes</div>'}
    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
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
