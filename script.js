/**
 * J&B Expedite Logistics LLC - Interactive Agreement & Form Manager
 * Supports: Live Edit Mode (contenteditable), Auto-Sync, Signature Drawing & Typing,
 * LocalStorage Auto-Save, Clean PDF Printing, and JSON/HTML Export.
 */

// State Management
const appState = {
  editAllMode: false,
  activeSigTarget: null,
  activeSigType: 'draw',
  selectedFont: 'Caveat',
  zoomLevel: 100
};

// Default PDF Data
const defaultData = {
  carrier_name: 'COUNTRY MILE CARRIERS LLC',
  agreement_day: '30th',
  agreement_month_year: 'Sep, 2025',
  pricing_rate: '10% of weekly gross, Made by J&B Expedite',
  dot_mc_number: '1753535',
  signer_name: 'Harold Williams',
  signer_title: 'Owner Operator',
  signer_date: '30/Sep/2025',
  signer_stamp: 'Harold Williams (Sep 30, 2025 11:10:19 CDT)',
  executive_name: 'Henry Lewis',
  executive_title: 'Business Development Executive',
  executive_date: '30/Sep/2025',
  executive_stamp: 'Henry Lewis (Sep 30, 2025 22:06:15 GMT+5)',
  company_email: 'JnBexpedite@gmail.com',
  cardholder_email: 'bubbawilliams@icloud.com',
  product_service: 'Dispatch Service Fee',
  card_type_other: 'N/A',
  card_name: 'N/A',
  card_number: 'N/A',
  card_exp: 'N/A',
  card_zip: 'N/A',
  card_cvv: 'N/A',
  bank_routing: 'N/A',
  bank_account: 'N/A',
  bank_zelle: 'N/A',
  bank_customer_name: 'N/A'
};

document.addEventListener('DOMContentLoaded', () => {
  initFieldSync();
  initSignatureModal();
  initSignatureCanvas();
  initToolbarActions();
  initSidebar();
  loadSavedData();
});

/* ==========================================================================
   FIELD SYNC & AUTO-UPDATE
   ========================================================================== */
function initFieldSync() {
  // Sync across all inputs with matching data-sync attribute
  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.dataset && target.dataset.sync) {
      const syncKey = target.dataset.sync;
      const value = target.value;
      syncFields(syncKey, value, target);
      autoSaveToStorage();
    }
  });

  // Also listen for contenteditable updates if applicable
  document.addEventListener('blur', (e) => {
    if (e.target.isContentEditable) {
      autoSaveToStorage();
    }
  }, true);
}

function syncFields(key, value, sourceElem = null) {
  const elements = document.querySelectorAll(`[data-sync="${key}"]`);
  elements.forEach((el) => {
    if (el !== sourceElem) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = value;
      } else {
        el.textContent = value;
      }
    }
  });

  // Also update sidebar sync inputs if present
  const sidebarInput = document.getElementById(`sync_${key}`);
  if (sidebarInput && sidebarInput !== sourceElem) {
    sidebarInput.value = value;
  }
}

/* ==========================================================================
   EDIT ALL CONTENT MODE TOGGLE
   ========================================================================== */
function toggleEditAllMode() {
  appState.editAllMode = !appState.editAllMode;
  document.body.classList.toggle('mode-edit-all', appState.editAllMode);

  const editBtn = document.getElementById('btnToggleEditAll');
  if (editBtn) {
    if (appState.editAllMode) {
      editBtn.classList.add('btn-active');
      editBtn.innerHTML = '<span>✏️</span> <b>Editing Mode: ON</b> (Click Any Text to Edit)';
      showToast('✏️ Edit Mode ON: You can now click & edit any text, header, or clause anywhere!');
    } else {
      editBtn.classList.remove('btn-active');
      editBtn.innerHTML = '<span>✏️</span> Edit All Text Mode';
      showToast('Document locked to Form Fill Mode.');
    }
  }

  // Set contenteditable attribute on legal content containers
  const editableContainers = document.querySelectorAll('.editable-text, p.legal-paragraph, h1.doc-title, h2.section-banner, h3.section-heading, ol.legal-list li, .doc-welcome-text p');
  editableContainers.forEach((container) => {
    container.contentEditable = appState.editAllMode ? 'true' : 'false';
  });
}

/* ==========================================================================
   SIGNATURE MODAL & ENGINE
   ========================================================================== */
let canvas, ctx, isDrawing = false;

function initSignatureModal() {
  const modal = document.getElementById('signatureModal');
  const closeBtns = document.querySelectorAll('.close-modal');
  const tabBtns = document.querySelectorAll('.sig-tab-btn');
  const applyBtn = document.getElementById('btnApplySignature');
  const clearCanvasBtn = document.getElementById('btnClearCanvas');
  const typeInput = document.getElementById('typeSigInput');
  const fontItems = document.querySelectorAll('.font-preview-item');

  // Open modal on click of signature boxes
  document.addEventListener('click', (e) => {
    const sigBox = e.target.closest('.sig-box-wrapper');
    if (sigBox) {
      appState.activeSigTarget = sigBox;
      openSignatureModal();
    }
  });

  // Close modal
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });

  // Switch tabs (Draw vs Type)
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.sig-tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(tabId).classList.add('active');
      appState.activeSigType = tabId === 'tabDraw' ? 'draw' : 'type';

      if (appState.activeSigType === 'draw') {
        resizeCanvas();
      }
    });
  });

  // Clear Canvas
  if (clearCanvasBtn) {
    clearCanvasBtn.addEventListener('click', clearCanvas);
  }

  // Type input live sync to preview fonts
  if (typeInput) {
    typeInput.addEventListener('input', (e) => {
      const val = e.target.value.trim() || 'Your Name';
      document.querySelectorAll('.font-sample-text').forEach(sample => {
        sample.textContent = val;
      });
    });
  }

  // Font Selection
  fontItems.forEach(item => {
    item.addEventListener('click', () => {
      fontItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      appState.selectedFont = item.dataset.font;
    });
  });

  // Apply Signature
  if (applyBtn) {
    applyBtn.addEventListener('click', applySignature);
  }
}

function openSignatureModal() {
  const modal = document.getElementById('signatureModal');
  modal.classList.add('show');

  // Pre-fill type input with active target's associated signer name
  const target = appState.activeSigTarget;
  let signerName = 'Harold Williams';
  if (target && target.dataset.signerSync) {
    const syncElem = document.querySelector(`[data-sync="${target.dataset.signerSync}"]`);
    if (syncElem && syncElem.value) {
      signerName = syncElem.value;
    }
  }

  const typeInput = document.getElementById('typeSigInput');
  if (typeInput) {
    typeInput.value = signerName;
    document.querySelectorAll('.font-sample-text').forEach(sample => {
      sample.textContent = signerName;
    });
  }

  if (appState.activeSigType === 'draw') {
    setTimeout(resizeCanvas, 50);
  }
}

function initSignatureCanvas() {
  canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDrawing(e) {
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
  }

  function draw(e) {
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    e.preventDefault();
  }

  function stopDrawing() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.scale(2, 2);
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function clearCanvas() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function applySignature() {
  if (!appState.activeSigTarget) return;

  const displayContainer = appState.activeSigTarget.querySelector('.signature-display');
  const timestamp = getFormattedTimestamp();

  if (appState.activeSigType === 'draw') {
    // Canvas signature
    const dataUrl = canvas.toDataURL('image/png');
    displayContainer.innerHTML = `
      <img src="${dataUrl}" class="sig-canvas-img" alt="Digital Signature" />
      <span class="sig-stamp-text">Digitally Signed (${timestamp})</span>
    `;
  } else {
    // Typed cursive signature
    const typeInput = document.getElementById('typeSigInput');
    const name = typeInput.value.trim() || 'Harold Williams';
    displayContainer.innerHTML = `
      <div class="sig-script-text" style="font-family: '${appState.selectedFont}', cursive;">${name}</div>
      <span class="sig-stamp-text">${name} (${timestamp})</span>
    `;
  }

  document.getElementById('signatureModal').classList.remove('show');
  showToast('✍️ Signature applied successfully!');
  autoSaveToStorage();
}

function getFormattedTimestamp() {
  const d = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${month} ${day}, ${year} ${hours}:${mins}:${secs} CST`;
}

/* ==========================================================================
   TOOLBAR & DOCUMENT ACTIONS
   ========================================================================== */
function initToolbarActions() {
  // Edit Mode Button
  const btnToggleEdit = document.getElementById('btnToggleEditAll');
  if (btnToggleEdit) {
    btnToggleEdit.addEventListener('click', toggleEditAllMode);
  }

  // Print / Save PDF
  const btnPrint = document.getElementById('btnPrintDoc');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // Save to Storage
  const btnSave = document.getElementById('btnSaveData');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      saveAllData();
      showToast('💾 All changes saved to browser storage!');
    });
  }

  // Reset Data
  const btnReset = document.getElementById('btnResetDoc');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Reset document to sample pre-filled values from the original agreement?')) {
        localStorage.removeItem('jb_expedite_agreement_data');
        location.reload();
      }
    });
  }

  // Export JSON
  const btnExport = document.getElementById('btnExportJSON');
  if (btnExport) {
    btnExport.addEventListener('click', exportDataJSON);
  }

  // Export Standalone HTML
  const btnExportHTML = document.getElementById('btnExportHTML');
  if (btnExportHTML) {
    btnExportHTML.addEventListener('click', exportCompleteHTML);
  }

  // Zoom Controls
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomReset = document.getElementById('btnZoomReset');

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => updateZoom(10));
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => updateZoom(-10));
  }
  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => resetZoom());
  }

  // Toggle Sidebar
  const btnSidebar = document.getElementById('btnToggleSidebar');
  if (btnSidebar) {
    btnSidebar.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('collapsed');
    });
  }
}

function updateZoom(delta) {
  appState.zoomLevel = Math.max(50, Math.min(150, appState.zoomLevel + delta));
  applyZoom();
}

function resetZoom() {
  appState.zoomLevel = 100;
  applyZoom();
}

function applyZoom() {
  const pages = document.querySelectorAll('.doc-page');
  pages.forEach(p => {
    p.style.transform = `scale(${appState.zoomLevel / 100})`;
    p.style.transformOrigin = 'top center';
  });
  const zoomDisplay = document.getElementById('zoomDisplay');
  if (zoomDisplay) zoomDisplay.textContent = `${appState.zoomLevel}%`;
}

/* ==========================================================================
   SIDEBAR & PAGE JUMP
   ========================================================================== */
function initSidebar() {
  const navItems = document.querySelectorAll('.page-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('href');
      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });

  // Sidebar sync inputs
  const sidebarSyncCarrier = document.getElementById('sync_carrier_name');
  if (sidebarSyncCarrier) {
    sidebarSyncCarrier.addEventListener('input', (e) => {
      syncFields('carrier_name', e.target.value);
    });
  }

  const sidebarSyncSigner = document.getElementById('sync_signer_name');
  if (sidebarSyncSigner) {
    sidebarSyncSigner.addEventListener('input', (e) => {
      syncFields('signer_name', e.target.value);
    });
  }

  const sidebarSyncDate = document.getElementById('sync_signer_date');
  if (sidebarSyncDate) {
    sidebarSyncDate.addEventListener('input', (e) => {
      syncFields('signer_date', e.target.value);
    });
  }
}

/* ==========================================================================
   STORAGE & DATA IMPORT/EXPORT
   ========================================================================== */
function collectDocumentData() {
  const data = {};
  // Collect inputs
  document.querySelectorAll('input[data-sync], textarea[data-sync]').forEach(input => {
    data[input.dataset.sync] = input.value;
  });
  // Checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
    data['checkbox_' + (cb.id || idx)] = cb.checked;
  });
  // Contenteditable content
  const editableNodes = [];
  document.querySelectorAll('.editable-text, p.legal-paragraph, h1.doc-title, h2.section-banner, h3.section-heading').forEach((node, idx) => {
    editableNodes.push({ id: idx, html: node.innerHTML });
  });
  data._editableNodes = editableNodes;
  return data;
}

function autoSaveToStorage() {
  const data = collectDocumentData();
  localStorage.setItem('jb_expedite_agreement_data', JSON.stringify(data));
}

function saveAllData() {
  autoSaveToStorage();
}

function loadSavedData() {
  const saved = localStorage.getItem('jb_expedite_agreement_data');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    // Populate synced fields
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith('checkbox_')) {
        const id = key.replace('checkbox_', '');
        const cb = document.getElementById(id);
        if (cb) cb.checked = val;
      } else if (key !== '_editableNodes') {
        syncFields(key, val);
      }
    }
    // Populate text nodes
    if (data._editableNodes && Array.isArray(data._editableNodes)) {
      const nodes = document.querySelectorAll('.editable-text, p.legal-paragraph, h1.doc-title, h2.section-banner, h3.section-heading');
      data._editableNodes.forEach(item => {
        if (nodes[item.id]) {
          nodes[item.id].innerHTML = item.html;
        }
      });
    }
  } catch (e) {
    console.error('Error loading stored agreement data:', e);
  }
}

function exportDataJSON() {
  const data = collectDocumentData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `JB_Expedite_Agreement_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📄 Agreement data exported as JSON!');
}

function exportCompleteHTML() {
  // Bake input values into attributes for standalone archive
  document.querySelectorAll('input').forEach(input => {
    if (input.type === 'checkbox') {
      if (input.checked) input.setAttribute('checked', '');
      else input.removeAttribute('checked');
    } else {
      input.setAttribute('value', input.value);
    }
  });

  const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `JB_Expedite_Agreement_Edited_${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 Document exported as standalone HTML file!');
}

/* ==========================================================================
   TOAST HELPER
   ========================================================================== */
function showToast(message) {
  let toast = document.querySelector('.toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.innerHTML = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
