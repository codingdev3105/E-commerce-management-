import { useState, useEffect } from 'react';
import { getNoestWilayas, getNoestCommunes, getNoestDesks } from '../services/api';
import { MapPin, Building, Truck, Search, Map, Copy } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAppData } from '../context/AppDataContext';

function LocationsPage() {
    const [activeTab, setActiveTab] = useState('wilayas');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useUI();
    const { wilayas: sheetWilayas } = useAppData();

    const handleCopy = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} copié !`);
    };

    const [allWilayas, setAllWilayas] = useState([]);

    useEffect(() => {
        setSearchTerm(''); // Reset search on tab change
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let result = [];
            if (activeTab === 'wilayas') {
                result = await getNoestWilayas();
                setAllWilayas(result); // Keep them for lookup too
            } else if (activeTab === 'communes') {
                // We need wilayas for search by name, fetch them if needed
                if (allWilayas.length === 0) {
                    const w = await getNoestWilayas();
                    setAllWilayas(Array.isArray(w) ? w : Object.values(w));
                }
                result = await getNoestCommunes();
            } else if (activeTab === 'desks') {
                result = await getNoestDesks();
            }

            // Ensure result is an array
            if (result && typeof result === 'object' && !Array.isArray(result)) {
                result = Object.values(result);
            } else if (!Array.isArray(result)) {
                result = [];
            }

            console.log(result);
            setData(result);
        } catch (error) {
            console.error("Error fetching locations data", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item => {
        const search = searchTerm.toLowerCase();
        if (activeTab === 'wilayas') {
            return (item.nom?.toLowerCase().includes(search) || item.code?.toString().includes(search));
        } else if (activeTab === 'communes') {
            if (!search) return false; // Don't show anything by default

            const wilaya = allWilayas.find(w => w.code == item.wilaya_id);
            const wilayaName = wilaya ? wilaya.nom.toLowerCase() : '';

            return (
                item.nom?.toLowerCase().includes(search) ||
                item.wilaya_id?.toString().includes(search) ||
                wilayaName.includes(search)
            );
        } else if (activeTab === 'desks') {
            const wilaya = allWilayas.find(w => w.code == item.wilaya_id);
            const wilayaName = wilaya ? wilaya.nom.toLowerCase() : '';
            return (
                item.name?.toLowerCase().includes(search) ||
                item.code?.toString().toLowerCase().includes(search) ||
                wilayaName.includes(search)
            );
        }
        return true;
    });

    const formatPhones = (phones) => {
        if (!phones) return '-';
        if (typeof phones === 'string') return phones;
        return Object.values(phones).filter(Boolean).join(' / ');
    };

    const renderTable = () => {
        if (loading) {
            return <div className="p-8 text-center text-slate-400 animate-pulse">Chargement des données...</div>;
        }

        if (activeTab === 'communes' && !searchTerm) {
            return (
                <div className="p-12 text-center flex flex-col items-center gap-3 text-slate-400">
                    <Search className="w-12 h-12 text-slate-200" />
                    <p className="font-medium text-slate-600">Recherche de Communes</p>
                    <p className="text-sm max-w-md">Veuillez entrer le nom d'une commune, le code postal, le nom d'une wilaya (ex: "Adrar") ou son code (ex: "1") pour afficher les résultats.</p>
                </div>
            );
        }

        if (filteredData.length === 0) {
            return <div className="p-8 text-center text-slate-400">Aucune donnée trouvée.</div>;
        }

        return (
            <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {activeTab === 'wilayas' && (
                                    <>
                                        <th className="px-6 py-4">Code</th>
                                        <th className="px-6 py-4">Nom de la Wilaya</th>
                                        <th className="px-6 py-4">Livraison (Dom)</th>
                                        <th className="px-6 py-4">Livraison (Stop)</th>
                                        <th className="px-6 py-4">Statut</th>
                                    </>
                                )}
                                {activeTab === 'communes' && (
                                    <>
                                        <th className="px-6 py-4">Code Postal</th>
                                        <th className="px-6 py-4">Nom de la Commune</th>
                                        <th className="px-6 py-4">Wilaya ID</th>
                                    </>
                                )}
                                {activeTab === 'desks' && (
                                    <>
                                        <th className="px-6 py-4">Code</th>
                                        <th className="px-6 py-4">Station</th>
                                        <th className="px-6 py-4">Adresse</th>
                                        <th className="px-6 py-4">Téléphone</th>
                                        <th className="px-6 py-4">Localisation</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item, index) => (
                                <tr key={item.id || item.code || index} className="hover:bg-blue-50/30 transition-colors">
                                    {activeTab === 'wilayas' && (() => {
                                        const wilayaData = sheetWilayas?.find(w => String(w.code) === String(item.code));
                                        return (
                                            <>
                                                <td className="px-6 py-4 font-mono text-slate-500">{item.code}</td>
                                                <td className="px-6 py-4 font-bold text-slate-700">{item.nom}</td>
                                                <td className="px-6 py-4 font-medium text-slate-600">
                                                    {wilayaData?.delivery_price ? `${wilayaData.delivery_price} DA` : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-600">
                                                    {wilayaData?.delivery_price_desk ? `${wilayaData.delivery_price_desk} DA` : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.is_active ?
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Actif</span>
                                                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Inactif</span>
                                                    }
                                                </td>
                                            </>
                                        );
                                    })()}
                                    {activeTab === 'communes' && (
                                        <>
                                            <td className="px-6 py-4 font-mono text-slate-500">{item.code_postal}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700">{item.nom}</td>
                                            <td className="px-6 py-4 text-slate-500">{item.wilaya_id}</td>
                                        </>
                                    )}
                                    {activeTab === 'desks' && (
                                        <>
                                            <td className="px-6 py-4 font-mono text-slate-500">{item.code}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700">{item.name}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500 max-w-xs">{item.address}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{formatPhones(item.phones)}</td>
                                            <td className="px-6 py-4">
                                                {item.map && (
                                                    <a
                                                        href={item.map}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                    >
                                                        <MapPin className="w-4 h-4" /> Voir
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {item.map && (
                                                        <button
                                                            onClick={() => handleCopy(item.map, "Lien Map")}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Copier le lien Google Maps"
                                                        >
                                                            <Map className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCopy(item.address, "Adresse")}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Copier l'adresse"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                    {filteredData.map((item, index) => (
                        <div key={item.id || item.code || index} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                            {activeTab === 'wilayas' && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                            {item.code}
                                        </div>
                                        <span className="font-bold text-slate-800">{item.nom}</span>
                                    </div>
                                    <div>
                                        {item.is_active ?
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Actif</span>
                                            : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactif</span>
                                        }
                                    </div>
                                </div>
                            )}

                            {activeTab === 'communes' && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800">{item.nom}</span>
                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{item.code_postal}</span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Wilaya ID: <span className="font-medium text-slate-700">{item.wilaya_id}</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'desks' && (
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-bold text-slate-800">{item.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">Code: {item.code}</div>
                                        </div>
                                        {item.map && (
                                            <a
                                                href={item.map}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg"
                                            >
                                                <MapPin className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-2">
                                        <div className="text-slate-600">{item.address}</div>
                                        <div className="text-slate-500 text-xs flex items-center gap-1">
                                            <Truck className="w-3 h-3" /> {formatPhones(item.phones)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                        {item.map && (
                                            <button
                                                onClick={() => handleCopy(item.map, "Lien Map")}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                <Map className="w-3 h-3" /> Copier Map
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleCopy(item.address, "Adresse")}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                        >
                                            <Copy className="w-3 h-3" /> Copier Adresse
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </>
        );
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Couverture & Réseau</h1>
                    <p className="text-slate-500 mt-1">Consultez la liste des wilayas, communes desservies et bureaux Stop Desk.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Tabs */}

                    <div className="flex flex-col md:flex-row p-1 bg-slate-100 rounded-xl w-full md:w-auto gap-2 md:gap-0">
                        <button
                            onClick={() => setActiveTab('wilayas')}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all w-full md:w-auto ${activeTab === 'wilayas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Map className="w-4 h-4" /> Wilayas
                        </button>
                        <button
                            onClick={() => setActiveTab('communes')}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all w-full md:w-auto ${activeTab === 'communes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Building className="w-4 h-4" /> Communes
                        </button>
                        <button
                            onClick={() => setActiveTab('desks')}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all w-full md:w-auto ${activeTab === 'desks' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Truck className="w-4 h-4" /> Bureaux (StopDesk)
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative group w-full md:w-auto">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher..."
                            className="pl-10 pr-4 py-2 w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>

                {renderTable()}
            </div>
        </section>
    );
}

export default LocationsPage;
