import { reais } from '../lib.js';

export default function Progresso({ rotulo, atual, meta }) {
  const pct = meta > 0 ? Math.max(0, Math.min(100, Math.round((atual / meta) * 100))) : 0;
  return (
    <div className="prog">
      <p><span>{rotulo}</span><b>{pct}%</b></p>
      <div className="barra" role="progressbar" aria-label={rotulo} aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${pct}%` }} /></div>
      <small>{reais(Math.max(0, atual))} de {reais(meta)} · {atual >= meta ? 'meta atingida' : `faltam ${reais(meta - atual)}`}</small>
    </div>
  );
}
