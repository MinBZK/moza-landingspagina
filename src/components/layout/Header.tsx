export function Header() {
  return (
    <header className="w-full">
      <div className="logo">
        <div className="logo__wrapper">
          <figure className="m-0 ml-40 flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="Logo Rijksoverheid"
              id="logotype"
              className="mr-3"
            />
            <figcaption className="text-[15px] font-[625]">
              <span className="font-bold text-[#154273]">
                MijnOverheid Zakelijk
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </header>
  );
}
