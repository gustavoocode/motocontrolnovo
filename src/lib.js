export const hojeISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const emCentavos = (reais) => Math.round(Number(reais || 0) * 100);
export const reais = (centavos) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const PLATAFORMAS = ['iFood', '99', 'Uber', 'Entregas particulares', 'Outros'];
export const CATEGORIAS = ['Combustível', 'Alimentação', 'Óleo', 'Pneus', 'Manutenção', 'Peças', 'Documentação', 'Seguro', 'Multas', 'Outros'];
const iso = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
export const addDias = (dataISO, n) => { const [y, m, d] = dataISO.split('-').map(Number); return iso(new Date(y, m - 1, d + n)); };
export const inicioMes = () => hojeISO().slice(0, 8) + '01';
export const dataCurta = (s) => `${s.slice(8)}/${s.slice(5, 7)}`;
export const paraCentavos = (t) => {
  const s = String(t).trim();
  const n = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Math.round(parseFloat(n) * 100);
};
export const num = (t) => parseFloat(String(t).trim().replace(',', '.'));
export { iso as dataISO };
export const inicioSemana = () => { const dow = (new Date().getDay() + 6) % 7; return addDias(hojeISO(), -dow); };
export const valorTxt = (c) => (c / 100).toFixed(2).replace('.', ',');
export async function entregar(file) {
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file] });
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
  URL.revokeObjectURL(url);
}
