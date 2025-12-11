import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut, Shield, Plus, List, LayoutDashboard, BarChart as BarChartIcon, Truck, Map } from 'lucide-react';

function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const role = localStorage.getItem('role') || 'User';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/'); // Back to login which is now root
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-20">

            {/* Navbar / Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
                <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold uppercase">
                            {role.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 capitalize">
                                {role} manager
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Navigation Links for Desktop */}
                        <nav className="hidden md:flex items-center gap-4">
                            <Link to="/AjouterCommande" className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/AjouterCommande') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                                <Plus className="w-4 h-4" /> Ajouter
                            </Link>
                            <Link to="/commandes" className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/commandes') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                                <List className="w-4 h-4" /> Liste
                            </Link>
                            <Link to="/statistique" className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/statistique') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                                <BarChartIcon className="w-4 h-4" /> Statistiques
                            </Link>
                            <Link to="/noest-express-service" className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/noest-express-service') ? 'text-green-600' : 'text-slate-500 hover:text-slate-800'}`}>
                                <Truck className="w-4 h-4" /> Noest
                            </Link>
                            <Link to="/locations" className={`text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/locations') ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                                <Map className="w-4 h-4" /> Couverture
                            </Link>
                        </nav>

                        <button onClick={handleLogout} className="text-sm text-slate-500 font-medium hover:text-red-600 flex items-center gap-2 transition-colors">
                            <LogOut className="w-4 h-4" /> Déconnexion
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-6 py-3 safe-area-bottom">
                <nav className="flex justify-between items-center">
                    <Link to="/AjouterCommande" className={`flex flex-col items-center gap-1 ${isActive('/AjouterCommande') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-1 rounded-full ${isActive('/AjouterCommande') ? 'bg-blue-50' : ''}`}>
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium">Ajouter</span>
                    </Link>

                    <Link to="/commandes" className={`flex flex-col items-center gap-1 ${isActive('/commandes') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-1 rounded-full ${isActive('/commandes') ? 'bg-blue-50' : ''}`}>
                            <List className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium">Liste</span>
                    </Link>

                    <Link to="/statistique" className={`flex flex-col items-center gap-1 ${isActive('/statistique') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-1 rounded-full ${isActive('/statistique') ? 'bg-blue-50' : ''}`}>
                            <BarChartIcon className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium">Stats</span>
                    </Link>

                    <Link to="/noest-express-service" className={`flex flex-col items-center gap-1 ${isActive('/noest-express-service') ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-1 rounded-full ${isActive('/noest-express-service') ? 'bg-green-50' : ''}`}>
                            <Truck className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium">Noest</span>
                    </Link>

                    <Link to="/locations" className={`flex flex-col items-center gap-1 ${isActive('/locations') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-1 rounded-full ${isActive('/locations') ? 'bg-blue-50' : ''}`}>
                            <Map className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium">Geo</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
}

export default MainLayout;
