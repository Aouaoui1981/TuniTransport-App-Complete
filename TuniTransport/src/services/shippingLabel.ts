// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — étiquette d'expédition imprimable
//
// Génère une étiquette HTML (format A5) avec expéditeur, destinataire,
// poids, référence et QR code de suivi, puis ouvre la boîte de dialogue
// d'impression du système (navigateur sur le web, AirPrint/PDF sur mobile).
// Le QR code est produit en SVG pur (aucun canvas requis) pour fonctionner
// sur toutes les plateformes.
// ──────────────────────────────────────────────────────────────────────────
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

export function buildLabelHtml(shipment: Shipment, qrSvg: string): string {
  const reference = shipment.id.slice(-8).toUpperCase();
  const printedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

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
      <div class="brand">Tuni<span>Transport</span></div>
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
        <div class="meta-label">Édité le</div>
        <div class="meta-value">${printedAt}</div>
      </div>
    </div>
    <div class="track">
      <div class="qr">${qrSvg}</div>
      <div class="track-info">
        <div class="ref">${escapeHtml(reference)}</div>
        <div class="ref-full">${escapeHtml(shipment.id)}</div>
        <div class="track-hint">Scannez le QR code pour suivre cet envoi en ligne.</div>
      </div>
    </div>
    <div class="foot">
      <div>TuniTransport — colis léger 4€/kg, effets personnels non commerciaux</div>
      <div>Réf. ${escapeHtml(reference)}</div>
    </div>
  </div>
</body>
</html>`;
}

/** Builds the label and opens the system print dialog (print or save as PDF). */
export async function printShippingLabel(shipment: Shipment): Promise<void> {
  const qrSvg = await QRCode.toString(`${APP_URL}/?shipment=${shipment.id}`, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
  });
  await Print.printAsync({ html: buildLabelHtml(shipment, qrSvg) });
}
