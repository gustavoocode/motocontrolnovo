import { useConfig } from '../config.js';

export default function Saudacao() {
  const nome = useConfig('nome', ''), foto = useConfig('foto', '');
  if (!nome && !foto) return null;
  return <div className="saud">{foto && <img src={foto} alt="" />}{nome && <span>Olá, {nome}</span>}</div>;
}
