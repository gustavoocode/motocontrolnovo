// Mostra um valor em centavos como dígitos de painel que rolam ao mudar.
export default function Odometro({ centavos }) {
  const negativo = centavos < 0;
  const dig = String(Math.abs(centavos)).padStart(5, '0');
  const inteiro = dig.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const texto = `${inteiro},${dig.slice(-2)}`;
  return (
    <div className={`odo ${negativo ? 'neg' : ''}`} role="img"
         aria-label={`${negativo ? 'menos ' : ''}${(Math.abs(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}>
      <span className="odo-rs">{negativo ? '−R$' : 'R$'}</span>
      {[...texto].map((c, i) =>
        /\d/.test(c) ? (
          <span className="col" key={i} aria-hidden="true">
            <span className="roll" style={{ transform: `translateY(${-Number(c)}em)` }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        ) : <span className="sep" key={i} aria-hidden="true">{c}</span>
      )}
    </div>
  );
}
