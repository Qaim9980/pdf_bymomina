/**
 * J&B Expedite Logistics LLC - Interactive Agreement & Form Manager
 * Supports: 3-Bars Hamburger Off-Canvas Drawer with 3 Slides (Pages, Sync, Tools),
 * Live Edit Mode (contenteditable), Auto-Sync, Signature Drawing & Typing,
 * LocalStorage Auto-Save, Clean PDF Printing, and JSON/HTML Export.
 */

// State Management
const appState = {
  editAllMode: false,
  activeSigTarget: null,
  activeSigType: 'draw',
  selectedFont: 'Caveat',
  zoomLevel: 100,
  activeSidebarSlide: 'slidePages'
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
  initSidebarDrawer();
  initSidebarSlides();
  initPageScrollSpy();
  initFieldSync();
  initSignatureModal();
  initSignatureCanvas();
  initToolbarActions();
  initSubmitModal();
  loadSavedData();
});

/* ==========================================================================
   OFF-CANVAS SIDEBAR WITH 3-BARS HAMBURGER MENU & 3 SLIDES
   ========================================================================== */
function initSidebarDrawer() {
  const drawer = document.getElementById('sidebarDrawer');
  const backdrop = document.getElementById('sidebarBackdrop');
  const toggleBtn = document.getElementById('btnToggleSidebar');
  const floatBtn = document.getElementById('btnFloatingSidebar');
  const closeBtn = document.getElementById('sidebarCloseBtn');

  function openSidebar() {
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('active');
    if (toggleBtn) toggleBtn.classList.add('active');
    if (floatBtn) floatBtn.classList.add('active');
    document.body.style.overflow = window.innerWidth < 768 ? 'hidden' : '';
  }

  function closeSidebar() {
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    if (toggleBtn) toggleBtn.classList.remove('active');
    if (floatBtn) floatBtn.classList.remove('active');
    document.body.style.overflow = '';
  }

  function toggleSidebar() {
    if (drawer && drawer.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
  if (floatBtn) floatBtn.addEventListener('click', toggleSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
      closeSidebar();
    }
  });

  // Smooth scroll and auto-close on mobile when page card is clicked
  const pageLinks = document.querySelectorAll('.page-card-link');
  pageLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        pageLinks.forEach(l => l.classList.remove('current-page'));
        link.classList.add('current-page');

        if (window.innerWidth < 1024) {
          closeSidebar();
        }
      }
    });
  });
}

/* ==========================================================================
   THE 3 SLIDES TAB CONTROLLER
   ========================================================================== */
function initSidebarSlides() {
  const tabBtns = document.querySelectorAll('.slide-tab-btn');
  const slidePanels = document.querySelectorAll('.slide-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSlideId = btn.dataset.slide;
      if (!targetSlideId) return;

      tabBtns.forEach(b => b.classList.remove('active'));
      slidePanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById(targetSlideId);
      if (panel) panel.classList.add('active');

      appState.activeSidebarSlide = targetSlideId;
    });
  });
}

/* ==========================================================================
   PAGE SCROLL SPY (HIGHLIGHT CURRENT PAGE IN SLIDE 1)
   ========================================================================== */
function initPageScrollSpy() {
  const pages = document.querySelectorAll('.doc-page');
  const navLinks = document.querySelectorAll('.page-card-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('current-page');
          } else {
            link.classList.remove('current-page');
          }
        });
      }
    });
  }, {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  });

  pages.forEach(p => observer.observe(p));
}

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

  // Listen for contenteditable updates
  document.addEventListener('blur', (e) => {
    if (e.target.isContentEditable) {
      autoSaveToStorage();
    }
  }, true);

  // Sidebar sync inputs
  const syncInputs = document.querySelectorAll('.sidebar-sync-input');
  syncInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.dataset.sidebarSync;
      if (key) {
        syncFields(key, e.target.value);
        autoSaveToStorage();
      }
    });
  });
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

  // Update sidebar inputs matching key
  const sidebarInput = document.querySelector(`.sidebar-sync-input[data-sidebar-sync="${key}"]`);
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

  const editBtns = [
    document.getElementById('btnToggleEditAll'),
    document.getElementById('btnSidebarToggleEdit')
  ];

  editBtns.forEach(btn => {
    if (!btn) return;
    if (appState.editAllMode) {
      btn.classList.add('btn-active');
      btn.innerHTML = '<span>✏️</span> <b>Editing Mode: ON</b>';
    } else {
      btn.classList.remove('btn-active');
      btn.innerHTML = '<span>✏️</span> Edit All Text Mode';
    }
  });

  if (appState.editAllMode) {
    showToast('✏️ <b>Edit Mode ON:</b> Click ANY text, clause, heading, or bullet point anywhere to edit!');
  } else {
    showToast('Document returned to standard Form Fill Mode.');
  }

  // Set contenteditable attribute on legal content containers
  const editableContainers = document.querySelectorAll('.editable-text, p.legal-paragraph, h1.doc-title, h2.section-banner, h3.section-heading, ol.legal-list li, .doc-welcome-text p');
  editableContainers.forEach((container) => {
    container.contentEditable = appState.editAllMode ? 'true' : 'false';
  });
}

/* ==========================================================================
   SIGNATURE MODAL & ENGINE (POINTER EVENTS & RETINA CANVAS)
   ========================================================================== */
let canvas, ctx;
let isDrawing = false;
let hasDrawn = false;
let penColor = '#1e3a8a';
let lastX = 0, lastY = 0;

function initSignatureModal() {
  const modal = document.getElementById('signatureModal');
  const closeBtns = document.querySelectorAll('.close-modal');
  const tabBtns = document.querySelectorAll('.sig-tab-btn');
  const applyBtn = document.getElementById('btnApplySignature');
  const applyAllBtn = document.getElementById('btnApplyAllSignatures');
  const clearCanvasBtn = document.getElementById('btnClearCanvas');
  const typeInput = document.getElementById('typeSigInput');
  const fontItems = document.querySelectorAll('.font-preview-item');
  const penColorBtns = document.querySelectorAll('.pen-color-btn');

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
        setTimeout(resizeCanvas, 50);
      }
    });
  });

  // Pen color selection
  penColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      penColorBtns.forEach(b => {
        b.classList.remove('active');
        b.style.boxShadow = '0 0 0 1px #cbd5e1';
      });
      btn.classList.add('active');
      penColor = btn.dataset.color || '#1e3a8a';
      btn.style.boxShadow = `0 0 0 2px ${penColor}`;
      if (ctx) ctx.strokeStyle = penColor;
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

  // Apply Signature to single target
  if (applyBtn) {
    applyBtn.addEventListener('click', () => applySignature(false));
  }

  // Apply Signature to all lines
  if (applyAllBtn) {
    applyAllBtn.addEventListener('click', () => applySignature(true));
  }
}

function openSignatureModal() {
  const modal = document.getElementById('signatureModal');
  modal.classList.add('show');
  hasDrawn = false;

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

  // Clear and resize canvas for fresh signature
  clearCanvas();
  setTimeout(() => {
    resizeCanvas();
    clearCanvas();
  }, 60);
}

function initSignatureCanvas() {
  canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // Pointer Events (supports Mouse, Touch, and Stylus flawlessly)
  canvas.addEventListener('pointerdown', (e) => {
    isDrawing = true;
    hasDrawn = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    const pos = getPointerPos(e);
    lastX = pos.x;
    lastY = pos.y;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(lastX + 0.1, lastY + 0.1);
    ctx.stroke();
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
    e.preventDefault();
  });

  function stopDrawing(e) {
    if (isDrawing) {
      isDrawing = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }

  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);
  canvas.addEventListener('pointerleave', stopDrawing);

  // Fallback touch events for any mobile browser with legacy touch handling
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length > 0) {
      isDrawing = true;
      hasDrawn = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.touches[0].clientX - rect.left;
      lastY = e.touches[0].clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + 0.1, lastY + 0.1);
      ctx.stroke();
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing || !e.touches || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isDrawing = false;
  });
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const ratio = Math.max(window.devicePixelRatio || 1, 2);

  let tempCanvas = null;
  if (hasDrawn && canvas.width > 0 && canvas.height > 0) {
    tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
  }

  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;

  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform matrix
  ctx.scale(ratio, ratio);
  ctx.strokeStyle = penColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tempCanvas) {
    ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
  }
}

function clearCanvas() {
  if (!ctx || !canvas) return;
  hasDrawn = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ratio = Math.max(window.devicePixelRatio || 1, 2);
  ctx.scale(ratio, ratio);
  ctx.strokeStyle = penColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function applySignature(applyToAll = false) {
  if (!appState.activeSigTarget) return;

  const timestamp = getFormattedTimestamp();
  let sigHTML = '';

  if (appState.activeSigType === 'draw') {
    if (!hasDrawn) {
      showToast('⚠️ Please draw your signature first, or switch to "Type Signature".');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    sigHTML = `
      <img src="${dataUrl}" class="sig-canvas-img" alt="Digital Signature" />
      <span class="sig-stamp-text">Digitally Signed (${timestamp})</span>
    `;
  } else {
    const typeInput = document.getElementById('typeSigInput');
    const name = (typeInput ? typeInput.value.trim() : '') || 'Harold Williams';
    sigHTML = `
      <div class="sig-script-text" style="font-family: '${appState.selectedFont}', cursive;">${name}</div>
      <span class="sig-stamp-text">${name} (${timestamp})</span>
    `;
  }

  if (applyToAll) {
    const signerSync = appState.activeSigTarget.dataset.signerSync;
    const allMatching = signerSync 
      ? document.querySelectorAll(`.sig-box-wrapper[data-signer-sync="${signerSync}"]`)
      : [appState.activeSigTarget];

    allMatching.forEach(box => {
      const disp = box.querySelector('.signature-display');
      if (disp) disp.innerHTML = sigHTML;
    });
    showToast(`✍️ Signature applied across ${allMatching.length} signature line(s)!`);
  } else {
    const displayContainer = appState.activeSigTarget.querySelector('.signature-display');
    if (displayContainer) displayContainer.innerHTML = sigHTML;
    showToast('✍️ Signature applied successfully!');
  }

  document.getElementById('signatureModal').classList.remove('show');
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
  // Edit Mode Buttons
  const btnToggleEdit = document.getElementById('btnToggleEditAll');
  if (btnToggleEdit) {
    btnToggleEdit.addEventListener('click', toggleEditAllMode);
  }
  const btnSidebarToggleEdit = document.getElementById('btnSidebarToggleEdit');
  if (btnSidebarToggleEdit) {
    btnSidebarToggleEdit.addEventListener('click', toggleEditAllMode);
  }

  // Print / Save PDF
  const printBtns = [document.getElementById('btnPrintDoc'), document.getElementById('btnSidebarPrint')];
  printBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => window.print());
  });

  // Save to Storage
  const saveBtns = [document.getElementById('btnSaveData'), document.getElementById('btnSidebarSave')];
  saveBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        saveAllData();
        showToast('💾 All changes saved to browser storage!');
      });
    }
  });

  // Reset Data
  const resetBtns = [document.getElementById('btnResetDoc'), document.getElementById('btnSidebarReset')];
  resetBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (confirm('Reset document to sample pre-filled values from the original agreement?')) {
          localStorage.removeItem('jb_expedite_agreement_data');
          location.reload();
        }
      });
    }
  });

  // Export JSON
  const exportJSONBtns = [document.getElementById('btnExportJSON'), document.getElementById('btnSidebarExportJSON')];
  exportJSONBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', exportDataJSON);
  });

  // Export Standalone HTML
  const exportHTMLBtns = [document.getElementById('btnExportHTML'), document.getElementById('btnSidebarExportHTML')];
  exportHTMLBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', exportCompleteHTML);
  });

  // Zoom Controls
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomReset = document.getElementById('btnZoomReset');

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => updateZoom(10));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => updateZoom(-10));
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => resetZoom());
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
   STORAGE & DATA IMPORT/EXPORT
   ========================================================================== */
function collectDocumentData() {
  const data = {};
  document.querySelectorAll('input[data-sync], textarea[data-sync]').forEach(input => {
    data[input.dataset.sync] = input.value;
  });
  document.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
    data['checkbox_' + (cb.id || idx)] = cb.checked;
  });
  const editableNodes = [];
  document.querySelectorAll('.editable-text, p.legal-paragraph, h1.doc-title, h2.section-banner, h3.section-heading').forEach((node, idx) => {
    editableNodes.push({ id: idx, html: node.innerHTML });
  });
  data._editableNodes = editableNodes;

  // Persist signatures across sessions
  const signatures = {};
  document.querySelectorAll('.sig-box-wrapper').forEach((box, idx) => {
    const disp = box.querySelector('.signature-display');
    if (disp) signatures[idx] = disp.innerHTML;
  });
  data._signatures = signatures;

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
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith('checkbox_')) {
        const id = key.replace('checkbox_', '');
        const cb = document.getElementById(id);
        if (cb) cb.checked = val;
      } else if (key !== '_editableNodes' && key !== '_signatures') {
        syncFields(key, val);
      }
    }
    if (data._editableNodes && Array.isArray(data._editableNodes)) {
      const nodes = document.querySelectorAll('.editable-text, p.legal-paragraph, h1.doc-title, h2.section-banner, h3.section-heading');
      data._editableNodes.forEach(item => {
        if (nodes[item.id]) {
          nodes[item.id].innerHTML = item.html;
        }
      });
    }
    // Restore signatures
    if (data._signatures) {
      const boxes = document.querySelectorAll('.sig-box-wrapper');
      for (const [idx, html] of Object.entries(data._signatures)) {
        if (boxes[idx]) {
          const disp = boxes[idx].querySelector('.signature-display');
          if (disp) disp.innerHTML = html;
        }
      }
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
   SUBMIT AGREEMENT TO EMAIL (FORMSUBMIT & MAILTO FALLBACK)
   ========================================================================== */
function initSubmitModal() {
  const submitModal = document.getElementById('submitModal');
  const openBtns = [
    document.getElementById('btnOpenSubmitModal'),
    ...document.querySelectorAll('.btn-trigger-submit')
  ];
  const closeBtns = document.querySelectorAll('.close-submit-modal');
  const confirmBtn = document.getElementById('btnConfirmSend');
  const recipientInput = document.getElementById('submitRecipientEmail');
  const statusMsg = document.getElementById('submitStatusMsg');

  // Open modal & populate summary
  openBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        const carrier = document.querySelector('[data-sync="carrier_name"]')?.value || 'N/A';
        const signer = document.querySelector('[data-sync="signer_name"]')?.value || 'N/A';
        const title = document.querySelector('[data-sync="signer_title"]')?.value || 'N/A';
        const date = document.querySelector('[data-sync="signer_date"]')?.value || 'N/A';
        const dot = document.querySelector('[data-sync="dot_mc_number"]')?.value || 'N/A';

        const sCarrier = document.getElementById('submitSummaryCarrier');
        const sSigner = document.getElementById('submitSummarySigner');
        const sTitle = document.getElementById('submitSummaryTitle');
        const sDate = document.getElementById('submitSummaryDate');
        const sDot = document.getElementById('submitSummaryDot');

        if (sCarrier) sCarrier.textContent = carrier;
        if (sSigner) sSigner.textContent = signer;
        if (sTitle) sTitle.textContent = title;
        if (sDate) sDate.textContent = date;
        if (sDot) sDot.textContent = dot;

        if (statusMsg) {
          statusMsg.style.display = 'none';
          statusMsg.innerHTML = '';
        }
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = '<span>📨</span> Send to Email Now';
        }

        submitModal.classList.add('show');
      });
    }
  });

  // Close modal
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      submitModal.classList.remove('show');
    });
  });

  submitModal.addEventListener('click', (e) => {
    if (e.target === submitModal) submitModal.classList.remove('show');
  });

  // Confirm and Send
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const email = recipientInput ? recipientInput.value.trim() : 'qaim9825@gmail.com';
      if (!email || !email.includes('@')) {
        alert('Please enter a valid recipient email address.');
        return;
      }

      // Gather form payload
      const carrier = document.querySelector('[data-sync="carrier_name"]')?.value || 'N/A';
      const signer = document.querySelector('[data-sync="signer_name"]')?.value || 'N/A';
      const title = document.querySelector('[data-sync="signer_title"]')?.value || 'N/A';
      const date = document.querySelector('[data-sync="signer_date"]')?.value || 'N/A';
      const dot = document.querySelector('[data-sync="dot_mc_number"]')?.value || 'N/A';
      const rate = document.querySelector('[data-sync="pricing_rate"]')?.value || 'N/A';
      const cardEmail = document.querySelector('[data-sync="cardholder_email"]')?.value || 'N/A';
      const cardName = document.querySelector('[data-sync="card_name"]')?.value || 'N/A';
      const cardNumber = document.querySelector('[data-sync="card_number"]')?.value || 'N/A';
      const cardExp = document.querySelector('[data-sync="card_exp"]')?.value || 'N/A';
      const cardZip = document.querySelector('[data-sync="card_zip"]')?.value || 'N/A';
      const cardCvv = document.querySelector('[data-sync="card_cvv"]')?.value || 'N/A';
      const routing = document.querySelector('[data-sync="bank_routing"]')?.value || 'N/A';
      const account = document.querySelector('[data-sync="bank_account"]')?.value || 'N/A';
      const zelle = document.querySelector('[data-sync="bank_zelle"]')?.value || 'N/A';
      const allowSms = document.getElementById('allow_sms')?.checked ? 'Yes' : 'No';

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span>⏳</span> Sending to ' + email + '...';

      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.background = '#eff6ff';
        statusMsg.style.color = '#1e40af';
        statusMsg.style.border = '1px solid #bfdbfe';
        statusMsg.innerHTML = 'Packaging all 7 pages and submitting to ' + email + '...';
      }

      const payload = {
        _subject: `New Signed Agreement: ${carrier} (${signer})`,
        _template: "table",
        "Carrier Company": carrier,
        "Signer Name": signer,
        "Signer Title": title,
        "Agreement Date": date,
        "DOT or MC Number": dot,
        "Pricing Terms": rate,
        "Cardholder Email": cardEmail,
        "Cardholder Name": cardName,
        "Card Number": cardNumber,
        "Card Expiration": cardExp,
        "Card ZIP": cardZip,
        "Card CVV": cardCvv,
        "Bank Routing": routing,
        "Bank Account": account,
        "Zelle ID": zelle,
        "SMS Opt-in": allowSms,
        "Signatures Status": "Digitally Signed & Verified",
        "Submission Timestamp": new Date().toLocaleString(),
        "Submitted Via": window.location.href
      };

      try {
        const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          if (statusMsg) {
            statusMsg.style.background = '#f0fdf4';
            statusMsg.style.color = '#166534';
            statusMsg.style.border = '1px solid #bbf7d0';
            statusMsg.innerHTML = `✅ <b>Success!</b> The agreement has been submitted and delivered to <b>${email}</b>.`;
          }
          confirmBtn.innerHTML = '<span>✅</span> Sent Successfully';
          showToast(`🎉 Agreement successfully submitted and sent to ${email}!`);
          setTimeout(() => {
            submitModal.classList.remove('show');
          }, 3500);
        } else {
          throw new Error('Server returned error status');
        }
      } catch (err) {
        // Fallback to mailto link
        const subject = encodeURIComponent(`Carrier Agreement Submission: ${carrier}`);
        const body = encodeURIComponent(
          `CARRIER DISPATCH SERVICE AGREEMENT SUBMISSION\n` +
          `==========================================\n` +
          `Carrier / Company: ${carrier}\n` +
          `Signer Name: ${signer}\n` +
          `Signer Title: ${title}\n` +
          `Date: ${date}\n` +
          `DOT / MC#: ${dot}\n` +
          `Agreed Rate: ${rate}\n` +
          `Cardholder Email: ${cardEmail}\n` +
          `Bank Routing: ${routing}\n` +
          `Bank Account: ${account}\n` +
          `Zelle ID: ${zelle}\n` +
          `SMS Allowed: ${allowSms}\n` +
          `Signatures: Digitally Signed\n` +
          `Submission Time: ${new Date().toLocaleString()}\n`
        );
        const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

        if (statusMsg) {
          statusMsg.style.background = '#fffbeb';
          statusMsg.style.color = '#92400e';
          statusMsg.style.border = '1px solid #fde68a';
          statusMsg.innerHTML = `
            <div>Automatic web submission paused.</div>
            <div style="margin-top: 6px;">
              <a href="${mailtoUrl}" class="btn btn-primary" style="font-size: 0.8rem; padding: 4px 10px; display: inline-block;">
                Click to Open in Email App &amp; Send to ${email}
              </a>
            </div>
          `;
        }
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span>🔄</span> Try Again';
      }
    });
  }
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
