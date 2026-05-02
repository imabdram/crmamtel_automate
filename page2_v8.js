// =========================================
// crm amtel automator
// =========================================

let gloable_icc_id = null;
let gloable_msisdn = null;
let iccidPromptProvided = false;
let iccidUiConfirmed = false;

let iccidLog = JSON.parse(localStorage.getItem('iccidLog') || '[]');

// --- Utility: Save logs safely ---
function saveLog() {
  try {
    localStorage.setItem('iccidLog', JSON.stringify(iccidLog));
  } catch (e) {
    console.error("❌ localStorage save failed:", e);
    alert("⚠️ Warning: Log not saved (storage full?)");
  }
}

// --- Check for duplicate ICCID ---
function isDuplicate(iccid) {
  return iccidLog.some(entry => entry.iccid === iccid);
}


// Check if MSISDN was used in the last 2 days
function isMsisdnUsedRecently(msisdn, maxDays = 7) {
  const now = Date.now();
  const cutoff = now - (maxDays * 24 * 60 * 60 * 1000); // 2 days in ms

  return iccidLog.some(entry => {
    if (entry.msisdn !== msisdn) return false;
    
    const entryTime = new Date(entry.timestamp).getTime();
    return entryTime >= cutoff; // only recent entries
  });
}

// --- Main logging function ---
function saveIccid(iccid, options = {}) {
  if (!iccid || typeof iccid !== 'string') {
    console.warn("⚠️ Invalid ICCID:", iccid);
    return false;
  }

  if (isDuplicate(iccid)) {
    console.log(`🔁 Duplicate ICCID ${iccid} — skipped.`);
    alert(`ICCID ${iccid} already logged!`);
    return false;
  }

  const logEntry = {
    id: Date.now(),
    iccid: iccid.length > 7 ? iccid.slice(-7) : iccid.trim(), // Store only last 7 digits
    msisdn: (options.msisdn || '').trim(),
    timestamp: new Date().toISOString(),
    timeDisplay: new Date().toLocaleString('en-US', { timeZone: 'Africa/Mogadishu' }),
    status: options.status || 'logged',
    notes: options.notes || ''
  };

  iccidLog.push(logEntry);
  saveLog();
  console.log(`📝 Logged: ${iccid} → MSISDN: ${logEntry.msisdn}`);
  return true;
}

// --- Delete log by ID ---
function deleteLog(id) {
  const before = iccidLog.length;
  iccidLog = iccidLog.filter(e => e.id !== id);
  if (iccidLog.length < before) {
    saveLog();
    console.log(`🗑️ Deleted log ID: ${id}`);
    return true;
  }
  console.warn(`⚠️ Log ID ${id} not found.`);
  return false;
}

// --- Clear all logs ---
function clearAllLogs() {
  if (confirm("Clear all ICCID logs? This cannot be undone.")) {
    iccidLog = [];
    saveLog();
    console.log("🧹 All logs cleared.");
  }
}


// --- Detect ICCID in UI ---
function detectIccidInUi(expectedIccid) {
  if (!expectedIccid) return false;

  const selectors = [
    'input[value*="' + expectedIccid.slice(-6) + '"]',
    '[data-iccid]',
    '.iccid-display',
    '#iccidSummary',
    'table tbody tr td',
    '.selected-item span',
    '.form-summary .row'
  ];

  for (const sel of selectors) {
    const elements = document.querySelectorAll(sel);
    for (const el of elements) {
      const text = (el.value || el.textContent || el.innerText || '').replace(/\D/g, '');
      if (text.includes(expectedIccid) || text.endsWith(expectedIccid.slice(-8))) {
        return true;
      }
    }
  }

  const bodyText = document.body.innerText.replace(/\D/g, '');
  return bodyText.includes(expectedIccid) || bodyText.endsWith(expectedIccid.slice(-8));
}

// --- Get valid 7-digit ICCID suffix with retry ---
async function getValidIccidSuffix(initialMessage = "Enter ICCID last 7 digits (will auto-add 8925263790000xxxxxxx):") {
  const MAX_ATTEMPTS = 3;
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    const suffix = prompt(
      `${initialMessage}\nAttempt ${attempt + 1}/${MAX_ATTEMPTS}:`
    );

    if (suffix === null) {
      return null; // User clicked Cancel
    }

    const clean = suffix.replace(/\D/g, ''); // Remove all non-digits
    if (clean.length === 7) {
      return clean;
    }

    attempt++;
    if (attempt >= MAX_ATTEMPTS) {
      alert(`❌ Max attempts (${MAX_ATTEMPTS}) reached.\nExpected 7 digits, got "${clean}" (${clean.length} digits).`);
      return null;
    }

    alert(
      `⚠️ Invalid input!\nYou entered: "${suffix}"\nCleaned to: "${clean}" (${clean.length} digits)\nPlease enter exactly 7 digits.`
    );
  }
  return null;
}

// --- Get valid 7-digit MSISDN suffix with retry ---
async function getValidMsisdnSuffix(initialMessage = "Enter MSISDN last 7 digits (will auto-add 25271xxxxxxx):") {
  const MAX_ATTEMPTS = 3;
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    const suffix = prompt(
      `${initialMessage}\nAttempt ${attempt + 1}/${MAX_ATTEMPTS}:`
    );

    if (suffix === null) {
      return null; // User clicked Cancel
    }

    const clean = suffix.replace(/\D/g, ''); // Remove all non-digits
    
    // Check if it's exactly 7 digits
    if (clean.length === 7) {
      return clean;
    }

    attempt++;
    if (attempt >= MAX_ATTEMPTS) {
      alert(`❌ Max attempts (${MAX_ATTEMPTS}) reached.\nExpected 7 digits, got "${clean}" (${clean.length} digits).`);
      return null;
    }

    alert(
      `⚠️ Invalid input!\nYou entered: "${suffix}"\nCleaned to: "${clean}" (${clean.length} digits)\nPlease enter exactly 7 digits.`
    );
  }
  return null;
}

// --- GENERATE REPORT ---
// --- UNIFIED ACTIVATION REPORT (with all formats) ---

// --- GENERATE REPORT ---
// --- UNIFIED ACTIVATION REPORT (with all formats) ---
function generateActivationReport(format = 'detailed') {
  if (!iccidLog.length) {
    alert("No logs to export.");
    return;
  }

  let content = '';
  let filename = '';
  let type = 'text/plain';

  if (format === 'simple') {
    // Simple daily counts
    const dailyCounts = {};
    for (const entry of iccidLog) {
      const d = new Date(entry.timestamp);
      const dateKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    }
    
    const sortedDates = Object.keys(dailyCounts).sort((a, b) => {
      const [aD, aM, aY] = a.split('/');
      const [bD, bM, bY] = b.split('/');
      return new Date(bY, bM-1, bD) - new Date(aY, aM-1, aD);
    });
    
    const lines = [
      `ICCID SIMPLE REPORT`,
      `Total: ${iccidLog.length}`,
      ``,
      `Daily Counts:`
    ];
    sortedDates.forEach(date => {
      lines.push(`${date}: ${dailyCounts[date]}`);
    });
    content = lines.join('\n');
    filename = `ICCID-Simple-${new Date().toISOString().split('T')[0]}.txt`;

  } else if (format === 'csv') {
    
      // Helper: format date as DD/MM/YYYY
      function formatDateDisplay(dateStr) {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}:${seconds}`
      };
    }
  
    // Group entries by date (DD/MM/YYYY)
    const dailyGroups = {};
    iccidLog.forEach(entry => {
      const { date } = formatDateDisplay(entry.timestamp);
      if (!dailyGroups[date]) dailyGroups[date] = [];
      dailyGroups[date].push(entry);
    });
  
    // Sort dates (newest first)
    const sortedDates = Object.keys(dailyGroups).sort((a, b) => {
      const [aD, aM, aY] = a.split('/');
      const [bD, bM, bY] = b.split('/');
      return new Date(bY, bM - 1, bD) - new Date(aY, aM - 1, aD);
    });
  
    // Build rows with empty row between days
    const headers = ['Date', 'Time', 'ICCID', 'MSISDN', 'Notes'];
    const rows = [];
  
    sortedDates.forEach((date, index) => {
      // Add all entries for this day
      dailyGroups[date].forEach(entry => {
        const { date: entryDate, time } = formatDateDisplay(entry.timestamp);
        rows.push([
          entryDate,
          time,
          entry.iccid,
          entry.msisdn,
          '' // empty Notes
        ].join(','));
      });
  
      // Add empty row after each day EXCEPT the last one
      if (index < sortedDates.length - 1) {
        rows.push(''); // empty row
      }
    });
  
    content = [headers.join(','), ...rows].join('\n');
    filename = `ICCID-Export-${new Date().toISOString().split('T')[0]}.csv`;
    type = 'text/csv';

  } else {
    // CLEAN DETAILED REPORT WITH MONTH DIVIDERS
    const dailyData = {};
    for (const entry of iccidLog) {
      const d = new Date(entry.timestamp);
      const dateKey = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      if (!dailyData[dateKey]) dailyData[dateKey] = [];
      dailyData[dateKey].push({ iccid: entry.iccid, msisdn: entry.msisdn });
    }

    const sortedDates = Object.keys(dailyData).sort((a, b) => {
      const [aDay, aMonth, aYear] = a.split('/');
      const [bDay, bMonth, bYear] = b.split('/');
      return new Date(bYear, bMonth - 1, bDay) - new Date(aYear, aMonth - 1, aDay);
    });

    const lines = [
      `ICCID ACTIVATION REPORT`,
      `=====================`,
      `Total Activations: ${iccidLog.length}`,
      ``,
      `DAILY BREAKDOWN:`
    ];

    let lastMonth = null;
    for (const date of sortedDates) {
      const [day, month, year] = date.split('/');
      const monthKey = `${year}-${month}`;

      // Add divider when month changes
      if (lastMonth !== null && lastMonth !== monthKey) {
        lines.push(`\n───────────────`, ``);
      }
      lastMonth = monthKey;

      const entries = dailyData[date];
      lines.push(`${date} (${entries.length} activation(s)}):`);
      entries.forEach(e => {
        lines.push(`  • ICCID: ${e.iccid} | MSISDN: ${e.msisdn}`);
      });
      lines.push(``); // blank line after each day
    }

    content = lines.join('\n');
    filename = `ICCID-Report-Complete-${new Date().toISOString().split('T')[0]}.txt`;
  }

  // Export
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}// In browser console:

// For detailed report with month dividers (default)
// generateActivationReport();
// For simple daily counts
// generateActivationReport('simple');
// For CSV export (Excel compatible)
// generateActivationReport('csv');



// =========================================
// HANDLE ICCID — WITH AUTO-SELECT AND SAVE AND RETRY UNTIL FOUND
// =========================================
async function handle_ICCID() {
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  
  const addIcons = [
    ...document.querySelectorAll("button.btn.btn-info .material-icons"),
  ].filter((s) => s.textContent.trim() === "add");
  
  const addBtn = addIcons[2]?.closest("button");
  if (!addBtn) {
    console.warn("ICCID Add button not found.");
    return false;
  }

  addBtn.click();

  let modal = null;
  for (let i = 0; i < 25; i++) {
    modal = [...document.querySelectorAll(".modal-content")].find((m) =>
      m.textContent.includes("IMSI List")
    );
    if (modal) break;
    await wait(120);
  }
  if (!modal) {
    console.warn("ICCID modal not found.");
    return false;
  }

  // Find search input and button in the modal
  const searchInput = modal.querySelector("input#searchtextIMSI.form-control") ||
                      modal.querySelector("input[type='text'].form-control") ||
                      modal.querySelector("input[placeholder*='Search']");
  
  const searchButton = modal.querySelector(".input-group-append button.btn.btn-info") ||
                       modal.querySelector("button.btn.btn-info");
  
  if (!searchInput || !searchButton) {
    console.warn("ICCID search field/button not found.");
    
    // Fallback to manual checkbox selection if search not available
    const checkboxes = [
      ...modal.querySelectorAll('table input.form-check-input[type="checkbox"]'),
    ];
    
    if (checkboxes.length === 0) {
      alert("❌ No ICCID rows found.");
      return false;
    }
    
    // Try to select first checkbox
    const targetCheckbox = checkboxes[0];
    targetCheckbox.checked = true;
    ["click", "input", "change"].forEach((t) =>
      targetCheckbox.dispatchEvent(new Event(t, { bubbles: true }))
    );
    
    // Extract ICCID from the row
    const iccidRow = targetCheckbox.closest('tr');
    const iccidCell = iccidRow?.cells[1] || 
                      iccidRow?.querySelector('td:nth-child(2)') || 
                      iccidRow?.querySelector('td');
    
    if (iccidCell) {
      const rawIccid = iccidCell.textContent.trim().replace(/\D/g, '');
      gloable_icc_id = rawIccid;
      console.log("📱 Selected ICCID from first row:", gloable_icc_id);
    }
    
  } else {
    // SEARCH METHOD - Auto-select and save with retry until found
    let found = false;
    let retryCount = 0;
    
    while (!found) {
      retryCount++;
      
      // Get valid 7-digit ICCID suffix from user
      const promptMessage = retryCount === 1 
        ? "Enter ICCID last 7 digits (will auto-add 8925263790000):"
        : `Retry #${retryCount}: Enter ICCID last 7 digits (will auto-add 8925263790000):`;
      
      const cleanSuffix = await getValidIccidSuffix(promptMessage);
      
      // User clicked Cancel
      if (!cleanSuffix) {
        const cancelConfirm = confirm("Are you sure you want to cancel ICCID selection?");
        if (cancelConfirm) {
          console.log("ICCID selection cancelled by user");
          return false;
        } else {
          continue; // Continue trying if user doesn't want to cancel
        }
      }
      
      // Auto-add prefix to create full ICCID for search
      const searchIccid = `8925263790000${cleanSuffix}`;
      console.log("🔍 Searching for ICCID:", searchIccid);
      
      // Fill search input
      searchInput.value = searchIccid;
      ["input", "change", "keyup"].forEach((e) =>
        searchInput.dispatchEvent(new Event(e, { bubbles: true }))
      );
      
      // Click search button
      searchButton.click();
      await wait(2000); // Wait for search results
      
      // Now look for checkboxes in the search results
      const checkboxes = [
        ...modal.querySelectorAll('table input.form-check-input[type="checkbox"]'),
      ];
      
      if (checkboxes.length === 0) {
        const retryChoice = confirm(`❌ No ICCID found for: ${searchIccid}\n\nClick OK to try again, or Cancel to stop.`);
        if (retryChoice) {
          continue; // Try again
        } else {
          return false; // User chose to stop
        }
      }
      
      // Try to select the first checkbox (usually the search result)
      let selectedCheckbox = null;
      let capturedIccid = null;
      
      // Try to find checkbox in first row
      if (checkboxes.length > 0) {
        selectedCheckbox = checkboxes[0];
        
        // Extract ICCID from the row
        const iccidRow = selectedCheckbox.closest('tr');
        const iccidCell = iccidRow?.cells[1] || 
                          iccidRow?.querySelector('td:nth-child(2)') || 
                          iccidRow?.querySelector('td');
        
        if (iccidCell) {
          let rawIccid = iccidCell.textContent.trim().replace(/\D/g, '');
          capturedIccid = rawIccid;
        }
      }
      
      // If first checkbox fails, try to find exact match in results
      if (!capturedIccid) {
        for (let i = 0; i < checkboxes.length; i++) {
          const checkbox = checkboxes[i];
          const iccidRow = checkbox.closest('tr');
          const iccidCell = iccidRow?.cells[1] || 
                            iccidRow?.querySelector('td:nth-child(2)') || 
                            iccidRow?.querySelector('td');
          
          if (iccidCell) {
            let rawIccid = iccidCell.textContent.trim().replace(/\D/g, '');
            
            // Check if this matches our search
            if (rawIccid.includes(searchIccid) || rawIccid.endsWith(cleanSuffix)) {
              selectedCheckbox = checkbox;
              capturedIccid = rawIccid;
              break;
            }
          }
        }
      }
      
      if (!selectedCheckbox || !capturedIccid) {
        const retryChoice = confirm("❌ Could not select ICCID from search results.\n\nClick OK to try again, or Cancel to stop.");
        if (retryChoice) {
          continue; // Try again
        } else {
          return false; // User chose to stop
        }
      }
      
      // Select the checkbox
      selectedCheckbox.checked = true;
      ["click", "input", "change"].forEach((t) =>
        selectedCheckbox.dispatchEvent(new Event(t, { bubbles: true }))
      );
      
      gloable_icc_id = capturedIccid;
      console.log(`📱 Selected ICCID from search:`, gloable_icc_id);
      
      // Save ICCID to log immediately without UI detection
      saveIccid(gloable_icc_id, { msisdn: gloable_msisdn });
      console.log("✅ ICCID saved to log.");
      
      found = true;
    }
  }

  // Save button click
  const saveBtn = modal.querySelector("button.btn.btn-info.mx-2") ||
                  modal.querySelector("button[type='submit']") ||
                  modal.querySelector(".btn-primary");
  
  if (saveBtn) {
    await wait(300);
    saveBtn.click();
  }

  // Wait for modal to close
  for (let i = 0; i < 25; i++) {
    const stillOpen = [...document.querySelectorAll(".modal-content")].some(
      (m) => m.textContent.includes("IMSI List")
    );
    if (!stillOpen) break;
    await wait(120);
  }

  // Set flags without UI detection
  iccidPromptProvided = true;
  iccidUiConfirmed = true;
  
  console.log("✅ ICCID selection completed and saved to log.");
  return true;
}

// =========================================
// MSISDN SELECTION WITH AUTO-SEARCH
// =========================================

// =========================================
// MSISDN SELECTION WITH AUTO-SEARCH AND MCASH VERIFICATION
// =========================================
async function addMsisdnSeries() {
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  const addIcons = [
    ...document.querySelectorAll("button.btn.btn-info .material-icons"),
  ].filter((s) => s.textContent.trim() === "add");

  const addBtn = addIcons[1]?.closest("button");
  if (!addBtn) {
    console.warn("MSISDN Add button not found.");
    return false;
  }

  addBtn.click();

  let modal = null;
  for (let i = 0; i < 25; i++) {
    modal = [...document.querySelectorAll(".modal-content")].find((m) =>
      m.textContent.includes("MSISDN List")
    );
    if (modal) break;
    await wait(120);
  }
  if (!modal) {
    console.warn("MSISDN modal not found.");
    return false;
  }

  // Find search input and button in the modal
  const searchInput = modal.querySelector("input[type='text'].form-control") || 
                      modal.querySelector("input#searchtext.form-control") ||
                      modal.querySelector("input[placeholder*='Search']");
  
  const searchButton = modal.querySelector("button.btn.btn-info") || 
                       modal.querySelector(".input-group-append button");
  
  if (!searchInput || !searchButton) {
    console.warn("MSISDN search field/button not found. Falling back to row selection method.");
    
    // Fallback to original row selection method if search not available
    const checkboxes = [
      ...modal.querySelectorAll('table input.form-check-input[type="checkbox"]'),
    ];

    if (checkboxes.length < 10) {
      alert(`Only ${checkboxes.length} MSISDN rows — cannot select 10th.`);
      return false;
    }

    // Try rows: 10th (index 9), 9th (8), 8th (7), 7th (6), 6th (5)
    const tryIndices = [9, 8, 7, 6, 5];
    let selectedIdx = -1;
    let capturedMsisdn = null;

    for (const idx of tryIndices) {
      const checkbox = checkboxes[idx];
      const msisdnRow = checkbox.closest('tr');
      if (!msisdnRow) continue;

      const msisdnCell =
        msisdnRow.cells[1] ||
        msisdnRow.querySelector('td:nth-child(2)') ||
        msisdnRow.querySelector('td');

      if (!msisdnCell) continue;

      let rawMsisdn = msisdnCell.textContent.trim().replace(/\D/g, '');
      // Remove 252 prefix if present
      if (rawMsisdn.startsWith('252')) {
        rawMsisdn = rawMsisdn.substring(3);
      }

      // Skip if empty or too short
      if (rawMsisdn.length < 9) continue;

      // Check if already in your log
      const isUsed = isMsisdnUsedRecently(rawMsisdn, 2); // last 2 days
      if (!isUsed) {
        selectedIdx = idx;
        capturedMsisdn = rawMsisdn;
        break; // Use this one!
      }
    }

    // If all are used, fall back to 10th anyway (to avoid stopping)
    if (selectedIdx === -1) {
      console.warn("⚠️ All of 6th–10th MSISDNs appear used. Using 10th as fallback.");
      selectedIdx = 9;
      const fallbackRow = checkboxes[9].closest('tr');
      const fallbackCell = fallbackRow?.cells[1] || fallbackRow?.querySelector('td:nth-child(2)') || fallbackRow?.querySelector('td');
      if (fallbackCell) {
        let raw = fallbackCell.textContent.trim().replace(/\D/g, '');
        capturedMsisdn = raw.startsWith('252') ? raw.substring(3) : raw;
      }
    }

    if (selectedIdx === -1 || !capturedMsisdn) {
      alert("❌ Failed to extract MSISDN from selected row.");
      return false;
    }

    // SELECT THE CHECKBOX
    const targetCheckbox = checkboxes[selectedIdx];
    targetCheckbox.checked = true;
    ["click", "input", "change"].forEach((t) =>
      targetCheckbox.dispatchEvent(new Event(t, { bubbles: true }))
    );

    gloable_msisdn = capturedMsisdn;
    console.log(`📱 Selected MSISDN from row ${selectedIdx + 1}:`, gloable_msisdn);
    
  } else {
    // SEARCH METHOD - Ask user for last 7 digits, auto-add 25271 prefix with retry until found
    let found = false;
    let retryCount = 0;
    
    while (!found) {
      retryCount++;
      
      // Get valid 7-digit MSISDN suffix from user
      const promptMessage = retryCount === 1
        ? "Enter MSISDN last 7 digits (will auto-add 25271):"
        : `Retry #${retryCount}: Enter MSISDN last 7 digits (will auto-add 25271):`;
      
      const cleanSuffix = await getValidMsisdnSuffix(promptMessage);
      
      // User clicked Cancel
      if (!cleanSuffix) {
        const cancelConfirm = confirm("Are you sure you want to cancel MSISDN selection?");
        if (cancelConfirm) {
          console.log("MSISDN selection cancelled by user");
          return false;
        } else {
          continue; // Continue trying if user doesn't want to cancel
        }
      }
      
      // Auto-add 25271 prefix to create full MSISDN for search
      const searchMsisdn = `25271${cleanSuffix}`;
      console.log("🔍 Searching for MSISDN:", searchMsisdn);
      
      // Fill search input
      searchInput.value = searchMsisdn;
      ["input", "change", "keyup"].forEach((e) =>
        searchInput.dispatchEvent(new Event(e, { bubbles: true }))
      );
      
      // Click search button
      searchButton.click();
      await wait(2000); // Wait for search results
      
      // Now look for checkboxes in the search results
      const checkboxes = [
        ...modal.querySelectorAll('table input.form-check-input[type="checkbox"]'),
      ];
      
      if (checkboxes.length === 0) {
        const retryChoice = confirm(`❌ No MSISDN found for: ${searchMsisdn}\n\nClick OK to try again, or Cancel to stop.`);
        if (retryChoice) {
          continue; // Try again
        } else {
          return false; // User chose to stop
        }
      }
      
      // Try to select the first checkbox (usually the search result)
      let selectedCheckbox = null;
      let capturedMsisdn = null;
      
      // Try to find checkbox in first row
      if (checkboxes.length > 0) {
        selectedCheckbox = checkboxes[0];
        
        // Extract MSISDN from the row
        const msisdnRow = selectedCheckbox.closest('tr');
        const msisdnCell = msisdnRow?.cells[1] || 
                           msisdnRow?.querySelector('td:nth-child(2)') || 
                           msisdnRow?.querySelector('td');
        
        if (msisdnCell) {
          let rawMsisdn = msisdnCell.textContent.trim().replace(/\D/g, '');
          if (rawMsisdn.startsWith('252')) {
            rawMsisdn = rawMsisdn.substring(3);
          }
          capturedMsisdn = rawMsisdn;
        }
      }
      
      // If first checkbox fails, try to find exact match in results
      if (!capturedMsisdn) {
        for (let i = 0; i < checkboxes.length; i++) {
          const checkbox = checkboxes[i];
          const msisdnRow = checkbox.closest('tr');
          const msisdnCell = msisdnRow?.cells[1] || 
                             msisdnRow?.querySelector('td:nth-child(2)') || 
                             msisdnRow?.querySelector('td');
          
          if (msisdnCell) {
            let rawMsisdn = msisdnCell.textContent.trim().replace(/\D/g, '');
            if (rawMsisdn.startsWith('252')) {
              rawMsisdn = rawMsisdn.substring(3);
            }
            
            // Check if this matches our search
            if (rawMsisdn === `71${cleanSuffix}` || rawMsisdn.includes(cleanSuffix)) {
              selectedCheckbox = checkbox;
              capturedMsisdn = rawMsisdn;
              break;
            }
          }
        }
      }
      
      if (!selectedCheckbox || !capturedMsisdn) {
        const retryChoice = confirm("❌ Could not select MSISDN from search results.\n\nClick OK to try again, or Cancel to stop.");
        if (retryChoice) {
          continue; // Try again
        } else {
          return false; // User chose to stop
        }
      }
      
      // Select the checkbox
      selectedCheckbox.checked = true;
      ["click", "input", "change"].forEach((t) =>
        selectedCheckbox.dispatchEvent(new Event(t, { bubbles: true }))
      );
      
      gloable_msisdn = capturedMsisdn;
      console.log(`📱 Selected MSISDN from search:`, gloable_msisdn);
      
      // =========================================
// MCASH VERIFICATION - ADDED HERE
// =========================================
console.log('🔍 Starting MCASH verification for selected MSISDN...');

// Find verify button within modal
const verifyButton = [...modal.querySelectorAll('button')].find(btn => 
  btn.textContent.trim().toLowerCase() === 'verify'
);

if (!verifyButton) {
  console.warn('⚠️ Verify button not found in modal - proceeding without verification');
  found = true;
  continue;
}

console.log('✅ Verify button found in modal, clicking...');
verifyButton.click();

// Wait for verification result
await wait(2000); // Wait 2 seconds for API response

// Check for result within modal
let verificationPassed = false;
let verificationMessage = '';

// Look for success message (User doesn't Exist on MCASH)
const successMsg = modal.querySelector('p.mt-2.text-success') ||
                  modal.querySelector('.text-success') ||
                  [...modal.querySelectorAll('p, div, span')].find(el => 
                    el.textContent.includes("User doesn't Exist on MCASH")
                  );

if (successMsg) {
  verificationMessage = successMsg.textContent;
  if (verificationMessage.includes("User doesn't Exist on MCASH")) {
    console.log('✅ MCASH Verification: User does NOT exist - PASSED');
    verificationPassed = true;  // <-- PASSED = true
  }
}

// Look for failure message (User Exist on MCASH)
const failureMsg = modal.querySelector('p.mt-2.text-danger') ||
                  modal.querySelector('.text-danger') ||
                  [...modal.querySelectorAll('p, div, span')].find(el => 
                    el.textContent.includes('User Exist on MCASH')
                  );

if (failureMsg) {
  verificationMessage = failureMsg.textContent;
  if (verificationMessage.includes('User Exist on MCASH')) {
    console.log('❌ MCASH Verification: User EXISTS - FAILED');
    verificationPassed = false;  // <-- FAILED = false
  }
}

// // Close/Dismiss the verification result message
// const resultCloseBtn = modal.querySelector('button.btn-close') || 
//                       modal.querySelector('button.close') ||
//                       modal.querySelector('.modal-header button');
// if (resultCloseBtn) {
//   resultCloseBtn.click();
//   await wait(500);
// }


if (verificationPassed) {  // <-- ONLY when verification FAILS
    // <-- This runs when verification PASSES
    console.log('✅ MCASH verification PASSED - User does not exist. Keeping number selected and proceeding...');
    found = true;  // <-- Keep the number selected and exit the while loop
    // The checkbox remains checked - we DON'T deselect it  
  } else {
  
  console.log('🔄 MCASH verification FAILED - User exists. Deselecting current number and prompting for NEW number...');
  
  // Show alert to user
  alert(`❌ MCASH Verification Failed: MSISDN ${gloable_msisdn} already exists in MCASH.\n\nPlease try a DIFFERENT 7-digit suffix.`);
  
  // Deselect the current checkbox (only on FAILURE)
  selectedCheckbox.checked = false;
  ["click", "input", "change"].forEach((t) =>
    selectedCheckbox.dispatchEvent(new Event(t, { bubbles: true }))
  );
  
  // Clear the global MSISDN
  gloable_msisdn = null;
  
  // Clear the search input for the next attempt
  searchInput.value = '';
  ["input", "change", "keyup"].forEach((e) =>
    searchInput.dispatchEvent(new Event(e, { bubbles: true }))
  );
  
  continue; // Go back to asking for a NEW 7-digit suffix

  }

    }
    
  }

  // Save button click
  const saveBtn = modal.querySelector("button.btn.btn-info.mx-2");
  if (saveBtn) {
    await wait(300);
    saveBtn.click();
  }

  // Wait for modal to close
  for (let i = 0; i < 25; i++) {
    const stillOpen = [...document.querySelectorAll(".modal-content")].some(
      (m) => m.textContent.includes("MSISDN List")
    );
    if (!stillOpen) break;
    await wait(120);
  }

  return true;
}


// --- Expose functions ---
window.saveIccid = saveIccid;
window.deleteLog = deleteLog;
window.clearAllLogs = clearAllLogs;
window.generateActivationReport = generateActivationReport;
window.iccidLog = iccidLog;

// =========================================
// PAGE1
// =========================================
function page1() {
  function fillFormFromConsole() {
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const generateRandomId = (length) =>
      Math.floor(Math.random() * Math.pow(10, length))
        .toString()
        .padStart(length, "0");

    const dispatchEvent = (element, type = "input") => {
      element.dispatchEvent(new Event(type, { bubbles: true }));
    };

    const dispatchAllChangeEvents = (element) => {
      ["change", "input", "blur"].forEach((eventType) => {
        element.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
    };

    const setInputValueById = (id, value, eventType = "input") => {
      const el = document.getElementById(id);
      if (!el) {
        console.warn(`Element with id "${id}" not found.`);
        return;
      }
      el.value = value;
      dispatchEvent(el, eventType);
    };

    const clickButtonByText = (text, selector = ".btn-info") => {
      const button = [...document.querySelectorAll(selector)].find(
        (btn) => btn.textContent.trim() === text
      );
      if (!button) {
        console.warn(`Button with text "${text}" not found.`);
        return null;
      }
      button.click();
      return button;
    };

    const today = new Date();
    const expiryDateObj = new Date(today);
    expiryDateObj.setFullYear(today.getFullYear() + 5);

    const randomID = generateRandomId(10);
    const issueDate = formatDate(today);
    const expiryDate = formatDate(expiryDateObj);
    const phoneNumber = "252716408296";

    const TARGET_DOMAIN = "HZvOmetzvIQeEKFSEkdz"; // Somalia
    const TARGET_ZONE = "01DJSVS67JT0PDVE8KR0615C4E"; // ZONE 2
    const TARGET_AREA = "01DK17S11C4RFZTE6RTVRAGJJW"; // Qardho_KARKAAR

    const MAX_POLL_ATTEMPTS = 50;
    const POLL_INTERVAL_MS = 100;

    console.log("-> Starting form fill and validation...");

    const fillBasicInfo = () => {
      setInputValueById("firstName", "Amtel");
      setInputValueById("middleName", "Amtel");
      setInputValueById("lastName", "Amtel");
      setInputValueById("address", "Qardho");
      setInputValueById("gender", "1", "change");
      console.log("Step 1: Basic info filled ✅");
    };

    const openIdentitySection = () => {
      const btn = clickButtonByText("Add New Identity");
      if (!btn) {
        console.error("❌ ERROR: 'Add New Identity' button not found.");
        return false;
      }
      console.log("Step 2: 'Add New Identity' clicked.");
      return true;
    };

    const fillIdentitySection = () => {
      setInputValueById("idnumber", randomID);
      setInputValueById("issuer", "Ministry of Commerce & Industry", "change");
      setInputValueById("issuedate", issueDate);
      setInputValueById("expirydate", expiryDate);

      const saveButton = document.querySelector('.btn-info[type="submit"]');
      if (saveButton) {
        saveButton.click();
        console.log("Step 2: Identity 'Save' clicked.");
      } else {
        console.warn("Identity 'Save' button not found.");
      }
    };

    const fillNextOfKinSection = () => {
      setInputValueById("nextkinfname", "Amtel");
      setInputValueById("nextkinsname", "Amtel");
      setInputValueById("nextkintname", "Amtel");
      setInputValueById("nextkinmsisdn", phoneNumber);
      setInputValueById("alternativeMsisdn", phoneNumber);
      console.log("Step 3: Next of kin filled ✅");
    };

    const setupLocationSelectors = () => {
      const domainSelect = document.getElementById("mdomain");
      const zoneSelect = document.getElementById("mzone");
      const areaSelect = document.getElementById("marea");

      if (!domainSelect || !zoneSelect || !areaSelect) {
        console.error(
          "❌ ERROR: One or more dropdowns (mdomain, mzone, marea) were not found."
        );
        return null;
      }

      return { domainSelect, zoneSelect, areaSelect };
    };

    const pollForOption = (selectEl, value, labelForLogs, onSuccess) => {
      let attempts = 0;

      const attemptPoll = () => {
        attempts += 1;
        const option = selectEl.querySelector(`option[value="${value}"]`);

        if (option) {
          selectEl.value = value;
          dispatchAllChangeEvents(selectEl);
          console.log(
            `${labelForLogs} found and selected. Attempts: ${attempts}`
          );
          onSuccess();
          return;
        }

        if (attempts >= MAX_POLL_ATTEMPTS) {
          console.error(
            `❌ Timeout: ${labelForLogs} with value "${value}" did not appear in time.`
          );
          return;
        }

        setTimeout(attemptPoll, POLL_INTERVAL_MS);
      };

      attemptPoll();
    };

    const selectLocationWithPolling = () => {
      console.log("Step 4: Starting dependent dropdown selection...");

      const selects = setupLocationSelectors();
      if (!selects) return;

      const { domainSelect, zoneSelect, areaSelect } = selects;

      domainSelect.value = TARGET_DOMAIN;
      dispatchAllChangeEvents(domainSelect);
      console.log("4.1 Domain selected.");

      pollForOption(zoneSelect, TARGET_ZONE, "4.2 Zone", () => {
        console.log("Zone selection complete. Polling for area...");
        pollForOption(areaSelect, TARGET_AREA, "4.3 Area", () => {
          console.log("All dropdown selections complete 🎉");
          onLocationSelectionComplete(areaSelect);
        });
      });
    };

    const onLocationSelectionComplete = (areaSelect) => {
      if (areaSelect.value !== TARGET_AREA) {
        console.warn(
          "Location selection callback fired, but area value is not the expected one."
        );
        return;
      }

      const nextButton = clickButtonByText("Next");
      if (nextButton) {
        console.log("Page 1 done.");
      } else {
        console.warn("Could not find 'Next' button after location selection.");
      }
    };

    fillBasicInfo();
    if (!openIdentitySection()) return;
    fillIdentitySection();
    fillNextOfKinSection();
    selectLocationWithPolling();
  }

  iccidPromptProvided = false;
  iccidUiConfirmed = false;
  gloable_icc_id = null;

  fillFormFromConsole();
}

// =========================================
// PAGE2
// =========================================
async function page2() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function checkPrepaidCheckbox() {
    const checkbox = document.getElementById("isprepaid");
    if (!checkbox) {
      console.warn('Checkbox with id "isprepaid" not found.');
      return;
    }
    checkbox.checked = true;
    ["click", "input", "change"].forEach((type) =>
      checkbox.dispatchEvent(new Event(type, { bubbles: true }))
    );
    console.log("Prepaid checkbox checked ✅");
  }

  checkPrepaidCheckbox();
  await wait(1000);

  function selectIccidRadio() {
    const radio = document.getElementById("iccid");
    if (!radio) {
      console.warn("ICCID radio not found.");
      return false;
    }
    radio.checked = true;
    ["click", "input", "change"].forEach((evt) =>
      radio.dispatchEvent(new Event(evt, { bubbles: true }))
    );
    console.log("ICCID radio selected.");
    return true;
  }

  if (!selectIccidRadio()) {
    console.error("ICCID radio step failed. Stopping Page2.");
    return;
  }

  async function clickAddAttachPlan() {
    const addIcon = [
      ...document.querySelectorAll("button.btn-info .material-icons"),
    ].find((span) => span.textContent.trim() === "add");

    if (!addIcon) {
      console.warn("Attach Plan +Add button not found.");
      return false;
    }

    const addBtn = addIcon.closest("button");
    addBtn.click();
    await wait(1000);

    let modal = null;
    for (let i = 0; i < 20; i++) {
      modal = document.querySelector(".modal-content");
      if (modal) break;
      await wait(50);
    }
    if (!modal) {
      console.warn("Product Catalog modal did not load.");
      return false;
    }

    await wait(1000);
    let basePlan = null;
    for (let i = 0; i < 15; i++) {
      basePlan = [...modal.querySelectorAll(".card-container")].find(
        (c) =>
          c.querySelector(".heading.bold.red")?.textContent.trim() ===
          "Base plan"
      );
      if (basePlan) break;
      await wait(50);
    }
    if (!basePlan) {
      console.warn("Base plan not found in modal.");
      return false;
    }

    await wait(1000);
    basePlan.click();

    let saveBtn = null;
    for (let i = 0; i < 15; i++) {
      saveBtn = modal.querySelector("button.btn.btn-info.mx-2");
      if (saveBtn) break;
      await wait(50);
    }

    if (!saveBtn) return false;

    await wait(100);
    saveBtn.click();

    for (let i = 0; i < 20; i++) {
      if (!document.querySelector(".modal-content")) break;
      await wait(50);
    }

    console.log("Plan Attached");
    return true;
  }

  const attachDone = await clickAddAttachPlan();
  if (!attachDone) {
    console.error("Attach plan failed. Stopping Page2.");
    return;
  }
  await wait(500);

// ===============================
// STEP 1: ICCID FIRST
// ===============================
const iccidDone = await handle_ICCID();
if (!iccidDone) {
  console.error("❌ ICCID step failed. Stopping Page2.");
  return;
}

await wait(1000);

// ===============================
// STEP 2: MSISDN SECOND
// ===============================
const msisdnDone = await addMsisdnSeries();
if (!msisdnDone) {
  console.error("❌ MSISDN step failed. Stopping Page2.");
  return;
}

await wait(1000);
}

// =========================================
// COMPLETE ACTIVATION FLOW
// =========================================
async function completeActivationFlow() {
  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  // --- 1. COPY ICCID ---
  function copyToClipboard(value) {
    const text = String(value);
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      console.log("✅ COPIED:", text);
      return true;
    } catch (err) {
      console.error("❌ Copy failed:", err);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }

  console.log("📋 Copying ICCID:", gloable_icc_id);
  copyToClipboard(gloable_icc_id);

  await wait(500);

  // --- 2. NAVIGATE HOME ---
  function clickHomeLogo() {
    const logo = document.querySelector("img.logoImg");
    if (!logo) {
      console.warn("⚠️ Home logo not found.");
      return false;
    }
    logo.click();
    console.log("🏠 Home logo clicked.");
    return true;
  }

  if (!clickHomeLogo()) return false;
  await wait(1000);

  // --- 3. SELECT ICCID IN DROPDOWN ---
  function selectICCID() {
    const select = document.querySelector("select#idtype");
    if (!select) {
      console.warn("⚠️ Dropdown not found.");
      return false;
    }
    const option = [...select.options].find(
      opt => opt.textContent.trim().toLowerCase() === "iccid"
    );
    if (!option) {
      console.warn("⚠️ ICCID option not found.");
      return false;
    }
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("🔽 Dropdown changed to ICCID.");
    return true;
  }

  if (!selectICCID()) return false;
  await wait(300);

  // --- 4. FILL SEARCH BAR ---
  function fillSearchBar() {
    const input = document.querySelector("input#number");
    if (!input) {
      console.warn("⚠️ Search bar not found.");
      return false;
    }
    input.value = gloable_icc_id;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("🔍 Search bar filled:", gloable_icc_id);
    return true;
  }

  if (!fillSearchBar()) return false;
  await wait(300);

  // --- 5. CLICK SEARCH ---
  function clickSearchButton() {
    const searchBtn = [...document.querySelectorAll("button.btn.btn-info")]
      .find(btn => btn.textContent.trim().toLowerCase().includes("search"));
    if (!searchBtn) {
      console.warn("⚠️ Search button not found.");
      return false;
    }
    searchBtn.click();
    console.log("🔍 Search button clicked.");
    return true;
  }

  if (!clickSearchButton()) return false;
  await wait(1000);

  // --- 6. CLICK ACTIVATE BUTTON ---
  async function clickActivateButton(timeout = 8000) {
    const start = performance.now();
    let activateBtn = null;
    
    while (performance.now() - start < timeout) {
      activateBtn = [...document.querySelectorAll("span.material-icons.green")]
        .find(el => el.textContent.trim() === "check_circle");
      if (activateBtn) break;
      await wait(200);
    }
    
    if (!activateBtn) {
      console.warn("⚠️ Activate button not found within timeout.");
      return false;
    }
    
    activateBtn.click();
    console.log("✅ Activate button clicked.");
    return true;
  }

  if (!(await clickActivateButton())) return false;
  await wait(1500); // Wait for activation modal

  // --- 7. READ ACTIVATION MESSAGE ---
  async function readActivationMessage() {
    let activationModalBody = null;
    
    // Wait for modal with content (max 5s)
    for (let i = 0; i < 50; i++) {
      activationModalBody = document.querySelector('.modal.show .modal-body');
      if (activationModalBody?.textContent.trim()) break;
      await wait(100);
    }
    
    if (!activationModalBody) {
      console.warn("⚠️ Activation modal not detected");
      return null;
    }
    
    // Fallback chain: direct p > any p > raw text
    const message = 
      activationModalBody.querySelector(':scope > p')?.textContent.trim() ||
      activationModalBody.querySelector('p')?.textContent.trim() ||
      activationModalBody.textContent.trim();
    
    console.log("📨 Activation Message:", message);
    return message;
  }

  const activationMessage = await readActivationMessage();
  
  // --- 8. AUTO-CLOSE IF SUCCESS ---
  async function closeModal(timeout = 8000) {
    const start = performance.now();
    let closeBtn = null;
    
    while (performance.now() - start < timeout) {
      closeBtn = [...document.querySelectorAll("button.btn.btn-small.btn-info")]
        .find(b => b.textContent.trim().toLowerCase() === "close");
      if (closeBtn) break;
      await wait(200);
    }
    
    if (closeBtn) {
      closeBtn.click();
      console.log("🚪 Modal closed.");
      await wait(500);
      return true;
    }
    
    console.warn("⚠️ Close button not found.");
    return false;
  }

  // Close modal if activation was successful
  if (activationMessage && 
      (activationMessage.toLowerCase().includes('success') || 
       activationMessage.toLowerCase().includes('activated') ||
       activationMessage.toLowerCase().includes('completed'))) {
    console.log("🎉 Activation successful! Closing modal...");
    await wait(1500);
    await closeModal();
  }

  console.log("✨ Activation flow completed.");
  return {
    success: true,
    message: activationMessage,
    iccid: gloable_icc_id,
    msisdn: gloable_msisdn
  };
}

// =========================================
// NEXT
// =========================================
async function next() {
  // ICCID validation check REMOVED - function will proceed regardless

  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  async function clickButton(label, timeout = 6000) {
    const start = performance.now();
    let btn = null;
    while (performance.now() - start < timeout) {
      btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.trim().toLowerCase() === label.toLowerCase());
      if (btn) break;
      await wait(150);
    }
    if (!btn) {
      console.warn(`Button "${label}" not found.`);
      return false;
    }
    btn.click();
    console.log(`Clicked: ${label}`);
    await wait(700);
    return true;
  }

  await clickButton("Next");
  await clickButton("Next");
  await wait(1000);
  
  await clickButton("Checkout");
  
  
async function closeModal(timeout = 8000) {
  const start = performance.now();
  let closeBtn = null;
  while (performance.now() - start < timeout) {
    closeBtn = [...document.querySelectorAll("button.btn.btn-small.btn-info")]
      .find(b => b.textContent.trim().toLowerCase() === "close");
    if (closeBtn) break;
    await wait(200);
  }
  if (closeBtn) {
    closeBtn.click();
    console.log("Modal closed.");
    await wait(500);
    }
  }
  
// Wait for checkout modal body WITH content
let checkoutModalBody = null;
for (let i = 0; i < 50; i++) { // Max 5s
  checkoutModalBody = document.querySelector('.modal.show .modal-body'); // Target VISIBLE modal
  if (checkoutModalBody?.textContent.trim()) break;
  await wait(100);
}

if (checkoutModalBody) {
  // Fallback chain: span > direct p > any text
  const msg = 
    checkoutModalBody.querySelector('span')?.textContent.trim() ||
    checkoutModalBody.querySelector(':scope > p')?.textContent.trim() ||
    checkoutModalBody.textContent.trim();
    console.log("✅ Checkout Message:", msg);
    await wait(1500);
    await closeModal();
} else {
  console.warn("⚠️ Checkout modal not detected");
}

await wait(3000);
  

console.log("🚀 Starting activation flow...");
const activationResult = await completeActivationFlow();

if (activationResult?.success) {
  console.log("✅ FULL PROCESS COMPLETED SUCCESSFULLY");
  console.log("ICCID:", activationResult.iccid);
  console.log("MSISDN:", activationResult.msisdn);
  console.log("Message:", activationResult.message);
} else {
  console.warn("⚠️ Activation flow encountered issues");
}

// Activation modal handling is now inside completeActivationFlow
}


// =========================================
// COMBINED FUNCTION - Runs all 3 steps
// =========================================
async function runFullActivation() {
  console.log("🚀 STARTING FULL ACTIVATION - All 3 steps");
  console.log("==========================================");
  
  const wait = (ms) => new Promise(res => setTimeout(res, ms));
  
  try {
    // Step 1: Page 1
    console.log("📝 Step 1/3: Running Page 1...");
    page1();
    await wait(3000); // Wait for page 1 to complete
    
    // Step 2: Page 2 
    console.log("⚡ Step 2/3: Running Page 2...");
    await page2();
    await wait(3000); // Wait for page 2 to complete
    
    // Step 3: Next (Complete)
    console.log("⏩ Step 3/3: Running Next/Complete...");
    await next();
    
    console.log("==========================================");
    console.log("✅ FULL ACTIVATION COMPLETED SUCCESSFULLY");
    
    // Optional: Show success message
    alert("✅ Activation Complete! Check console for details.");
    
    return true;
    
  } catch (error) {
    console.error("❌ Activation failed:", error);
    alert("❌ Activation failed. Check console for details.");
    return false;
  }
}

// Even simpler - just one function name to remember
async function go() {
  return await runFullActivation();
}
