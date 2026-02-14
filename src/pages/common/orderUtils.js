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

export const getStateColor = (state) => {
    const s = safeString(state);
    if (s.includes('Nouvelle')) return 'bg-blue-100 text-blue-700 border border-blue-200';
    if (s.includes('Annuler') || s.includes('Retour')) return 'bg-red-100 text-red-700 border border-red-200';
    if (s.includes('Livré') || s.includes('Encaissé')) return 'bg-green-100 text-green-700 border border-green-200';
    if (s.includes('En Livraison')) return 'bg-orange-100 text-orange-700 border border-orange-200';
    if (s.includes('En Hub') || s.includes('Validé') || s.includes('Uploadé')) return 'bg-cyan-100 text-cyan-700 border border-cyan-200';
    if (s.includes('System') || s.includes('Envoyer')) return 'bg-amber-100 text-amber-700 border border-amber-200';
    if (s.includes('Atelier')) return 'bg-purple-100 text-purple-700 border border-purple-200';
    return 'bg-gray-100 text-gray-700 border border-gray-200';
};
