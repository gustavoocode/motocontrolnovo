import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { hojeISO, reais } from '../lib.js';
import Odometro from '../components/Odometro.jsx';
import Alertas from '../components/Alertas.jsx';
import SalarioResumo from '../components/SalarioResumo.jsx';
import MetaDia from '../components/MetaDia.jsx';
import Saudacao from '../components/Saudacao.jsx';
import { useConfig } from '../config.js';
import Painel from '../components/Painel.jsx';

const DIAS_ALERTA_BACKUP = 7;

export default function Inicio() {
  const hoje = hojeISO();
  const lembrar = useConfig('lembreteBackup', true);
  const dados = useLiveQuery(async () => {
    const [ganhos, despesas, total, backup] = await Promise.all([
      db.ganhos.where('data').equals(hoje).toArray(),
      db.despesas.where('data').equals(hoje).toArray(),
      Promise.all([db.ganhos.count(), db.despesas.count()]),
      db.config.get('ultimoBackup'),
    ]);
    return { ganhos, despesas, temDados: total[0] + total[1] > 0, backup: backup?.valor };
  }, [hoje]);

  if (!dados) return <p className="mudo">Carregando…</p>;

  const ganhou = dados.ganhos.reduce((s, g) => s + (g.valor || 0) + (g.gorjeta || 0), 0);
  const gastou = dados.despesas.reduce((s, d) => s + (d.valor || 0), 0);
  const dias = dados.backup ? (Date.now() - new Date(dados.backup)) / 86400000 : Infinity;
  const lancamentos = [
    ...dados.ganhos.map((g) => ({ k: `g${g.id}`, id: g.id, nome: g.descricao || g.plataforma, valor: (g.valor || 0) + (g.gorjeta || 0) })),
    ...dados.despesas.map((d) => ({ k: `d${d.id}`, id: d.id, nome: d.descricao || d.categoria, valor: -(d.valor || 0) })),
  ].sort((a, b) => b.id - a.id);

  return (
    <>
      <Saudacao />
      <p className="rotulo">Sobrou hoje</p>
      <Odometro centavos={ganhou - gastou} />
      <p className="resumo">
        ganhou <b className="verde">{reais(ganhou)}</b> · gastou <b className="vermelho">{reais(gastou)}</b>
      </p>

      {lembrar && dados.temDados && dias >= DIAS_ALERTA_BACKUP && (
        <p className="aviso">
          {dados.backup ? `Seu último backup foi há ${Math.floor(dias)} dias.` : 'Você ainda não fez backup.'}{' '}
          <Link to="/mais">Exportar backup</Link>
        </p>
      )}

      <SalarioResumo />
      <MetaDia />
      <Alertas />
      <h2>Hoje</h2>
      {lancamentos.length === 0 ? (
        <p className="mudo">Nenhum lançamento hoje. Toque em + para registrar.</p>
      ) : (
        <ul className="lista">
          {lancamentos.map((l) => (
            <li key={l.k}>
              <span>{l.nome}</span>
              <b className={l.valor >= 0 ? 'verde' : 'vermelho'}>{l.valor >= 0 ? '+' : '−'}{reais(Math.abs(l.valor))}</b>
            </li>
          ))}
        </ul>
      )}

      <Painel />
    </>
  );
}
