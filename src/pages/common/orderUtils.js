export const safeString = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        try {
            return JSON.stringify(val);
        } catch (e) {
            return "[Objet]";
        }
    }
    return String(val);
};

export const STATUS_COLORS = {
    'Nouvelle': '#bfe1f6',
    'Atelier': '#e6cff2',
    'Finance': '#11734b',
    'En traitement': '#ff904f',
    'Annuler': '#fffd12',
    'Retour': '#ff0000',
    'livré': '#10b981',
    'En livraison': '#4898fe',
    'En Hub': '#4898fe',
    'Upload': '#ffbb83',
    'Suspendu': '#ff8991',
};

export const getStateColor = (state) => {
    const s = safeString(state).toLowerCase();

    if (s.includes('nouvelle')) return 'bg-[#bfe1f6] text-blue-900 border-blue-200';
    if (s.includes('atelier')) return 'bg-[#e6cff2] text-purple-900 border-purple-200';
    if (s.includes('livraison')) return 'bg-[#4898fe] text-white border-blue-600';
    if (s.includes('livr') || s.includes('encaiss')) return 'bg-[#10b981] text-white border-green-600';
    if (s.includes('finance')) return 'bg-[#11734b] text-white border-green-800';
    if (s.includes('hub')) return 'bg-[#4898fe] text-white border-blue-600';
    if (s.includes('upload')) return 'bg-[#ffbb83] text-orange-900 border-orange-300';
    if (s.includes('suspendu') || s.includes('suspondu')) return 'bg-[#ff8991] text-white border-red-400';
    if (s.includes('annul')) return 'bg-[#fffd12] text-slate-900 border-yellow-400';
    if (s.includes('retour')) return 'bg-[#ff0000] text-white border-red-800';
    if (s.includes('traitement')) return 'bg-[#ff904f] text-white border-orange-600';

    return 'bg-slate-100 text-slate-700 border-slate-200';
};
