import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from './services/api';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useAppData } from './context/AppDataContext';
import { useStates } from './context/StatesContext';

function LoginPage() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { refreshData } = useAppData();
    const { refreshStates } = useStates();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await login(code);
            console.log(data);
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);

            // Refresh global data now that we have a token
            await Promise.all([refreshData(), refreshStates()]);

            navigate('/statistique');
        } catch (err) {
            console.error(err);
            setError('Code invalide. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white">
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Role Manager</h1>
                    <p className="text-blue-100 text-sm mt-2">Accédez à votre espace E-commerce</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Code d'accès</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono tracking-widest text-lg"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center justify-center animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se Connecter'}
                        </button>
                    </form>
                </div>

                <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100">
                    Système de gestion YStore v1.2
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
