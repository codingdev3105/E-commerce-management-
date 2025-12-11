import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cairoFontBase64 } from './cairoFont.js';

export const exportToCSV = (orders, filename = 'commandes.csv') => {
    if (!orders || orders.length === 0) return;

    // Define headers
    const headers = [
        'Référence',
        'Date',
        'État',
        'Client',
        'Téléphone',
        'Wilaya',
        'Commune',
        'Adresse',
        'Produit',
        'Montant',
        'Type Livraison',
        'Station/Bureau'
    ];

    // Map data
    const rows = orders.map(o => [
        o.reference,
        o.date,
        o.state,
        o.client,
        o.phone,
        o.wilaya,
        o.commune,
        o.address,
        o.product,
        o.amount,
        o.isStopDesk ? 'Stop Desk' : 'Domicile',
        o.isStopDesk ? o.address : '' // Address holds station name for StopDesk often, or check logic
    ]);

    // Construct CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};



export const exportToPDF = async (orders, filename = 'commandes.pdf', role = 'Utilisateur') => {
    if (!orders || orders.length === 0) return;

    const doc = new jsPDF();

    // Load Arabic Font
    let fontLoaded = false;
    try {
        doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
        doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
        doc.setFont('Cairo');
        fontLoaded = true;
    } catch (error) {
        console.error("Error loading Arabic font:", error);
        doc.setFont('helvetica');
    }

    const pageWidth = doc.internal.pageSize.width;
    const dateStr = new Date().toLocaleDateString('fr-FR');


    // --- PAGE 1: RÉSUMÉ DES NOUVELLES COMMANDES (PRODUITS) ---
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('Liste de Préparation', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${dateStr} - Page ${role}`, pageWidth / 2, 28, { align: 'center' });

    // Filter "Nouvelle" orders
    const newOrders = orders.filter(o => o.state === 'Nouvelle');

    if (newOrders.length > 0) {
        doc.setFontSize(18);
        doc.setTextColor(20, 184, 166); // Teal 500
        doc.text(`Checklist de Préparation (${newOrders.length})`, pageWidth / 2, 45, { align: 'center' });

        let y = 60;
        const colGap = 10;
        const colWidth = (pageWidth - 28 - colGap) / 2;
        let rowHeight = 0;

        newOrders.forEach((order, index) => {
            const colIndex = index % 2; // 0 = Left, 1 = Right
            const x = 14 + (colIndex * (colWidth + colGap));

            // Check for page break (only at start of a new row)
            if (colIndex === 0 && y > 275) {
                doc.addPage();
                y = 20; // Reset Y on new page
            }

            // Checkbox Square
            doc.setDrawColor(20, 184, 166);
            doc.setLineWidth(0.4);
            doc.roundedRect(x, y - 4, 5, 5, 1, 1);

            // Product Name
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10); // Smaller font
            // Wrap text within column width
            const productLines = doc.splitTextToSize(order.product, colWidth - 15);
            doc.text(productLines, x + 8, y);

            const productHeight = productLines.length * 4;

            // Sub-details
            const detailY = y + productHeight;
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(8); // Smaller details
            const subtext = `${order.reference} | ${order.client}${order.note ? ` | ${order.note}` : ''}`;
            const detailLines = doc.splitTextToSize(subtext, colWidth - 15);
            doc.text(detailLines, x + 8, detailY);

            const itemTotalHeight = productHeight + (detailLines.length * 3.5) + 4; // Spacing

            // Track max height in this row to determine when to move Y down
            if (itemTotalHeight > rowHeight) {
                rowHeight = itemTotalHeight;
            }

            // If this is the right column OR the last item, move to next row
            if (colIndex === 1 || index === newOrders.length - 1) {
                y += rowHeight + 4; // Move Y down by max row height + padding
                rowHeight = 0; // Reset for next row
            }
        });

    } else {
        doc.setFontSize(12);
        doc.setTextColor(150);
        doc.text("Aucune nouvelle commande à préparer.", 14, 45);
    }

    // --- PAGE BREAK ---
    doc.addPage();


    // --- PAGE 2+: LISTE COMPLÈTE ---
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Liste Complète des Commandes', pageWidth / 2, 20, { align: 'center' });

    const tableColumn = ["Ref", "Date", "Client", "Tel", "Produit", "Remarque"];
    const tableRows = orders.map(order => [
        order.reference,
        order.date,
        order.client,
        order.phone,
        order.product,
        order.note || ''
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'striped',
        styles: {
            fontSize: 9,
            cellPadding: 4,
            font: fontLoaded ? 'Cairo' : 'helvetica',
            valign: 'middle',
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [59, 130, 246], // Blue 500
            textColor: 255,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 30 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 30 }
        },
        alternateRowStyles: { fillColor: [239, 246, 255] }, // Light blue
    });

    doc.save(filename);
};
