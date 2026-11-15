import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../db.js';
import { hojeISO, addDias, inicioMes, dataCurta, reais } from '../lib.js';

const soma = (l) => l.reduce((s, i) => s + i.valor + (i.gorjeta || 0), 0);

export default function Painel() {
  const hoje = hojeISO(), mes = inicioMes(), ini7 = addDias(hoje, -6);
  const d = useLiveQuery(async () => {
    const de = ini7 < mes ? ini7 : mes;
    const [g, x] = await Promise.all([db.ganhos.where('data').aboveOrEqual(de).toArray(), db.despesas.where('data').aboveOrEqual(de).toArray()]);
    return { g, x };
  }, [hoje]);
  if (!d) return null;
  const gm = d.g.filter((i) => i.data >= mes), xm = d.x.filter((i) => i.data >= mes);
  const fat = soma(gm), desp = soma(xm), entregas = gm.reduce((s, i) => s + (i.entregas || 0), 0);
  const serie = [6, 5, 4, 3, 2, 1, 0].map((n) => {
    const dia = addDias(hoje, -n);
    return { dia: dataCurta(dia), Ganhos: soma(d.g.filter((i) => i.data === dia)) / 100, Despesas: soma(d.x.filter((i) => i.data === dia)) / 100 };
  });
  return (
    <>
      <h2>Este mês</h2>
      <ul className="lista">
        <li><span>Faturamento</span><b className="verde">{reais(fat)}</b></li>
        <li><span>Despesas</span><b className="vermelho">{reais(desp)}</b></li>
        <li><span>Lucro líquido</span><b className={fat - desp >= 0 ? 'verde' : 'vermelho'}>{reais(fat - desp)}</b></li>
        <li><span>Entregas{entregas ? ` · média ${reais(Math.round(fat / entregas))}` : ''}</span><b>{entregas}</b></li>
      </ul>
      <h2>Últimos 7 dias</h2>
      <div style={{ height: 190 }}>
        <ResponsiveContainer>
          <BarChart data={serie} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="dia" tick={{ fill: '#9A9CA3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={false} contentStyle={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--txt)' }}
                     formatter={(v) => reais(Math.round(v * 100))} />
            <Bar className="b-ganho" dataKey="Ganhos" fill="#2FD27A" radius={[4, 4, 0, 0]} />
            <Bar className="b-despesa" dataKey="Despesas" fill="#F0524F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
