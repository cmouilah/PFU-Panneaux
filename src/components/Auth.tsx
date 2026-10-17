import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MapPin } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 rounded-full p-3 mr-3">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GeoSignal</h1>
            <p className="text-sm text-gray-600">Ain Témouchent</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
          {isSignUp ? 'Créer un compte' : 'Connexion'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Chargement...' : isSignUp ? "S'inscrire" : 'Se connecter'}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
        </button>

        <div className="mt-6 p-4 bg-blue-50/80 border border-blue-200 rounded-xl">
          <h3 className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider flex items-center justify-between">
            <span>Comptes de test locaux (Cliquez pour tester)</span>
            <span className="text-[10px] font-normal text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-100">100% Hors Ligne</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@admin.com');
                setPassword('admin');
                setIsSignUp(false);
              }}
              className="p-2 bg-white rounded-lg border border-blue-200 text-left hover:bg-blue-50 transition-colors shadow-2xs"
            >
              <p className="font-bold text-blue-900">Admin</p>
              <p className="text-gray-500 font-mono text-[10px]">admin@admin.com</p>
              <p className="text-gray-400 text-[9px]">Mot de passe: admin</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('responsable@geosignal.dz');
                setPassword('responsable123');
                setIsSignUp(false);
              }}
              className="p-2 bg-white rounded-lg border border-blue-200 text-left hover:bg-blue-50 transition-colors shadow-2xs"
            >
              <p className="font-bold text-blue-900">Responsable</p>
              <p className="text-gray-500 font-mono text-[10px]">responsable@...</p>
              <p className="text-gray-400 text-[9px]">Mot de passe: responsable123</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('tech1@geosignal.dz');
                setPassword('tech123');
                setIsSignUp(false);
              }}
              className="p-2 bg-white rounded-lg border border-blue-200 text-left hover:bg-blue-50 transition-colors shadow-2xs"
            >
              <p className="font-bold text-blue-900">Technicien</p>
              <p className="text-gray-500 font-mono text-[10px]">tech1@geosignal.dz</p>
              <p className="text-gray-400 text-[9px]">Mot de passe: tech123</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('observateur@geosignal.dz');
                setPassword('obs123');
                setIsSignUp(false);
              }}
              className="p-2 bg-white rounded-lg border border-blue-200 text-left hover:bg-blue-50 transition-colors shadow-2xs"
            >
              <p className="font-bold text-blue-900">Observateur</p>
              <p className="text-gray-500 font-mono text-[10px]">observateur@...</p>
              <p className="text-gray-400 text-[9px]">Mot de passe: obs123</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
