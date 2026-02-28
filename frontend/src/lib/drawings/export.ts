/**
 * Export utilities for SVG technical drawings.
 * Supports PNG (rasterized at configurable DPI), SVG (vector), and PDF (via jsPDF + svg2pdf.js).
 * No React dependencies -- operates on raw SVGSVGElement references.
 */

import { saveAs } from 'file-saver';
import { ExportFormat } from './types';

// ============================================================
// PNG Export
// ============================================================

/**
 * Export an SVG element as a PNG image at the specified DPI.
 *
 * Process: XMLSerializer -> Blob -> Image -> Canvas (scaled) -> toBlob -> saveAs
 * All styles must be inline SVG attributes (not CSS classes) for serialization.
 *
 * @param svgElement - The SVG DOM element to export
 * @param filename - Output filename (without extension)
 * @param dpi - Resolution in dots per inch (default: 600)
 */
export async function exportSvgAsPng(
  svgElement: SVGSVGElement,
  filename: string,
  dpi: number = 600
): Promise<void> {
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

  // Get viewBox dimensions for proper scaling
  const viewBox = svgElement.viewBox.baseVal;
  const svgWidth = viewBox.width || svgElement.clientWidth;
  const svgHeight = viewBox.height || svgElement.clientHeight;

  // Scale factor: DPI / 96 (screen DPI baseline)
  const scale = dpi / 96;
  const canvasWidth = Math.round(svgWidth * scale);
  const canvasHeight = Math.round(svgHeight * scale);

  // Ensure the clone has explicit width/height for rasterization
  svgClone.setAttribute('width', String(canvasWidth));
  svgClone.setAttribute('height', String(canvasHeight));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get canvas 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (pngBlob) => {
          if (pngBlob) {
            saveAs(pngBlob, `${filename}.png`);
            resolve();
          } else {
            reject(new Error('Canvas toBlob returned null'));
          }
        },
        'image/png'
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

// ============================================================
// SVG Export
// ============================================================

/**
 * Export an SVG element as a .svg vector file.
 *
 * @param svgElement - The SVG DOM element to export
 * @param filename - Output filename (without extension)
 */
export function exportSvgAsSvg(
  svgElement: SVGSVGElement,
  filename: string
): void {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, `${filename}.svg`);
}

// ============================================================
// PDF Export
// ============================================================

/**
 * Export an SVG element as a PDF document.
 * Uses jsPDF + svg2pdf.js for vector-quality PDF output.
 * Auto-detects landscape vs portrait based on aspect ratio.
 *
 * @param svgElement - The SVG DOM element to export
 * @param filename - Output filename (without extension)
 */
export async function exportSvgAsPdf(
  svgElement: SVGSVGElement,
  filename: string
): Promise<void> {
  // Dynamic imports to avoid loading jsPDF until needed
  const { jsPDF } = await import('jspdf');
  await import('svg2pdf.js');

  const viewBox = svgElement.viewBox.baseVal;
  const width = viewBox.width || svgElement.clientWidth;
  const height = viewBox.height || svgElement.clientHeight;

  const orientation = width > height ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [width, height],
  });

  await doc.svg(svgElement, { x: 0, y: 0, width, height });
  doc.save(`${filename}.pdf`);
}

// ============================================================
// Dual-Style Export
// ============================================================

/**
 * Export both blueprint and modern style versions of a drawing.
 *
 * For PNG/SVG: triggers two separate downloads with style suffix in filename.
 * For PDF: creates a single 2-page PDF (page 1 = first style, page 2 = second style).
 *
 * @param currentSvg - SVG element in the first/current style
 * @param otherStyleSvg - SVG element in the alternate style
 * @param basename - Base filename (without extension or style suffix)
 * @param format - Export format
 */
export async function exportBothStyles(
  currentSvg: SVGSVGElement,
  otherStyleSvg: SVGSVGElement,
  basename: string,
  format: ExportFormat
): Promise<void> {
  if (format === 'pdf') {
    // Single 2-page PDF
    const { jsPDF } = await import('jspdf');
    await import('svg2pdf.js');

    const viewBox = currentSvg.viewBox.baseVal;
    const width = viewBox.width || currentSvg.clientWidth;
    const height = viewBox.height || currentSvg.clientHeight;

    const orientation = width > height ? 'landscape' : 'portrait';
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: [width, height],
    });

    // Page 1: current style
    await doc.svg(currentSvg, { x: 0, y: 0, width, height });

    // Page 2: other style
    doc.addPage([width, height], orientation);
    await doc.svg(otherStyleSvg, { x: 0, y: 0, width, height });

    doc.save(`${basename}.pdf`);
  } else if (format === 'png') {
    // Two separate PNG downloads
    await exportSvgAsPng(currentSvg, `${basename}-blueprint`);
    await exportSvgAsPng(otherStyleSvg, `${basename}-modern`);
  } else {
    // Two separate SVG downloads
    exportSvgAsSvg(currentSvg, `${basename}-blueprint`);
    exportSvgAsSvg(otherStyleSvg, `${basename}-modern`);
  }
}
