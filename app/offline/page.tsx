export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🌐 Sense connexió
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          No pots connectar-te a internet. Alguns continguts emmagatzemats
          podrien estar disponibles.
        </p>
        <a
          href="/"
          className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Torna a l&apos;inici
        </a>
        <br />
        <a
          href="/barcelona"
          className="inline-block mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Barcelona
        </a>
        <a
          href="/catalunya"
          className="inline-block mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Catalunya
        </a>
      </div>
    </div>
  );
}
