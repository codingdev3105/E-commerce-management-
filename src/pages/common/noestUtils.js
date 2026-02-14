export const getCategoryFromEvent = (eventKey, eventLabel, isStopDesk) => {
    const key = (eventKey || '').toLowerCase();

    if (key.includes('return') || key.includes('retour') || key.includes('echoué') || key.includes('echoe') || key === 'annulation_dispatch_retour' || key === 'cancel_return_dispatched_to_partenaire' || key === 'colis_retour_transmit_to_partner' || key === 'livraison_echoe_recu') return 'Retour';
    if (key.includes('verssement') || key.includes('cash_by_partener') || key === 'extra_fee') return 'Finance';
    if (key === 'edited_informations' || key === 'edit_wilaya' || key === 'edit_price' || key.includes('exchange')) return 'En modification';
    if (key === 'livrre' || key === 'livred' || key === 'livré') return 'Livré';
    if (key === 'colis_suspendu' || key.includes('ask_to_delete')) return 'Suspendu';
    if (key === 'fdr_activated' || key === 'mise_a_jour' || key === 'validation_reception') return isStopDesk ? 'En Hub' : 'En livraison';
    if (key === 'sent_to_redispach' || key === 'pickup_picked_recu' || key === 'return_dispatched_to_warehouse') return 'En expédition';
    if (key === 'upload') return 'Upload';
    if (key === 'customer_validation' || key === 'validation_collect_colis' || key === 'pickuped' || key === 'valid_return_pickup' || key === 'validation_reception_admin') return 'En traitement';
    if (key.includes('valid')) return 'En traitement';
    return 'Autres';
};

export const parseNoestDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    let cleanStr = dateStr;
    if (typeof dateStr === 'string' && dateStr.includes('.000000Z')) {
        cleanStr = dateStr.replace(' ', 'T').replace('.000000Z', 'Z');
    }
    const d = new Date(cleanStr);
    return !isNaN(d.getTime()) ? d : new Date(0);
};

export const formatNoestDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime()) || dateObj.getTime() === 0) return '-';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(dateObj.getDate())}-${pad(dateObj.getMonth() + 1)}-${dateObj.getFullYear()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
};
