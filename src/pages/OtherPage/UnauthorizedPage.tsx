import { Link } from 'react-router';

export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Accès refusé</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <Link
                to="/"
                className="px-5 py-2.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors"
            >
                Retour au tableau de bord
            </Link>
        </div>
    );
}
