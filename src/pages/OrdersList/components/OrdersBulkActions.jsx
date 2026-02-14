import React from 'react';
import { Send, FileText } from 'lucide-react';

export default function OrdersBulkActions({
    selectedCount,
    bulkState,
    setBulkState,
    availableStates,
    handleBulkUpdate,
    isBulkUpdating,
    handleBulkSendToNoest,
    handleExportSelection
}) {
    if (selectedCount === 0) return null;

    return (
        <div className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2 mx-4 md:mx-8 mb-4 md:mb-6">
            <div className="flex items-center justify-between md:justify-start gap-4">
                <span className="text-sm font-bold text-blue-800 whitespace-nowrap">{selectedCount} sélectionnée(s)</span>
                <div className="hidden md:block h-4 w-px bg-blue-200"></div>
            </div>

            <select
                value={bulkState}
                onChange={(e) => setBulkState(e.target.value)}
                className="w-full md:w-auto text-sm border-slate-200 rounded-md focus:border-blue-500 focus:ring-blue-500"
            >
                <option value="">Modifier l'état...</option>
                {(availableStates || []).map(state => (
                    <option key={state} value={state}>{state}</option>
                ))}
            </select>

            <button
                onClick={handleBulkUpdate}
                disabled={!bulkState || isBulkUpdating}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
                {isBulkUpdating ? '...' : 'Appliquer'}
            </button>

            <button
                onClick={handleBulkSendToNoest}
                disabled={isBulkUpdating}
                className="w-full md:w-auto px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                title="Envoyer la sélection vers Noest"
            >
                <Send className="w-4 h-4" />
                {isBulkUpdating ? '...' : 'Envoyer vers Noest'}
            </button>

            <div className="h-6 w-px bg-blue-200 mx-1 hidden md:block"></div>

            <div className="flex items-center gap-1">
                <button
                    onClick={handleExportSelection}
                    className="p-2 bg-white text-red-500 rounded border border-blue-100 hover:bg-red-50 transition-colors"
                    title="Exporter la sélection en PDF"
                >
                    <FileText className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
