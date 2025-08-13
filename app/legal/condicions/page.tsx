export const metadata = {
  title: "Condicions de compra i promoció | Esdeveniments.cat",
  description: "Condicions bàsiques per a la compra de promocions.",
};

export default function Page() {
  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-28 px-2 lg:px-0">
      <h1 className="uppercase mb-4">Condicions de compra i promoció</h1>
      <p className="mb-4 text-sm text-blackCorp/80">
        Aquesta és una pàgina provisional per a l'MVP. Les promocions estan subjectes a revisió i poden ser rebutjades si incompleixen les nostres polítiques.
      </p>
      <ul className="list-disc ml-5 text-sm text-blackCorp/80 space-y-1">
        <li>No es garanteix l'aprovació immediata. Ens reservem el dret d'editar o rebutjar creatives.</li>
        <li>No es permeten continguts il·lícits, ofensius, o que infringin drets de tercers.</li>
        <li>Les promocions no afecten el posicionament SEO ni la informació orgànica de la web.</li>
        <li>Els reemborsos s'estudiaran cas per cas en situacions justificades.</li>
      </ul>
    </div>
  );
}