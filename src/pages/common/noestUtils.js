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
export const getNoestStatusStyle = (status, statusClass) => {
    if (statusClass) {
        if (statusClass.includes('success')) return 'text-green-700 bg-green-50 border-green-200';
        if (statusClass.includes('danger')) return 'text-red-700 bg-red-50 border-red-200';
        if (statusClass.includes('warning')) return 'text-orange-700 bg-orange-50 border-orange-200';
        if (statusClass.includes('info') || statusClass.includes('primary')) return 'text-blue-700 bg-blue-50 border-blue-200';
    }
    const s = (status || '').toLowerCase();
    if (s.includes('livré') || s.includes('delivered')) return 'text-green-700 bg-green-50 border-green-200';
    if (s.includes('retour') || s.includes('returned') || s.includes('echoué')) return 'text-red-700 bg-red-50 border-red-200';
    if (s.includes('cours') || s.includes('livraison')) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-slate-700 bg-slate-100 border-slate-200';
};
