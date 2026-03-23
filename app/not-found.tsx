import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex flex-col items-center justify-center p-4 transition-colors">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-stone-800 dark:text-stone-100 mb-4">404 - Not Found</h2>
        <p className="text-stone-600 dark:text-stone-400 mb-8">Could not find requested resource</p>
        <Link 
          href="/"
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium inline-block"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
