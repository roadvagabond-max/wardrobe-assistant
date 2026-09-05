/**
 * Human-Readable Wardrobe Export Service (Printable HTML Magazine & Hungarian CSV)
 * Allows users to easily save, print, and share their physical wardrobe catalog without dealing with raw JSON.
 */

/**
 * 1. Generates and triggers download of a styled, printable HTML Magazine Lookbook
 */
export function exportWardrobeToPrintableHtml(wardrobe = [], profile = {}) {
  const dateStr = new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  const userName = profile?.name || 'Személyes';

  // Group items by category
  const categories = {
    outerwear: { label: '🧥 Zakók & Kabátok', items: [] },
    knitwear: { label: '🧶 Kötöttáru & Pulóverek', items: [] },
    tops: { label: '👔 Ingek & Felsők', items: [] },
    bottoms: { label: '👖 Nadrágok', items: [] },
    shoes: { label: '👞 Lábbelik & Cipők', items: [] },
    accessories: { label: '🎗️ Kiegészítők & Övek', items: [] },
    other: { label: '✦ Egyéb darabok', items: [] }
  };

  wardrobe.forEach(item => {
    const cat = item.category || 'other';
    if (categories[cat]) {
      categories[cat].items.push(item);
    } else {
      categories.other.items.push(item);
    }
  });

  const categoryBlocksHtml = Object.values(categories)
    .filter(cat => cat.items.length > 0)
    .map(cat => `
      <section style="margin-bottom: 32px; break-inside: avoid;">
        <h2 style="font-family: Georgia, serif; font-size: 18px; color: #1e293b; border-bottom: 2px solid #d4af37; padding-bottom: 6px; margin-bottom: 16px;">
          ${cat.label} (${cat.items.length} db)
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
          ${cat.items.map(item => `
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #fafafa; display: flex; flex-direction: column; justify-content: space-between;">
              ${item.imageUrl ? `
                <div style="height: 140px; background: #fff; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                  <img src="${item.imageUrl}" alt="${item.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;" />
                </div>
              ` : ''}
              <div>
                <h3 style="font-size: 13px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0;">${item.name}</h3>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
                  ${item.brand ? `<strong>Márka:</strong> ${item.brand} • ` : ''}
                  ${item.size ? `<strong>Méret:</strong> ${item.size}` : ''}
                </div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
                  ${item.material ? `<strong>Anyag:</strong> ${item.material}` : ''}
                  ${item.color ? ` • <strong>Szín:</strong> ${item.color}` : ''}
                </div>
                ${item.condition ? `
                  <span style="display: inline-block; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; color: #334155;">
                    ${item.condition.split('/')[0].trim()}
                  </span>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `).join('');

  const fullHtml = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>${userName} Gardrób Katalógus - ${dateStr}</title>
  <style>
    @media print {
      body { margin: 0; padding: 15mm; }
      .no-print { display: none !important; }
      @page { margin: 15mm; size: A4; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5; padding: 30px; max-width: 1000px; margin: 0 auto; }
    .print-btn { background: #d4af37; color: #000; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 14px; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 24px; padding: 12px 16px; background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
    <span>✦ <strong>Sartorial Digitális Gardrób Katalógus</strong> — Készen áll a nyomtatásra vagy PDF mentésre.</span>
    <button class="print-btn" onclick="window.print()">🖨️ Nyomtatás / Mentés PDF-be</button>
  </div>

  <header style="margin-bottom: 28px; border-bottom: 1px solid #cbd5e1; padding-bottom: 16px;">
    <h1 style="font-family: Georgia, serif; color: #0f172a; margin: 0 0 6px 0; font-size: 26px;">
      ${userName} Digitális Ruhatára
    </h1>
    <p style="font-size: 13px; color: #64748b; margin: 0;">
      Összes darab: <strong>${wardrobe.length} db</strong> • Leltár dátuma: <strong>${dateStr}</strong>
      ${profile?.stylePhilosophy ? ` • <em>"${profile.stylePhilosophy}"</em>` : ''}
    </p>
  </header>

  ${categoryBlocksHtml}

  <footer style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; text-align: center;">
    Generálva a Sartorial Wardrobe Assistant AI alkalmazással • ${dateStr}
  </footer>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `gardrob-katalogus-${new Date().toISOString().slice(0, 10)}.html`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

/**
 * 2. Generates and triggers download of a clean Excel / CSV spreadsheet with Hungarian headers
 */
export function exportWardrobeToCsv(wardrobe = []) {
  if (!wardrobe || wardrobe.length === 0) return;

  const headers = [
    'Ruha Megnevezése',
    'Kategória',
    'Szín',
    'Anyagösszetétel',
    'Márka',
    'Méret',
    'Szabás',
    'Formalitás',
    'Állapot',
    'Évszak',
    'Stílusirányzat',
    'Viselési Javaslat'
  ];

  const escapeCsv = (str) => {
    if (!str) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = wardrobe.map(item => [
    escapeCsv(item.name),
    escapeCsv(translateCategory(item.category)),
    escapeCsv(item.color),
    escapeCsv(item.material),
    escapeCsv(item.brand),
    escapeCsv(item.size),
    escapeCsv(item.fit),
    escapeCsv(item.formality),
    escapeCsv(item.condition),
    escapeCsv(Array.isArray(item.season) ? item.season.join(', ') : item.season),
    escapeCsv(item.styleArchetype),
    escapeCsv(item.stylingTip)
  ]);

  const csvContent = '\uFEFF' + [
    headers.join(';'),
    ...rows.map(r => r.join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `gardrob-leltar-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function translateCategory(cat = '') {
  const map = {
    outerwear: 'Zakó & Kabát',
    knitwear: 'Kötöttáru & Pulóver',
    tops: 'Ing & Felső',
    bottoms: 'Nadrág',
    shoes: 'Lábbeli / Cipő',
    dresses: 'Ruha',
    skirts: 'Szoknya',
    accessories: 'Kiegészítő'
  };
  return map[cat] || cat;
}
