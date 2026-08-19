function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };

  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ""}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(1))} ${sizes[index]}`;
}

function setupDropZone(zoneEl, inputEl, onFiles) {
  zoneEl.addEventListener("click", () => inputEl.click());

  inputEl.addEventListener("change", (e) => {
    if (e.target.files.length) onFiles(Array.from(e.target.files));
    e.target.value = "";
  });

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    zoneEl.classList.add("drag-over");
  });
  zoneEl.addEventListener("dragleave", () =>
    zoneEl.classList.remove("drag-over")
  );

  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    zoneEl.classList.remove("drag-over");
    const supported = ["image/jpeg", "image/png", "image/webp"];
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      supported.includes(file.type)
    );
    if (files.length) onFiles(files);
    else showToast("Please drop JPG, PNG, or WebP images.", "error");
  });
}

const landingScreen = document.getElementById("landing-screen");
const appRoot = document.querySelector(".app");

function setAppMode(mode) {
  const photoTabs = document.querySelectorAll(".tab-btn[data-photo-tab='true']");
  const textTab = document.getElementById("tab-sanitizer");
  const photoPanels = document.querySelectorAll(".tab-panel:not(#panel-sanitizer)");
  const textPanel = document.getElementById("panel-sanitizer");

  const isPhotoMode = mode === "photo";

  photoTabs.forEach((tab) => tab.classList.toggle("hidden", !isPhotoMode));
  photoPanels.forEach((panel) => panel.classList.toggle("hidden", !isPhotoMode));

  textTab.classList.toggle("hidden", isPhotoMode);
  textPanel.classList.toggle("hidden", isPhotoMode);

  if (isPhotoMode) {
    const firstPhotoTab = document.querySelector(".tab-btn[data-photo-tab='true']");
    if (firstPhotoTab) {
      firstPhotoTab.click();
    }
  } else {
    textTab.classList.add("active");
    textTab.setAttribute("aria-selected", "true");
    textPanel.classList.add("active");

    document.querySelectorAll(".tab-btn[data-photo-tab='true']").forEach((tab) => {
      tab.classList.remove("active");
      tab.setAttribute("aria-selected", "false");
    });
  }

  landingScreen.classList.add("hidden");
  appRoot.classList.add("visible");
  appRoot.style.display = "block";
}

document.querySelectorAll(".landing-card").forEach((card) => {
  card.addEventListener("click", () => setAppMode(card.dataset.mode));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setAppMode(card.dataset.mode);
    }
  });
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("hidden")) return;

    document.querySelectorAll(".tab-btn").forEach((b) => {
      if (!b.classList.contains("hidden")) {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      }
    });
    document.querySelectorAll(".tab-panel").forEach((p) => {
      if (!p.classList.contains("hidden")) {
        p.classList.remove("active");
      }
    });

    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");

    const targetPanel = document.getElementById(`panel-${btn.dataset.tab}`);
    if (targetPanel && !targetPanel.classList.contains("hidden")) {
      targetPanel.classList.add("active");
    }
  });
});

const converterState = {
  file: null,
  originalUrl: null,
  image: null,
  blob: null,
  ext: null,
};

setupDropZone(
  document.getElementById("converter-dropzone"),
  document.getElementById("converter-file-input"),
  (files) => loadConverterImage(files[0])
);

function loadConverterImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Unsupported file type.", "error");
    return;
  }

  converterState.file = file;

  const reader = new FileReader();
  reader.onerror = () => showToast("The image could not be read.", "error");
  reader.onload = (e) => {
    converterState.originalUrl = e.target.result;

    const img = new Image();
    img.onload = () => {
      converterState.image = img;

      document.getElementById("preview-original").src = e.target.result;
      document.getElementById("original-name").textContent = file.name;
      document.getElementById("original-size").textContent = formatBytes(
        file.size
      );
      document.getElementById("original-dimensions").textContent =
        `${img.naturalWidth} × ${img.naturalHeight}px`;

      document.getElementById("converter-controls").style.display = "flex";
      document.getElementById("converter-preview").classList.add("visible");

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

const qualitySlider = document.getElementById("quality-slider");
const qualityLabel = document.getElementById("quality-label");

qualitySlider.addEventListener("input", () => {
  qualityLabel.textContent = qualitySlider.value + "%";
  autoConvert();
});

document.getElementById("output-format").addEventListener("change", () => {
  updateQualityVisibility();
  autoConvert();
});

function updateQualityVisibility() {
  const fmt = document.getElementById("output-format").value;
  document.getElementById("quality-group").style.display =
    fmt === "image/png" ? "none" : "flex";
}

function autoConvert() {
  if (!converterState.image) return;

  const format = document.getElementById("output-format").value;
  const quality = parseInt(qualitySlider.value) / 100;
  const img = converterState.image;

  if (format === "image/svg+xml") {
    if (typeof ImageTracer === "undefined") {
      showToast("Vector conversion is unavailable right now.", "error");
      return;
    }

    document.getElementById("quality-group").style.display = "none";

    ImageTracer.imageToSVG(
      converterState.originalUrl,
      function (svgString) {
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        document.getElementById("preview-converted").src = url;
        document.getElementById("converted-format").textContent = "SVG format";
        document.getElementById("converted-size").textContent = formatBytes(
          blob.size
        );

        converterState.blob = blob;
        converterState.ext = "svg";
      },
      "default"
    );
    return;
  }

  document.getElementById("quality-group").style.display = "flex";

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");

  if (format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0);

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

      converterState.blob = blob;
      converterState.ext = ext.toLowerCase();
    },
    format,
    format === "image/png" ? undefined : quality
  );
}

document.getElementById("convert-btn").addEventListener("click", () => {
  if (!converterState.blob) {
    showToast("Please load an image first.", "error");
    return;
  }

  const url = URL.createObjectURL(converterState.blob);
  const a = document.createElement("a");
  const baseName = converterState.file.name.replace(/\.[^.]+$/, "");
  a.href = url;
  a.download = `${baseName}-converted.${converterState.ext === "jpeg" ? "jpg" : converterState.ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast("Image converted & downloaded!", "success");
});

const pdfState = {
  images: [],
};

let pdfIdCounter = 0;
let sortableInstance = null;

setupDropZone(
  document.getElementById("pdf-dropzone"),
  document.getElementById("pdf-file-input"),
  (files) => addPdfImages(files)
);

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

  pdfState.images.forEach((img, idx) => {
    const item = document.createElement("div");
    const page = document.createElement("span");
    const remove = document.createElement("button");
    const preview = document.createElement("img");
    const name = document.createElement("div");

    item.className = "pdf-grid-item";
    item.dataset.id = img.id;
    page.className = "page-num";
    page.textContent = idx + 1;
    remove.className = "remove-btn";
    remove.dataset.id = img.id;
    remove.type = "button";
    remove.title = "Remove";
    remove.textContent = "✕";
    preview.src = img.dataURL;
    preview.alt = img.name;
    name.className = "item-name";
    name.textContent = img.name;

    item.append(page, remove, preview, name);
    grid.appendChild(item);
  });

  grid.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pdfState.images = pdfState.images.filter((i) => i.id !== btn.dataset.id);
      renderPdfGrid();
    });
  });

  if (sortableInstance) sortableInstance.destroy();
  sortableInstance = new Sortable(grid, {
    animation: 200,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    onEnd: () => {
      const order = Array.from(grid.children).map((el) => el.dataset.id);
      pdfState.images.sort(
        (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
      );
      grid
        .querySelectorAll(".page-num")
        .forEach((num, i) => (num.textContent = i + 1));
    },
  });
}

document.getElementById("pdf-clear-btn").addEventListener("click", () => {
  pdfState.images = [];
  renderPdfGrid();
  document.getElementById("pdf-file-input").value = "";
  showToast("All images cleared.", "info");
});

document.getElementById("generate-pdf-btn").addEventListener("click", () => {
  if (!pdfState.images.length) {
    showToast("Please add images first.", "error");
    return;
  }

  if (!window.jspdf?.jsPDF) {
    showToast("PDF generation is unavailable right now.", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pageSize = document.getElementById("pdf-page-size").value;
  const orientationSetting = document.getElementById("pdf-orientation").value;
  const margin = parseInt(document.getElementById("pdf-margin").value);

  const pageSizes = {
    a4: [210, 297],
    letter: [215.9, 279.4],
    legal: [215.9, 355.6],
  };
  const [baseW, baseH] = pageSizes[pageSize];

  let doc = null;

  const promises = pdfState.images.map((imgData) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ img, dataURL: imgData.dataURL });
      img.onerror = () => resolve(null);
      img.src = imgData.dataURL;
    });
  });

  Promise.all(promises).then((results) => {
    const loadedImages = results.filter(Boolean);
    if (!loadedImages.length) {
      showToast("The selected images could not be decoded.", "error");
      return;
    }

    loadedImages.forEach((result, idx) => {
      const { img, dataURL } = result;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const imgRatio = imgW / imgH;

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

      if (idx === 0) {
        doc = new jsPDF({ orientation, unit: "mm", format: pageSize });
      } else {
        doc.addPage(pageSize, orientation);
      }

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

      const x = margin + (availW - fitW) / 2;
      const y = margin + (availH - fitH) / 2;

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
    showToast(`PDF generated with ${loadedImages.length} page(s)!`, "success");
  });
});

const sanitizerInput = document.getElementById("sanitizer-input");
const sanitizerOutput = document.getElementById("sanitizer-output");

document.querySelectorAll(".option-chip").forEach((chip) => {
  chip.addEventListener("click", (event) => {
    event.preventDefault();
    const cb = chip.querySelector('input[type="checkbox"]');
    cb.checked = !cb.checked;
    chip.classList.toggle("active", cb.checked);
    sanitizeText();
  });
});

function getActiveOptions() {
  const opts = {};
  document.querySelectorAll(".option-chip").forEach((chip) => {
    opts[chip.dataset.option] = chip.querySelector("input").checked;
  });
  return opts;
}

function sanitizeText() {
  const raw = sanitizerInput.value;
  const opts = getActiveOptions();
  let text = raw;

  if (opts.invisibleChars) {
    text = text.replace(
      /[\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2060\u2061\u2062\u2063\u2064]/g,
      ""
    );
  }

  if (opts.markdown) {
    text = text.replace(/^#{1,6}\s+/gm, "");
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, "$1");
    text = text.replace(/\*\*(.*?)\*\*/g, "$1");
    text = text.replace(/(?<!\w)\*(.*?)\*(?!\w)/g, "$1");
    text = text.replace(/___(.*?)___/g, "$1");
    text = text.replace(/__(.*?)__/g, "$1");
    text = text.replace(/`([^`]+)`/g, "$1");
    text = text.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, "").replace(/```/g, "");
    });
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    text = text.replace(/^>\s?/gm, "");
    text = text.replace(/^[-*_]{3,}\s*$/gm, "");
    text = text.replace(/^[\s]*[-*+]\s+/gm, "");
    text = text.replace(/^[\s]*\d+\.\s+/gm, "");
  }

  if (opts.smartQuotes) {
    text = text.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
    text = text.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
    text = text.replace(/[\u2013\u2014]/g, "-");
    text = text.replace(/\u2026/g, "...");
    text = text.replace(/\u00A0/g, " ");
  }

  if (opts.trimLines) {
    text = text
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");
  }

  if (opts.extraSpaces) {
    text = text.replace(/([^\S\n]){2,}/g, " ");
    text = text.replace(/\s+([.,;:!?])/g, "$1");
  }

  if (opts.lineBreaks) {
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n");
  }

  text = text.trim();

  sanitizerOutput.value = text;
  updateStats();
}

function updateStats() {
  const inputText = sanitizerInput.value;
  const outputText = sanitizerOutput.value;
  const wordCount = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

  document.getElementById("input-stats").innerHTML =
    `<span>${inputText.length}</span> chars · <span>${wordCount(inputText)}</span> words`;
  document.getElementById("output-stats").innerHTML =
    `<span>${outputText.length}</span> chars · <span>${wordCount(outputText)}</span> words`;
}

sanitizerInput.addEventListener("input", sanitizeText);

document.getElementById("copy-btn").addEventListener("click", async () => {
  const text = sanitizerOutput.value;
  if (!text) {
    showToast("Nothing to copy — paste some text first!", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Cleaned text copied to clipboard!", "success");

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

document.getElementById("clear-text-btn").addEventListener("click", () => {
  sanitizerInput.value = "";
  sanitizerOutput.value = "";
  updateStats();
  showToast("Text cleared.", "info");
});

const vectorFileInput = document.getElementById("vector-file-input");
const vectorDropZone = document.getElementById("vector-dropzone");
const vectorOriginalPreview = document.getElementById("vector-original-preview");
const vectorOutputPreview = document.getElementById("vector-output-preview");
const downloadVectorBtn = document.getElementById("download-vector-btn");
let vectorBlobUrl = null;
let vectorSvgBlob = null;
let vectorFileName = "vector-image";

function renderVectorPreviewFromDataUrl(dataUrl) {
  if (typeof ImageTracer === "undefined") {
    showToast("Vector conversion is unavailable right now.", "error");
    return;
  }

  vectorOriginalPreview.src = dataUrl;
  vectorOriginalPreview.style.display = "block";

  ImageTracer.imageToSVG(
    dataUrl,
    function (svgString) {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      vectorSvgBlob = blob;

      if (vectorBlobUrl) {
        URL.revokeObjectURL(vectorBlobUrl);
      }

      vectorBlobUrl = URL.createObjectURL(blob);
      vectorOutputPreview.src = vectorBlobUrl;
      vectorOutputPreview.style.display = "block";
    },
    "default"
  );
}

vectorOriginalPreview.src = "normal image example.png";
vectorOutputPreview.src = "vector image example.png";

setupDropZone(vectorDropZone, vectorFileInput, (files) => {
  const file = files[0];
  if (!file || !file.type.startsWith("image/")) {
    showToast("Please drop a valid image file.", "error");
    return;
  }

  vectorFileName = file.name.replace(/\.[^.]+$/, "") || "vector-image";
  const reader = new FileReader();
  reader.onerror = () => showToast("The image could not be read.", "error");
  reader.onload = (event) => renderVectorPreviewFromDataUrl(event.target.result);
  reader.readAsDataURL(file);
});

downloadVectorBtn.addEventListener("click", () => {
  if (!vectorSvgBlob) {
    showToast("Please load an image first.", "error");
    return;
  }

  const link = document.createElement("a");
  const url = URL.createObjectURL(vectorSvgBlob);

  link.href = url;
  link.download = `${vectorFileName}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Vector downloaded!", "success");
});

updateStats();
