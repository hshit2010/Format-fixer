/* ══════════════════════════════════════════════════════
   FORMAT FIXER — JAVASCRIPT
   ══════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════
//  INITIAL ONE-TIME LOADER LOGIC
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('initial-loader');
  if (!loader) return;

  const hasVisited = localStorage.getItem('formatFixer_visited');

  if (!hasVisited) {
    // First time: Show loader for 1.2s, then fade out
    setTimeout(() => {
      loader.classList.add('fade-out');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 600); // match CSS transition
    }, 1200);
    localStorage.setItem('formatFixer_visited', 'true');
  } else {
    // Returning user: Hide immediately
    loader.style.display = 'none';
  }
});

// ─────────────────────────────────────────────────────
//  SECTION 1: UTILITY HELPERS & TOAST SYSTEM
// ─────────────────────────────────────────────────────

/**
 * Display a toast notification in the top-right corner.
 * @param {string} message - Text to show in the toast.
 * @param {'info'|'success'|'error'} type - Toast style variant.
 */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };

  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ""}</span> ${message}`;
  container.appendChild(toast);

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Format a byte count into a human-readable string (e.g. "1.4 MB").
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Wire up a drop-zone element with click-to-browse, drag-over highlight,
 * and file-drop handling.
 * @param {HTMLElement} zoneEl   - The visible drop zone div.
 * @param {HTMLInputElement} inputEl - The hidden <input type="file">.
 * @param {(files: File[]) => void} onFiles - Callback that receives the dropped files.
 */
function setupDropZone(zoneEl, inputEl, onFiles) {
  // Click the zone → open file picker
  zoneEl.addEventListener("click", () => inputEl.click());

  // File picker change
  inputEl.addEventListener("change", (e) => {
    if (e.target.files.length) onFiles(Array.from(e.target.files));
  });

  // Drag-over visual feedback
  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    zoneEl.classList.add("drag-over");
  });
  zoneEl.addEventListener("dragleave", () =>
    zoneEl.classList.remove("drag-over")
  );

  // Handle the drop
  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    zoneEl.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length) onFiles(files);
    else showToast("Please drop image files (JPG, PNG, or WebP).", "error");
  });
}

// ─────────────────────────────────────────────────────
//  SECTION 2: TAB SWITCHING
// ─────────────────────────────────────────────────────

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // Deactivate all tabs
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) => p.classList.remove("active"));

    // Activate the clicked tab
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ─────────────────────────────────────────────────────
//  SECTION 3: IMAGE CONVERTER  (Tab 1)
//
//  Flow: User drops an image → we read it as a Data URL
//  → draw onto an HTML5 Canvas → use canvas.toBlob() to
//  produce the target format → show live preview + download.
// ─────────────────────────────────────────────────────

/** Holds the current state for the image converter tab. */
const converterState = {
  file: null, // Original File object
  originalDataURL: null, // Base-64 data URL of the original
  imgEl: null, // Decoded Image element
  convertedBlob: null, // Blob of the converted output
  convertedExt: null, // File extension string for download
};

// Wire up the drop zone
setupDropZone(
  document.getElementById("converter-dropzone"),
  document.getElementById("converter-file-input"),
  (files) => loadConverterImage(files[0])
);

/**
 * Read the dropped file, decode it into an Image, and show the original preview.
 * @param {File} file
 */
function loadConverterImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Unsupported file type.", "error");
    return;
  }

  converterState.file = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    converterState.originalDataURL = e.target.result;

    const img = new Image();
    img.onload = () => {
      converterState.imgEl = img;

      // Populate the "Original" preview box
      document.getElementById("preview-original").src = e.target.result;
      document.getElementById("original-name").textContent = file.name;
      document.getElementById("original-size").textContent = formatBytes(
        file.size
      );
      document.getElementById("original-dimensions").textContent =
        `${img.naturalWidth} × ${img.naturalHeight}px`;

      // Show controls & preview area
      document.getElementById("converter-controls").style.display = "flex";
      document.getElementById("converter-preview").classList.add("visible");

      // Auto-select a format different from the original
      const fmt = document.getElementById("output-format");
      if (file.type === "image/jpeg") fmt.value = "image/png";
      else if (file.type === "image/png") fmt.value = "image/jpeg";
      else fmt.value = "image/jpeg";

      updateQualityVisibility();
      autoConvert();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Quality slider ──
const qualitySlider = document.getElementById("quality-slider");
const qualityLabel = document.getElementById("quality-label");

qualitySlider.addEventListener("input", () => {
  qualityLabel.textContent = qualitySlider.value + "%";
  autoConvert(); // Re-convert live as the slider moves
});

document.getElementById("output-format").addEventListener("change", () => {
  updateQualityVisibility();
  autoConvert();
});

/** Hide the quality slider when PNG is selected (PNG is always lossless). */
function updateQualityVisibility() {
  const fmt = document.getElementById("output-format").value;
  document.getElementById("quality-group").style.display =
    fmt === "image/png" ? "none" : "flex";
}

/**
 * Perform the actual conversion using an off-screen Canvas and update
 * the "Converted" preview box.  Called automatically whenever the
 * user changes format, quality, or drops a new image.
 */
function autoConvert() {
  if (!converterState.imgEl) return;

  const format = document.getElementById("output-format").value;
  const quality = parseInt(qualitySlider.value) / 100;
  const img = converterState.imgEl;

  // Create an off-screen canvas at the image's native resolution
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");

  // JPEG doesn't support transparency → fill with white first
  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

  // Convert the canvas content to a Blob in the target format
  canvas.toBlob(
    (blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      document.getElementById("preview-converted").src = url;

      const ext =
        format.split("/")[1] === "jpeg"
          ? "JPG"
          : format.split("/")[1].toUpperCase();
      document.getElementById("converted-format").textContent = ext + " format";
      document.getElementById("converted-size").textContent = formatBytes(
        blob.size
      );

      // Store for download
      converterState.convertedBlob = blob;
      converterState.convertedExt = ext.toLowerCase();
    },
    format,
    format === "image/png" ? undefined : quality
  );
}

// ── Download button ──
document.getElementById("convert-btn").addEventListener("click", () => {
  if (!converterState.convertedBlob) {
    showToast("Please load an image first.", "error");
    return;
  }

  // Create a temporary Blob URL and trigger a download via a hidden <a>
  const url = URL.createObjectURL(converterState.convertedBlob);
  const a = document.createElement("a");
  const baseName = converterState.file.name.replace(/\.[^.]+$/, "");
  a.href = url;
  a.download = `${baseName}-converted.${converterState.convertedExt === "jpeg" ? "jpg" : converterState.convertedExt}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast("Image converted & downloaded!", "success");
});

// ─────────────────────────────────────────────────────
//  SECTION 4: IMAGE → PDF  (Tab 2)
//
//  Flow: User drops multiple images → thumbnails appear in
//  a sortable grid (SortableJS) → user reorders → clicks
//  "Generate PDF" → jsPDF builds a multi-page document
//  with each image centered on its own page.
// ─────────────────────────────────────────────────────

/** State for the PDF builder tab. */
const pdfState = {
  images: [], // Array of { id, file, dataURL, name }
};

let pdfIdCounter = 0; // Incrementing ID for each image
let sortableInstance = null; // SortableJS instance reference

// Wire up the drop zone
setupDropZone(
  document.getElementById("pdf-dropzone"),
  document.getElementById("pdf-file-input"),
  (files) => addPdfImages(files)
);

/**
 * Read each dropped file as a Data URL and add it to the images list.
 * @param {File[]} files
 */
function addPdfImages(files) {
  const validFiles = files.filter((f) => f.type.startsWith("image/"));
  if (!validFiles.length) {
    showToast("No valid image files found.", "error");
    return;
  }

  let loaded = 0;
  validFiles.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      pdfState.images.push({
        id: "pdf-img-" + ++pdfIdCounter,
        file: file,
        dataURL: e.target.result,
        name: file.name,
      });
      loaded++;
      if (loaded === validFiles.length) {
        renderPdfGrid();
        showToast(`Added ${validFiles.length} image(s).`, "success");
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Re-render the sortable thumbnail grid from the current pdfState.images
 * array, and re-initialize SortableJS.
 */
function renderPdfGrid() {
  const grid = document.getElementById("pdf-grid");
  const container = document.getElementById("pdf-grid-container");
  grid.innerHTML = "";

  if (!pdfState.images.length) {
    container.classList.remove("visible");
    return;
  }

  container.classList.add("visible");
  document.getElementById("pdf-count").textContent = pdfState.images.length;

  // Build a card for each image
  pdfState.images.forEach((img, idx) => {
    const item = document.createElement("div");
    item.className = "pdf-grid-item";
    item.dataset.id = img.id;
    item.innerHTML = `
      <span class="page-num">${idx + 1}</span>
      <button class="remove-btn" data-id="${img.id}" title="Remove">✕</button>
      <img src="${img.dataURL}" alt="${img.name}">
      <div class="item-name">${img.name}</div>
    `;
    grid.appendChild(item);
  });

  // Attach remove-button handlers
  grid.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pdfState.images = pdfState.images.filter((i) => i.id !== btn.dataset.id);
      renderPdfGrid();
    });
  });

  // Initialize (or re-initialize) SortableJS for drag-and-drop reordering
  if (sortableInstance) sortableInstance.destroy();
  sortableInstance = new Sortable(grid, {
    animation: 200,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    onEnd: () => {
      // Sync the JS array order with the new DOM order
      const order = Array.from(grid.children).map((el) => el.dataset.id);
      pdfState.images.sort(
        (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
      );
      // Update the visible page numbers
      grid
        .querySelectorAll(".page-num")
        .forEach((num, i) => (num.textContent = i + 1));
    },
  });
}

// ── Clear All button ──
document.getElementById("pdf-clear-btn").addEventListener("click", () => {
  pdfState.images = [];
  renderPdfGrid();
  document.getElementById("pdf-file-input").value = "";
  showToast("All images cleared.", "info");
});

// ── Generate PDF button ──
document.getElementById("generate-pdf-btn").addEventListener("click", () => {
  if (!pdfState.images.length) {
    showToast("Please add images first.", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pageSize = document.getElementById("pdf-page-size").value;
  const orientationSetting = document.getElementById("pdf-orientation").value;
  const margin = parseInt(document.getElementById("pdf-margin").value);

  // Standard page dimensions in millimetres
  const pageSizes = {
    a4: [210, 297],
    letter: [215.9, 279.4],
    legal: [215.9, 355.6],
  };
  const [baseW, baseH] = pageSizes[pageSize];

  let doc = null;

  // Decode every image first so we know their natural dimensions
  const promises = pdfState.images.map((imgData) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img, dataURL: imgData.dataURL });
      img.src = imgData.dataURL;
    });
  });

  Promise.all(promises).then((results) => {
    results.forEach((result, idx) => {
      const { img, dataURL } = result;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const imgRatio = imgW / imgH;

      // Pick page orientation
      let orientation;
      if (orientationSetting === "auto") {
        orientation = imgRatio > 1 ? "landscape" : "portrait";
      } else {
        orientation = orientationSetting;
      }

      const pageW =
        orientation === "landscape"
          ? Math.max(baseW, baseH)
          : Math.min(baseW, baseH);
      const pageH =
        orientation === "landscape"
          ? Math.min(baseW, baseH)
          : Math.max(baseW, baseH);

      // First page creates the doc; subsequent pages are added
      if (idx === 0) {
        doc = new jsPDF({ orientation, unit: "mm", format: pageSize });
      } else {
        doc.addPage(pageSize, orientation);
      }

      // Fit the image within the printable area (page minus margins)
      const availW = pageW - 2 * margin;
      const availH = pageH - 2 * margin;
      const pageRatio = availW / availH;

      let fitW, fitH;
      if (imgRatio > pageRatio) {
        fitW = availW;
        fitH = availW / imgRatio;
      } else {
        fitH = availH;
        fitW = availH * imgRatio;
      }

      // Centre the image on the page
      const x = margin + (availW - fitW) / 2;
      const y = margin + (availH - fitH) / 2;

      // jsPDF doesn't natively support WebP, so convert via canvas first
      let jspdfFormat = "JPEG";
      if (dataURL.startsWith("data:image/png")) jspdfFormat = "PNG";

      if (dataURL.startsWith("data:image/webp")) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpegDataURL = canvas.toDataURL("image/jpeg", 0.95);
        doc.addImage(jpegDataURL, "JPEG", x, y, fitW, fitH);
      } else {
        doc.addImage(dataURL, jspdfFormat, x, y, fitW, fitH);
      }
    });

    doc.save("merged-document.pdf");
    showToast(`PDF generated with ${results.length} page(s)!`, "success");
  });
});

// ─────────────────────────────────────────────────────
//  SECTION 5: TEXT SANITIZER  (Tab 3)
//
//  A split-pane editor: the user types or pastes messy
//  text on the left, and a live-cleaned version appears
//  on the right with every keystroke.
// ─────────────────────────────────────────────────────

const sanitizerInput = document.getElementById("sanitizer-input");
const sanitizerOutput = document.getElementById("sanitizer-output");

// ── Toggle option chips on click ──
document.querySelectorAll(".option-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const cb = chip.querySelector('input[type="checkbox"]');
    cb.checked = !cb.checked;
    chip.classList.toggle("active", cb.checked);
    sanitizeText(); // Re-run instantly when an option changes
  });
});

/**
 * Read the current on/off state of every option chip.
 * @returns {Record<string, boolean>}
 */
function getActiveOptions() {
  const opts = {};
  document.querySelectorAll(".option-chip").forEach((chip) => {
    opts[chip.dataset.option] = chip.querySelector("input").checked;
  });
  return opts;
}

/**
 * Apply all enabled cleaning transforms to the input text and write the
 * result into the output textarea.  Called on every `input` event and
 * whenever an option chip is toggled.
 */
function sanitizeText() {
  const raw = sanitizerInput.value;
  const opts = getActiveOptions();
  let text = raw;

  // 1) Remove invisible / zero-width characters
  if (opts.invisibleChars) {
    text = text.replace(
      /[\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2060\u2061\u2062\u2063\u2064]/g,
      ""
    );
  }

  // 2) Strip Markdown / AI formatting
  if (opts.markdown) {
    // Headers: ## Header → Header
    text = text.replace(/^#{1,6}\s+/gm, "");
    // Bold + italic combos: ***text*** → text
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, "$1");
    // Bold: **text** → text
    text = text.replace(/\*\*(.*?)\*\*/g, "$1");
    // Italic: *text* → text  (but not mid-word asterisks)
    text = text.replace(/(?<!\w)\*(.*?)\*(?!\w)/g, "$1");
    // Underline bold/italic
    text = text.replace(/___(.*?)___/g, "$1");
    text = text.replace(/__(.*?)__/g, "$1");
    // Inline code: `code` → code
    text = text.replace(/`([^`]+)`/g, "$1");
    // Fenced code blocks: ```...``` → content only
    text = text.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, "").replace(/```/g, "");
    });
    // Links: [text](url) → text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // Images: ![alt](url) → alt
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
    // Blockquotes: > text → text
    text = text.replace(/^>\s?/gm, "");
    // Horizontal rules: ---, ***, ___
    text = text.replace(/^[-*_]{3,}\s*$/gm, "");
    // Unordered list markers: - item, * item, + item
    text = text.replace(/^[\s]*[-*+]\s+/gm, "");
    // Ordered list markers: 1. item
    text = text.replace(/^[\s]*\d+\.\s+/gm, "");
  }

  // 3) Normalize smart quotes, em/en dashes, ellipsis
  if (opts.smartQuotes) {
    text = text.replace(/[\u2018\u2019\u201A\u201B]/g, "'"); // curly single → straight
    text = text.replace(/[\u201C\u201D\u201E\u201F]/g, '"'); // curly double → straight
    text = text.replace(/[\u2013\u2014]/g, "-"); // en/em dash → hyphen
    text = text.replace(/\u2026/g, "..."); // ellipsis char → three dots
    text = text.replace(/\u00A0/g, " "); // non-breaking space → normal
  }

  // 4) Trim trailing whitespace from each line
  if (opts.trimLines) {
    text = text
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");
  }

  // 5) Collapse multiple spaces into one
  if (opts.extraSpaces) {
    text = text.replace(/([^\S\n]){2,}/g, " ");
    text = text.replace(/\s+([.,;:!?])/g, "$1"); // spaces before punctuation
  }

  // 6) Fix excessive blank lines
  if (opts.lineBreaks) {
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n"); // 3+ newlines → 2
  }

  // Final trim
  text = text.trim();

  sanitizerOutput.value = text;
  updateStats();
}

/**
 * Update the character and word counts displayed above both text areas.
 */
function updateStats() {
  const inputText = sanitizerInput.value;
  const outputText = sanitizerOutput.value;
  const wordCount = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

  document.getElementById("input-stats").innerHTML =
    `<span>${inputText.length}</span> chars · <span>${wordCount(inputText)}</span> words`;
  document.getElementById("output-stats").innerHTML =
    `<span>${outputText.length}</span> chars · <span>${wordCount(outputText)}</span> words`;
}

// Live input → instant sanitization
sanitizerInput.addEventListener("input", sanitizeText);

// ── Copy to Clipboard button ──
document.getElementById("copy-btn").addEventListener("click", async () => {
  const text = sanitizerOutput.value;
  if (!text) {
    showToast("Nothing to copy — paste some text first!", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Cleaned text copied to clipboard!", "success");

    // Brief visual feedback on the button
    const btn = document.getElementById("copy-btn");
    const originalText = btn.innerHTML;
    btn.innerHTML = "✅ Copied!";
    btn.style.transform = "scale(1.05)";
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.transform = "";
    }, 1500);
  } catch {
    showToast("Failed to copy — please copy manually.", "error");
  }
});

// ── Clear text button ──
document.getElementById("clear-text-btn").addEventListener("click", () => {
  sanitizerInput.value = "";
  sanitizerOutput.value = "";
  updateStats();
  showToast("Text cleared.", "info");
});

// ─────────────────────────────────────────────────────
//  SECTION 6: INITIALIZATION
// ─────────────────────────────────────────────────────

// Set initial stats for the text sanitizer
updateStats();
