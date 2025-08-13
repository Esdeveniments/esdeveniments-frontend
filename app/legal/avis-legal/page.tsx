export const metadata = {
  title: "Avís legal | Esdeveniments.cat",
  description: "Informació legal bàsica per a l'ús del lloc.",
};

export default function Page() {
  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-28 px-2 lg:px-0">
      <h1 className="uppercase mb-4">Avís legal</h1>
      <p className="mb-4 text-sm text-blackCorp/80">
        Pàgina provisional per a l'MVP. Aquest lloc web és propietat del titular corresponent. L'ús implica l'acceptació d'aquestes condicions.
      </p>
      <ul className="list-disc ml-5 text-sm text-blackCorp/80 space-y-1">
        <li>Propietat intel·lectual: els continguts i marques són dels seus titulars.</li>
        <li>Responsabilitat: no garantim la disponibilitat continuada del servei.</li>
        <li>Contacte: facilita un correu de suport per qüestions legals i reclamacions.</li>
      </ul>
    </div>
  );
}