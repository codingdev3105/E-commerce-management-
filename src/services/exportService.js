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

    // Load Arabic Font (Cairo)
    let fontLoaded = false;
    try {
        doc.addFileToVFS('Cairo-Regular.ttf', cairoFontBase64);
        doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
        doc.setFont('Cairo');
        fontLoaded = true;
    } catch (error) {
        console.error("Error loading Arabic font:", error);
        // Fallback to default font
        doc.setFont('helvetica');
    }

    // Title & Subtitle (Centered)
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(18);
    try {
        doc.text('Liste des Commandes', pageWidth / 2, 22, { align: 'center' });
    } catch (e) {
        // Fallback if text fails (rare if font is valid or fallback is used)
        doc.setFont('helvetica');
        doc.text('Liste des Commandes', pageWidth / 2, 22, { align: 'center' });
        // If the first text call fails due to font issues, ensure we don't try to use 'Cairo' in the table
        fontLoaded = false;
    }

    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(`Généré le ${dateStr} - ${orders.length} commandes - Page ${role}`, pageWidth / 2, 30, { align: 'center' });

    // Table
    const tableColumn = ["Ref", "Date", "Client", "Tel", "Produit"];
    const tableRows = [];

    orders.forEach(order => {
        const productWithNote = order.product + (order.note ? ` (${order.note})` : '');

        const orderData = [
            order.reference,
            order.date,
            order.client,
            order.phone,
            productWithNote
        ];
        tableRows.push(orderData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 3,
            font: fontLoaded ? 'Cairo' : 'helvetica'
        },
        headStyles: { fillColor: [66, 133, 244], textColor: 255, fontStyle: 'bold' }, // Blue header
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(filename);
};


