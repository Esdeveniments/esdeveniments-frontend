import { memo, JSX } from 'react';

function AdBoard(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-56 w-full bg-yellow-100 border border-yellow-300 rounded-lg p-4 text-center">
      <p className="text-lg font-semibold text-yellow-800">
        L&apos;anunci no s&apos;ha pogut carregar.
      </p>
      <p className="text-sm text-yellow-700 mt-2">
        Si us plau, ajuda&apos;ns a mantenir aquesta pàgina desactivant
        qualsevol bloquejador d&apos;anuncis. Gràcies per la teva comprensió i
        suport!
      </p>
      <p className="text-sm text-yellow-700 mt-2">
        Si estàs interessat a anunciar-te aquí,{" "}
        <a 
          className="text-primary" 
          href="mailto:hola@esdeveniments.cat"
          rel="noopener noreferrer"
        >
          contacta&apos;ns
        </a>{" "}
        per obtenir més informació.
      </p>
    </div>
  );
}

export default memo(AdBoard);
