import React from 'react';
import { Search, X, RefreshCw, FileText, StickyNote, Truck } from 'lucide-react';

export default function OrdersFilterBar({
    filteredCount,
    filterText,
    setFilterText,
    onRefreshOrders,
    onExportPDF,
    availableStatuses,
    statusFilter,
    setStatusFilter,
    statusCounts,
    remarkFilter,
    setRemarkFilter,
    shippedFilter,
    setShippedFilter
}) {
    return (
        <div className="px-4 py-4 md:px-8 md:py-6 border-b border-slate-100 flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">Liste des commandes ({filteredCount})</h2>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
                        <input
                            type="text"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            placeholder="Rechercher..."
                            className="pl-9 pr-8 py-2 md:py-3 w-full md:w-80 bg-white border border-slate-200 rounded-lg md:rounded-xl text-xs md:text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 md:focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all shadow-sm"
                        />
                        {filterText && (
                            <button
                                onClick={() => setFilterText('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-3 h-3 text-slate-400" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setRemarkFilter(!remarkFilter)}
                        className={`flex items-center justify-center h-10 w-10 rounded-lg border transition-all shadow-sm ${remarkFilter
                            ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300'
                            }`}
                        title={remarkFilter ? 'Afficher toutes les commandes' : 'Filtrer par remarque'}
                    >
                        <StickyNote className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setShippedFilter(!shippedFilter)}
                        className={`flex items-center justify-center h-10 w-10 rounded-lg border transition-all shadow-sm ${shippedFilter
                            ? 'bg-purple-100 border-purple-400 text-purple-700'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300'
                            }`}
                        title={shippedFilter ? 'Afficher toutes les commandes' : 'Filtrer les commandes envoyées'}
                    >
                        <Truck className="w-4 h-4" />
                    </button>



                    <button
                        onClick={onRefreshOrders}
                        className="flex items-center justify-center h-10 w-10 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                        title="Actualiser les commandes"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                        onClick={onExportPDF}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors shadow-sm text-xs md:text-sm font-bold whitespace-nowrap"
                        title="Exporter PDF"
                    >
                        <FileText className="w-4 h-4" />
                        <span className="hidden md:inline">Exporter PDF</span>
                    </button>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                {availableStatuses.map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`group relative px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${statusFilter === status
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md md:shadow-lg shadow-blue-500/30'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                    >
                        <span className="flex items-center gap-1.5 md:gap-2">
                            {status}
                            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 md:min-w-[24px] md:h-6 px-1.5 text-[10px] md:text-xs font-bold rounded-full transition-all ${statusFilter === status
                                ? 'bg-white/20 text-white backdrop-blur-sm'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                                }`}>
                                {statusCounts[status]}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
