🛠️ Format-Fixer: The Frictionless Utility Hub

    Built for the Hack Club Stardance "Frictionless" Mission
A 100% client-side, privacy-first image converter, PDF merger, and text sanitizer.

✨why i think its usable:
i used to get anxiety about my data getting stolen while trying to change my private photos , ID's into pdf etc, so i build this website where your data never leave your browser for a sec and it also fastens the results that your photo/files gets instantly changed and you dont have to wait for traditional crappy servers to load.

The internet is full of repetitive tasks and awkward workflows. Format-Fixer is designed to remove the friction from your daily digital life. Convert images, merge documents into PDFs, and instantly clean up messy text formatting—all locally in your browser. Your data never leaves your device.

Built with guidance from Antigravity, Hack Club Guides, and Google Gemini.
🎯 The 3 Major QoL (Quality of Life) Improvements

To hit the core requirements of the Frictionless mission, this project focuses heavily on removing user bottlenecks:

    ⚡ Zero-Upload Privacy & Speed: Forget waiting for files to upload to a shady third-party server. By utilizing the HTML5 Canvas API, files are processed instantly on your local machine. Total privacy, zero wait time.

    🔀 Visual Drag & Drop Reordering: Most free PDF tools force you to upload images and guess the order. Format-Fixer generates live thumbnails that you can visually drag and rearrange before generating the final PDF.

    👁️ Live Instant Preview: The Text Sanitizer completely eliminates the "Submit" button. As you paste or type messy text on the left, it is sanitized, formatted, and ready to copy instantly on the right.

✨ Core Features

    🖼️ Universal Image Converter: Drag and drop images to instantly convert between PNG, JPG, and WebP formats. Includes real-time compression quality sliders.

    📄 Image to PDF Merger: Combine multiple images into a beautifully formatted, multi-page PDF document with customizable margins and orientations.

    🧹 Live Text Sanitizer: The ultimate copy-paste lifesaver. Instantly strips AI markdown (like ** and #), collapses excessive blank lines, removes invisible zero-width characters, and normalizes curly quotes.

    💅 Glassmorphism UI: A sleek, modern, and responsive user interface featuring satisfying animations and a clean aesthetic that makes utility work feel premium.

📂 Project Architecture

The project is built entirely with vanilla web technologies to ensure maximum performance and portability. No application backend or analytics. User files are processed locally in the browser.

External Libraries Used (via CDN):

    jsPDF - For lightning-fast, client-side PDF generation.

    SortableJS - For buttery-smooth drag-and-drop image reordering.

🚀 Getting Started

Because this project relies entirely on client-side execution, getting started is completely frictionless. No Node.js, no npm install, and no environment variables required.
Prerequisites

    A modern web browser (Chrome, Firefox, Safari, Edge).

    (Optional but recommended) VS Code with the "Live Server" extension for local development.

Installation & Run Commands:

For this project, installation can be ridiculously simple because you genuinely don't need Node/npm.

Something like:

git clone https://github.com/YOUR_USERNAME/format-fixer.git

cd format-fixer

Then:

Open index.html in your browser.

Or, if you want the recommended development method:

Open the project in VS Code → right-click index.html → Open with Live Server


How It Works

Image Converter

File → Canvas → Blob → Download

Image → PDF

Images → Local thumbnails → Drag/reorder → jsPDF → PDF

Text Sanitizer

Input → Cleaning pipeline → Live output
