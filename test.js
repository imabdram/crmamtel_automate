let gloable_icc_id = null

// =========================================
// SIMPLE ICCID LOGGER (WITH AUTO-SAVE)
// =========================================
let iccidLog = JSON.parse(localStorage.getItem('iccidLog') || '[]');
let logCount = parseInt(localStorage.getItem('iccidCount') || '0');

function saveIccid(iccid) {
  logCount++;
  iccidLog.push({
    id: logCount,
    time: new Date().toLocaleString('en-US', { timeZone: 'Africa/Mogadishu' }),
    iccid: iccid
  });
  localStorage.setItem('iccidLog', JSON.stringify(iccidLog));
  localStorage.setItem('iccidCount', logCount);
  console.log(`📝 #${logCount}: ${iccid}`);
}

// // 
// Clear everything:
// iccidLog = [];
// logCount = 0;
// localStorage.setItem('iccidLog', JSON.stringify(iccidLog));
// localStorage.setItem('iccidCount', logCount);
// //

function download_log() {
  if (!iccidLog.length) return;
  const csv = [
    'ID,Time,ICCID',
    ...iccidLog.map(e =>
      `${e.id},"${e.time}","=""${e.iccid}"""` // force Excel to text
    )
  ].join('\n');

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `ICCID-Logs/${new Date().toISOString().split('T')[0]}-${logCount}.csv`;
  a.click();
}



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

    // Simple sleep helper (kept in case you want manual waits later)
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // =========================
    // Static data
    // =========================

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

    // =========================
    // Step 1: Basic info
    // =========================

    const fillBasicInfo = () => {
      setInputValueById("firstName", "Amtel");
      setInputValueById("middleName", "Amtel");
      setInputValueById("lastName", "Amtel");
      setInputValueById("address", "Qardho");
      setInputValueById("gender", "1", "change");
      console.log("Step 1: Basic info filled ✅");
    };

    // =========================
    // Step 2: Identity section
    // =========================

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

    // =========================
    // Step 3: Next of kin
    // =========================

    const fillNextOfKinSection = () => {
      setInputValueById("nextkinfname", "Amtel");
      setInputValueById("nextkinsname", "Amtel");
      setInputValueById("nextkintname", "Amtel");
      setInputValueById("nextkinmsisdn", phoneNumber);
      setInputValueById("alternativeMsisdn", phoneNumber);
      console.log("Step 3: Next of kin filled ✅");
    };

    // =========================
    // Step 4: Domain / Zone / Area selection
    // =========================

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

      // 1. Select domain
      domainSelect.value = TARGET_DOMAIN;
      dispatchAllChangeEvents(domainSelect);
      console.log("4.1 Domain selected.");

      // 2. Poll for zone, then area
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

    // =========================
    // Run all steps
    // =========================

    fillBasicInfo();
    if (!openIdentitySection()) {
      return; // If identity cannot be opened, stop early
    }
    fillIdentitySection();
    fillNextOfKinSection();
    selectLocationWithPolling();
  }

  fillFormFromConsole();
}

async function page2() {
  // simple wait helper
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // -----------------------------------------
  // 1. PREPAID CHECKBOX
  // -----------------------------------------
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

  checkPrepaidCheckbox(); // MUST RUN BEFORE ATTACH PLAN
  await wait(1000); // give UI 1s to react

  // -----------------------------------------
  // Click ICCID RADIO
  // -----------------------------------------
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

  // -----------------------------------------
  // 2. ATTACH PLAN (WAIT UNTIL COMPLETED)
  // -----------------------------------------
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

      await wait(1000)
    // Wait for modal - reduced from 40x100ms (4s) to 20x50ms (1s)
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
    
    await wait(1000)
    // Find Base Plan - reduced from 40x100ms (4s) to 15x50ms (750ms)
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

    await wait(1000)
    basePlan.click();

    // Save button - reduced from 40x100ms (4s) to 15x50ms (750ms)
    let saveBtn = null;
    for (let i = 0; i < 15; i++) {
      saveBtn = modal.querySelector("button.btn.btn-info.mx-2");
      if (saveBtn) break;
      await wait(50);
    }

    if (!saveBtn) {
      return false;
    }

    await wait(100); // reduced from 200ms to 100ms
    saveBtn.click();

    // Wait for modal to close - reduced from 40x100ms (4s) to 20x50ms (1s)
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
  await wait(500); // pause before MSISDN

  // -----------------------------------------
  // 3. ADD MSISDN SERIES (AFTER ATTACH PLAN)
  // -----------------------------------------
  async function addMsisdnSeries() {
    // small wait helper
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));

    // find all "add" icon buttons once
    const addIcons = [
      ...document.querySelectorAll("button.btn-info .material-icons"),
    ].filter((s) => s.textContent.trim() === "add");

    const addBtn = addIcons[1]?.closest("button"); // index 1 = MSISDN
    if (!addBtn) {
      console.warn("MSISDN Add button not found.");
      return false;
    }

    addBtn.click();

    // wait for the specific MSISDN modal
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

    // ------------------------------------
    //   Select the 10th checkbox instead of the 1st
    // ------------------------------------
    const checkboxes = [
      ...modal.querySelectorAll(
        'table input.form-check-input[type="checkbox"]'
      ),
    ];

    if (checkboxes.length < 10) {
      console.warn(
        `Only ${checkboxes.length} MSISDN rows available — cannot select the 10th.`
      );
      return false;
    }

    const tenth = checkboxes[9]; // index 9 = 10th checkbox

    tenth.checked = true;
    ["click", "input", "change"].forEach((t) =>
      tenth.dispatchEvent(new Event(t, { bubbles: true }))
    );

    // save button
    const saveBtn = modal.querySelector("button.btn.btn-info.mx-2");
    if (!saveBtn) {
      console.warn("MSISDN save button missing.");
      return false;
    }

    await wait(300);
    saveBtn.click();
    console.log("MSISDN Done.");

    // wait for modal to close
    for (let i = 0; i < 25; i++) {
      const stillOpen = [...document.querySelectorAll(".modal-content")].some(
        (m) => m.textContent.includes("MSISDN List")
      );
      if (!stillOpen) break;
      await wait(120);
    }

    return true;
  }

  const msisdnDone = await addMsisdnSeries();
  if (!msisdnDone) {
    console.error("MSISDN failed. Stopping Page2.");
    return;
  }
  await wait(1000); // pause before ICCID

  // -----------------------------------------
  // 4. ICCID MODAL
  // -----------------------------------------

  async function handle_ICCID() {
    // reuse icon list so indexes are stable
    const addIcons = [
      ...document.querySelectorAll("button.btn.btn-info .material-icons"),
    ].filter((s) => s.textContent.trim() === "add");
    const addBtn = addIcons[2]?.closest("button"); // index 2 = ICCID
    if (!addBtn) {
      console.warn("ICCID Add button not found.");
      return false;
    }

    addBtn.click();

    // wait for IMSI/ICCID modal
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

    const suffix = prompt("Enter ICCID suffix (e.g. 8925263790000-XXXXXXX):");
    if (!suffix) return false;

    // Auto-prefix the full ICCID
    const ICCID_number = `8925263790000${suffix}`;
    console.log(`🔍 Searching ICCID: ${ICCID_number}`);
    if (!ICCID_number) {
      console.warn("No IMSI ICCID_number entered.");
      return false;
    }

    saveIccid(ICCID_number);  // ← Add the logging here
    gloable_icc_id = ICCID_number
    

    const searchInput = modal.querySelector(
      "input#searchtextIMSI.form-control"
    );
    if (!searchInput) {
      console.warn("ICCID search input not found.");
      return false;
    }
    searchInput.value = ICCID_number;
    ["input", "change", "keyup"].forEach((e) =>
      searchInput.dispatchEvent(new Event(e, { bubbles: true }))
    );

    const searchButton = modal.querySelector(
      ".input-group-append button.btn.btn-info"
    );
    if (!searchButton) {
      console.warn("ICCID search button not found.");
      return false;
    }
    searchButton.click();

    await wait(1000)
    
    console.log("ICCID done.");
    return true;
  }

  
  const iccidDone = await handle_ICCID();
  if (!iccidDone) {
    console.error("ICCID step failed. Stopping Page2.");
    return;
  }
  await wait(1000);

  
  


}

// -----------------------------------------
  // 5. NAVIGATION: NEXT → PAGE 3 → PAGE 4
  // -----------------------------------------
  async function goToNextOnce(label = "Next") {
    let btn = null;
    for (let i = 0; i < 30; i++) {
      btn = [...document.querySelectorAll("button.btn.btn-info")].find(
        (b) => b.textContent.trim().toLowerCase() === label.toLowerCase()
      );
      if (btn) break;
      await wait(150);
    }
    if (!btn) {
      console.warn(`${label} button not found.`);
      return false;
    }
    btn.click();
    console.log(`${label} clicked.`);
    await wait(700);
    return true;
  }

async function next() {
  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  // Button clicker
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

  // ===========================================
  // Normal steps WITH await
  // ===========================================
  await clickButton("Next");      // page 2 → 3
  await clickButton("Next");      // page 3 → 4
   await wait(1000);
  await clickButton("Checkout");  // checkout
   await wait(1000);
  // ===========================================
  // Close modal (WITH await, same as before)
  // ===========================================
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
  

  
  await wait(1000); // 🔥 wait 1 second before close modal
  await closeModal();

  // ===========================================
  // Copy to Clipboard
  // ===========================================
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
  } catch (err) {
    console.error("❌ Copy failed:", err);
  }

  document.body.removeChild(textarea);
}
  console.log(gloable_icc_id);
  // copyToClipboard(gloable_icc_id);

  
  // ===========================================
  // Acitivate 
  // ===========================================
// Click home logo
function clickHomeLogo() {
  const logo = document.querySelector("img.logoImg");
  if (logo) {
    logo.click();
    console.log("Home logo clicked.");
  } else {
    console.warn("Home logo not found.");
  }
}

// Select ICCID from dropdown
function selectICCID() {
  const select = document.querySelector("select#idtype");
  if (!select) {
    console.warn("Dropdown not found.");
    return;
  }

  const option = [...select.options].find(
    opt => opt.textContent.trim().toLowerCase() === "iccid"
  );

  if (!option) {
    console.warn("ICCID option not found.");
    return;
  }

  select.value = option.value;
  select.dispatchEvent(new Event("change"));
  console.log("Dropdown changed to ICCID.");
}

function fillSearchBar() {
  const input = document.querySelector("input#number");

  if (!input) {
    console.warn("Search bar not found.");
    return;
  }

  input.value = gloable_icc_id;
  input.dispatchEvent(new Event("input", { bubbles: true }));

  console.log("Search bar filled with:", gloable_icc_id);
}
  function clickSearchButton() {
  const searchBtn = [...document.querySelectorAll("button.btn.btn-info")]
    .find(btn =>
      btn.textContent.trim().toLowerCase().includes("search")
    );

  if (!searchBtn) {
    console.warn("Search button not found.");
    return;
  }

  searchBtn.click();
  console.log("Search button clicked.");
}

  async function clickActivateButton(timeout = 8000) {
  const start = performance.now();
  let activateBtn = null;

  while (performance.now() - start < timeout) {
    activateBtn = [...document.querySelectorAll("span.material-icons.green")]
      .find(el => el.textContent.trim() === "check_circle");

    if (activateBtn) break;

    await new Promise(res => setTimeout(res, 200));
  }

  if (!activateBtn) {
    console.warn("Activate button not found.");
    return;
  }

  activateBtn.click();
  console.log("Activate button clicked.");
}
  
await wait(1000);
clickHomeLogo();
selectICCID();
fillSearchBar();
clickSearchButton();
await clickActivateButton();

 

}




// to RUN write
// page1()
// than
// page2()
// next()
