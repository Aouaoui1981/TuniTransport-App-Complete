// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — étiquette d'expédition imprimable
//
// Génère une étiquette HTML (format A5) avec expéditeur, destinataire,
// poids, référence et QR code de suivi, puis ouvre la boîte de dialogue
// d'impression du système (navigateur sur le web, AirPrint/PDF sur mobile).
// Le QR code est produit en SVG pur (aucun canvas requis) pour fonctionner
// sur toutes les plateformes.
// ──────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import QRCode from 'qrcode';
import { Shipment, Address } from '../types';

const APP_URL = 'https://tuni-transport-app-complete.vercel.app';

function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addressBlock(title: string, name: string, address: Address): string {
  return `
    <div class="party">
      <div class="party-title">${title}</div>
      <div class="party-name">${escapeHtml(name)}</div>
      <div>${escapeHtml(address.street)}</div>
      <div>${escapeHtml(address.postalCode)} ${escapeHtml(address.city)}, ${escapeHtml(address.country)}</div>
      <div>Contact : ${escapeHtml(address.contactName)} · ${escapeHtml(address.contactPhone)}</div>
    </div>`;
}

/** Short human-readable summary of what the parcel contains. */
function contentSummary(shipment: Shipment): string {
  if (shipment.items && shipment.items.length > 0) {
    return shipment.items
      .map((item) => `${item.quantity}× ${item.name}`)
      .join(', ')
      .slice(0, 60);
  }
  return (shipment.description ?? 'Effets personnels').slice(0, 60);
}

/**
 * Plain-text payload encoded in the QR code: any phone camera or scanner
 * app shows the shipment details directly, and the last line is the
 * tracking link into the app.
 */
function buildQrPayload(shipment: Shipment): string {
  const lines = [
    `THL — Envoi ${shipment.id.slice(-8).toUpperCase()}`,
    `Poids: ${shipment.weight ?? '—'} kg`,
    `Contenu: ${contentSummary(shipment)}`,
    `Expéditeur: ${shipment.senderName} — ${shipment.pickupAddress.street}, ${shipment.pickupAddress.postalCode} ${shipment.pickupAddress.city}, ${shipment.pickupAddress.country}`,
    `Destinataire: ${shipment.deliveryAddress.contactName} — ${shipment.deliveryAddress.street}, ${shipment.deliveryAddress.postalCode} ${shipment.deliveryAddress.city}, ${shipment.deliveryAddress.country}`,
    `Transporteur: ${shipment.transporterName ?? '—'}`,
    `Suivi: ${APP_URL}/?shipment=${shipment.id}`,
  ];
  return lines.join('\n');
}

export function buildLabelHtml(shipment: Shipment, qrSvg: string): string {
  const reference = shipment.id.slice(-8).toUpperCase();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A5 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; }
  .label { border: 2px solid #111; border-radius: 6px; overflow: hidden; }
  .head { display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; border-bottom: 2px solid #111; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .brand span { color: #2563EB; }
  .service { text-align: right; font-size: 11px; line-height: 1.5; }
  .route { display: flex; justify-content: space-between; align-items: center;
           padding: 8px 12px; background: #111; color: #fff;
           font-size: 15px; font-weight: 700; }
  .parties { display: flex; border-bottom: 1px solid #111; }
  .party { flex: 1; padding: 10px 12px; line-height: 1.6; }
  .party + .party { border-left: 1px solid #111; }
  .party-title { font-size: 10px; font-weight: 700; letter-spacing: 1px;
                 color: #555; text-transform: uppercase; margin-bottom: 2px; }
  .party-name { font-size: 15px; font-weight: 700; }
  .meta { display: flex; border-bottom: 1px solid #111; text-align: center; }
  .meta-cell { flex: 1; padding: 8px 4px; }
  .meta-cell + .meta-cell { border-left: 1px solid #ccc; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
  .meta-value { font-size: 15px; font-weight: 700; margin-top: 2px; }
  .track { display: flex; align-items: center; gap: 14px; padding: 12px; }
  .qr { width: 96px; height: 96px; flex-shrink: 0; }
  .qr svg { width: 100%; height: 100%; }
  .track-info { flex: 1; }
  .ref { font-size: 26px; font-weight: 800; letter-spacing: 2px; }
  .ref-full { font-size: 9px; color: #555; word-break: break-all; margin-top: 4px; }
  .track-hint { font-size: 10px; color: #555; margin-top: 6px; }
  .foot { padding: 6px 12px; border-top: 2px solid #111; font-size: 9px;
          color: #555; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="label">
    <div class="head">
      <div class="brand">THL<span>.</span></div>
      <div class="service">
        Transport de colis France ⇄ Tunisie<br/>
        ${APP_URL.replace('https://', '')}
      </div>
    </div>
    <div class="route">
      <div>${escapeHtml(shipment.pickupAddress.city)}, ${escapeHtml(shipment.pickupAddress.country)}</div>
      <div>➔</div>
      <div>${escapeHtml(shipment.deliveryAddress.city)}, ${escapeHtml(shipment.deliveryAddress.country)}</div>
    </div>
    <div class="parties">
      ${addressBlock('Expéditeur', shipment.senderName, shipment.pickupAddress)}
      ${addressBlock('Destinataire', shipment.deliveryAddress.contactName, shipment.deliveryAddress)}
    </div>
    <div class="meta">
      <div class="meta-cell">
        <div class="meta-label">Poids</div>
        <div class="meta-value">${escapeHtml(String(shipment.weight ?? '—'))} kg</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Colis</div>
        <div class="meta-value">1 / 1</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Transporteur</div>
        <div class="meta-value">${escapeHtml(shipment.transporterName || '—')}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Contenu</div>
        <div class="meta-value">${escapeHtml(contentSummary(shipment))}</div>
      </div>
    </div>
    <div class="track">
      <div class="qr">${qrSvg}</div>
      <div class="track-info">
        <div class="ref">${escapeHtml(reference)}</div>
        <div class="ref-full">${escapeHtml(shipment.id)}</div>
        <div class="track-hint">Scannez le QR code pour afficher les détails et le suivi de cet envoi.</div>
      </div>
    </div>
    <div class="foot">
      <div>THL — transport de colis France ⇄ Tunisie</div>
      <div>Réf. ${escapeHtml(reference)}</div>
    </div>
  </div>
</body>
</html>`;
}

// Floating toolbar injected on web only: the label opens as a visible page
// in a new tab, with an explicit print button (hidden on paper via CSS).
const WEB_TOOLBAR = `
<div class="toolbar">
  <button onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
</div>
<style>
  .toolbar { position: sticky; top: 0; text-align: center; padding: 10px;
             background: #F1F5F9; margin-bottom: 10px; }
  .toolbar button { font-size: 16px; font-weight: 700; padding: 10px 18px;
                    border: 0; border-radius: 8px; background: #2563EB;
                    color: #fff; }
  @media print { .toolbar { display: none; } }
</style>`;

/**
 * Build the QR as an SVG string SYNCHRONOUSLY (QRCode.create is sync).
 * Keeping the whole web flow synchronous matters: window.open is only
 * allowed inside the click's own call stack — an await would get the
 * new tab blocked as a popup.
 */
function qrSvgSync(text: string): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'L' });
  const size = qr.modules.size;
  const data = qr.modules.data as Uint8Array | number[];
  let path = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (data[row * size + col]) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path d="${path}" fill="#000"/></svg>`;
}

// On web, expo-print's `html` option is not supported (printAsync would
// print the CURRENT page), and printing hidden iframes renders blank on
// iOS Safari. Open the label as a normal visible page in a new tab
// instead — the user sees it immediately and prints/saves from there.
function openLabelOnWeb(html: string): void {
  const labelWindow = window.open('', '_blank');
  if (!labelWindow) {
    throw new Error(
      "Impossible d'ouvrir l'étiquette : autorisez les fenêtres pop-up pour ce site."
    );
  }
  labelWindow.document.open();
  labelWindow.document.write(html.replace('<body>', `<body>${WEB_TOOLBAR}`));
  labelWindow.document.close();
}

/** Builds the label and shows it (new tab on web, print dialog on native). */
export async function printShippingLabel(shipment: Shipment): Promise<void> {
  const qrSvg = qrSvgSync(buildQrPayload(shipment));
  const html = buildLabelHtml(shipment, qrSvg);
  if (Platform.OS === 'web') {
    // Synchronous on purpose — see qrSvgSync.
    openLabelOnWeb(html);
    return;
  }
  await Print.printAsync({ html });
}
