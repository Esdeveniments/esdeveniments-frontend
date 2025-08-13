export const metadata = {
  title: "Política de privacitat | Esdeveniments.cat",
  description: "Informació bàsica sobre privacitat i tractament de dades.",
};

export default function Page() {
  return (
    <div className="w-full flex-col justify-center items-center sm:w-[580px] md:w-[768px] lg:w-[1024px] mt-28 px-2 lg:px-0">
      <h1 className="uppercase mb-4">Política de privacitat</h1>
      <p className="mb-4 text-sm text-blackCorp/80">
        Pàgina provisional per a l'MVP. Utilitzem dades mínimes per a la prestació del servei i analítica agregada. Les dades de pagament es processen via Stripe.
      </p>
      <ul className="list-disc ml-5 text-sm text-blackCorp/80 space-y-1">
        <li>Correus i dades personals només s'utilitzen per a la gestió del servei i comunicacions necessàries.</li>
        <li>Les dades de targeta no es guarden als nostres servidors. Stripe és el processador de pagaments.</li>
        <li>Pots contactar-nos per exercir drets d'accés, rectificació i supressió.</li>
      </ul>
    </div>
  );
}