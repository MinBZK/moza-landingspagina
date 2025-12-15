export function Header() {
  return (
    // <header className="max-w-[1200px] flex items-center justify-center">
    //   <div className=" logo">
    //     <div className="logo__wrapper">
    //       <figure className="flex items-center">
    //         <figcaption>
    //           <p className="text-lg font-bold mb-0">MijnOverheid Zakelijk</p>
    //           <p className="font-serif italic">Overzicht in wat er speelt</p>
    //         </figcaption>
    //         <img
    //           src="/logo.svg"
    //           alt="Logo Rijksoverheid"
    //           id="logotype"
    //         />
    //       </figure>
    //     </div>
    //   </div>
    // </header>
<header className="min-w-[1200px] mx-auto px-3 grid grid-cols-3 items-center">
  {/* Left text */}
  <div className="justify-self-start">
    <p className="text-lg font-bold !mb-0">MijnOverheid Zakelijk</p>
    <p className="font-serif italic">Overzicht in wat er speelt</p>
  </div>

  {/* Center logo */}
  <div className="justify-self-center">
    <img
      src="/logo.svg"
      alt="Logo Rijksoverheid"
      id="logotype"
    />
  </div>

  {/* Right spacer (empty but important) */}
  <div />
</header>

  );
}
