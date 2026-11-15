import { useRef, useState } from 'react';
import { db } from '../db.js';
import { useConfig, setConfig } from '../config.js';
import { paraCentavos, valorTxt } from '../lib.js';

async function redimensionar(file) {
  const img = await createImageBitmap(file), s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const m = Math.min(img.width, img.height);
  c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
  return c.toDataURL('image/jpeg', 0.8);
}

function Dados() {
  const nome = useConfig('nome', ''), depr = useConfig('depreciacaoKm', 0);
  const [f, setF] = useState({ nome, depr: depr ? valorTxt(depr) : '' });
  const [msg, setMsg] = useState(null);
  async function salvar(e) {
    e.preventDefault();
    const dc = f.depr === '' ? 0 : paraCentavos(f.depr);
    if (!Number.isFinite(dc) || dc < 0) return setMsg({ erro: 'Informe um valor válido para a depreciação.' });
    await setConfig('nome', f.nome.trim()); await setConfig('depreciacaoKm', dc);
    setMsg({ ok: 'Configurações salvas.' });
  }
  return (
    <form onSubmit={salvar} className="bloco" noValidate>
      <label>Seu nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
      <label>Depreciação da moto por km (R$)<input inputMode="decimal" value={f.depr} onChange={(e) => setF({ ...f, depr: e.target.value })} placeholder="0,00" /></label>
      <p className="mudo">Com esse valor preenchido, os relatórios mostram também o lucro estimado após depreciação.</p>
      <button>Salvar</button>
      {msg && <p role="status" className={msg.ok ? 'msg ok' : 'msg erro'}>{msg.ok || msg.erro}</p>}
    </form>
  );
}

export default function Configuracoes() {
  const foto = useConfig('foto', ''), tema = useConfig('tema', 'escuro'), paleta = useConfig('paleta', 'verde');
  const alertas = useConfig('alertasManutencao', true), lembrete = useConfig('lembreteBackup', true);
  const entrada = useRef(null);
  const [erro, setErro] = useState('');
  async function escolher(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try { await setConfig('foto', await redimensionar(file)); setErro(''); } catch { setErro('Não foi possível usar essa imagem.'); }
  }
  return (
    <>
      <h1>Configurações</h1>
      <div className="foto">
        {foto ? <img src={foto} alt="Sua foto de perfil" /> : <span className="sem-foto" aria-hidden="true" />}
        <button className="sec" onClick={() => entrada.current.click()}>{foto ? 'Trocar foto' : 'Escolher foto'}</button>
        {foto && <button className="sec" onClick={() => setConfig('foto', '')}>Remover foto</button>}
        <input ref={entrada} type="file" accept="image/*" hidden onChange={escolher} />
      </div>
      {erro && <p role="alert" className="msg erro">{erro}</p>}
      <Dados key={useConfig('nome', '')} />
      <h2>Aparência</h2>
      <label>Tema<select value={tema} onChange={(e) => setConfig('tema', e.target.value)}><option value="escuro">Escuro</option><option value="claro">Claro</option></select></label>
      <label>Paleta de cores<select value={paleta} onChange={(e) => setConfig('paleta', e.target.value)}><option value="verde">Verde</option><option value="vermelho">Vermelho</option></select></label>
      <h2>Avisos dentro do app</h2>
      <label className="check"><input type="checkbox" checked={alertas} onChange={(e) => setConfig('alertasManutencao', e.target.checked)} /> Avisar de manutenção próxima ou atrasada</label>
      <label className="check"><input type="checkbox" checked={lembrete} onChange={(e) => setConfig('lembreteBackup', e.target.checked)} /> Lembrar de fazer backup a cada 7 dias</label>
      <p className="mudo">Os avisos aparecem na tela Início. Notificações no celular não estão disponíveis porque o app não usa servidor.</p>
    </>
  );
}
