/* ============================================================
   JOVI MOMENTS — jornada interativa
   Challenge FIAP + JOVI | Sprint 2
   Apenas JavaScript puro (ES6) + componentes do Bootstrap.

   Roteiro do arquivo:
   1. Dados e estado          6. Preview (antes/depois)
   2. Utilidades              7. Galeria e álbuns
   3. Gerador de imagens      8. Detalhe da foto
   4. Navegação               9. Compartilhamento
   5. Câmera                 10. Início do aplicativo
============================================================ */

(() => {
'use strict';

/* ---------- 1. DADOS E ESTADO ---------- */

const MODOS = [
  { id:'estudo',   nome:'Modo estudo',   dica:'Cadernos, notas e telas',   cores:['#F6EBD6','#D8B98A','#8C6A45'] },
  { id:'trabalho', nome:'Modo trabalho', dica:'Documentos e reuniões',     cores:['#DCE4F4','#8FA4C9','#2F3E5C'] },
  { id:'social',   nome:'Modo social',   dica:'Pessoas, comida e passeio', cores:['#FFD9C2','#F4736A','#5B2C6F'] }
];

const estado = {
  telaAtual:'tela-abertura',
  modo:'estudo',
  autoRealce:true,
  grade:true,
  cameraReal:false,
  passoOnb:0,
  filtro:'todos',
  visao:'fotos',
  midias:[],
  albuns:[],
  fotoAberta:null,
  pendente:null,          // foto capturada aguardando "salvar"
  kbEconomizados:0,
  compartilhamentos:[],
  sugestaoDispensada:false
};

const ONBOARDING = [
  { t:'Tratamento profissional na hora',
    d:'Cores mais ricas e nitidez ajustadas automaticamente, aproveitando 100% do potencial da câmera JOVI.',
    ctx:'social' },
  { t:'Um botão, três modos',
    d:'Estudo, trabalho ou social. O Moments ajusta a captura para o que você está fotografando.',
    ctx:'estudo' },
  { t:'A galeria se organiza sozinha',
    d:'As fotos entram separadas por data e contexto, e o app sugere álbuns quando percebe um padrão.',
    ctx:'trabalho' }
];

/* ---------- 2. UTILIDADES ---------- */

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const aleatorio = (min,max) => Math.random()*(max-min)+min;

/** Gerador determinístico: a mesma semente devolve sempre a mesma imagem. */
function semente(n){
  let s = n * 9301 + 49297;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function formatarTamanho(kb){
  return kb >= 1024 ? (kb/1024).toFixed(1).replace('.',',') + ' MB'
                    : Math.round(kb) + ' KB';
}

function rotuloData(data){
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const d = new Date(data); d.setHours(0,0,0,0);
  const dias = Math.round((hoje - d) / 86400000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  if (dias < 7)  return 'Esta semana';
  return d.toLocaleDateString('pt-BR',{ day:'2-digit', month:'long' });
}

function horaCurta(data){
  return new Date(data).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}

function vibrar(ms){ if (navigator.vibrate) navigator.vibrate(ms); }

/** Escapa texto do usuário antes de ir para innerHTML. */
function limpar(txt){
  return String(txt).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

/** Mensagem curta de retorno (usa o padrão visual de toast). */
function avisar(texto, detalhe){
  const area = $('#aviso-area');
  const el = document.createElement('div');
  el.className = 'aviso';
  el.innerHTML = `<span class="aviso__ponto"></span><span><strong>${limpar(texto)}</strong>${detalhe ? ' · ' + limpar(detalhe) : ''}</span>`;
  area.appendChild(el);
  setTimeout(() => {
    el.classList.add('aviso--saindo');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/* ---------- 3. GERADOR DE IMAGENS ---------- */
/* As "fotos" são desenhadas em SVG na hora: o protótipo não depende
   de nenhum arquivo externo e cada imagem sai diferente.            */

function gerarImagem(contexto, id, realce){
  const modo = MODOS.find(m => m.id === contexto) || MODOS[0];
  const [c1,c2,c3] = modo.cores;
  const r = semente(id);
  const formas = [];

  for (let i = 0; i < 5; i++){
    const cx = Math.round(r()*600), cy = Math.round(r()*800), rr = Math.round(40 + r()*190);
    formas.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${i%2 ? c3 : c1}" opacity="${(0.12+r()*0.3).toFixed(2)}"/>`);
  }
  const y = Math.round(300 + r()*250);
  formas.push(`<path d="M0 ${y} Q 300 ${y - 120 - r()*90} 600 ${y + 40} L600 800 L0 800 Z" fill="${c3}" opacity="0.45"/>`);
  formas.push(`<rect x="${Math.round(r()*300)}" y="${Math.round(r()*400)}" width="${Math.round(120+r()*220)}" height="${Math.round(90+r()*160)}" rx="18" fill="${c2}" opacity="0.35" transform="rotate(${Math.round(-14+r()*28)} 300 400)"/>`);

  /* O auto-realce é um filtro SVG de verdade: satura e abre o contraste.
     Sem ele, a imagem sai exatamente como o sensor entregou.          */
  const tratamento = realce ? `
    <filter id="jovi" color-interpolation-filters="sRGB">
      <feColorMatrix type="saturate" values="1.5"/>
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.16" intercept="-0.05"/>
        <feFuncG type="linear" slope="1.16" intercept="-0.05"/>
        <feFuncB type="linear" slope="1.16" intercept="-0.05"/>
      </feComponentTransfer>
    </filter>` : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>${tratamento}</defs>
    <g ${realce ? 'filter="url(#jovi)"' : ''}>
      <rect width="600" height="800" fill="url(#g)"/>${formas.join('')}
    </g>
  </svg>`;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Cria o objeto Mídia usado pela galeria (espelha a entidade do MER). */
function novaMidia(contexto, data, imagem, imagemOriginal, realce){
  const id = Date.now() + Math.floor(Math.random()*1000);
  const original = Math.round(aleatorio(3200,5400));
  const otimizado = Math.round(original * aleatorio(0.11,0.19));
  return {
    id,
    tipo:'foto',
    contexto,
    titulo: 'Foto de ' + contexto,
    dataHora: data || new Date(),
    caminho: imagem || gerarImagem(contexto, id, realce),
    caminhoOriginal: imagemOriginal || imagem || gerarImagem(contexto, id, false),
    realce: !!realce,
    favorito:false,
    kbOriginal: original,
    kbOtimizado: otimizado,
    msOtimizacao: Math.round(aleatorio(240,520))
  };
}

/* A galeria começa vazia: tudo o que aparece foi capturado pelo usuário. */

/* ---------- 4. NAVEGAÇÃO ---------- */

const TELAS_COM_MENU = ['tela-inicio','tela-galeria'];

function irPara(id){
  $$('.tela').forEach(t => t.classList.toggle('tela--ativa', t.id === id));
  estado.telaAtual = id;

  const menu = $('#menu');
  menu.hidden = !TELAS_COM_MENU.includes(id);
  $$('.menu__item').forEach(b => b.classList.toggle('ativo', b.dataset.ir === id));

  if (id === 'tela-camera') ligarCamera();
  else desligarCamera();

  if (id === 'tela-galeria') montarGaleria(true);
  if (id === 'tela-inicio')  atualizarInicio();

  const tela = document.getElementById(id);
  if (tela) tela.focus({ preventScroll:true });   // leitor de tela acompanha
}

/* ---------- 5. CÂMERA ---------- */

let fluxoVideo = null;
let frontal = false;
let sementeCena = Date.now() % 9999;

/** Redesenha a cena simulada mantendo a mesma composição, para que
    ligar e desligar o auto-realce mostre a diferença na hora.      */
function atualizarCena(){
  $('#visor').classList.toggle('visor--realce', estado.autoRealce);
  if (estado.cameraReal) return;
  $('#visor-cena').style.backgroundImage =
    `url("${gerarImagem(estado.modo, sementeCena, estado.autoRealce)}")`;
}

async function ligarCamera(){
  const visor = $('#visor');
  const video = $('#video');
  try {
    const fluxo = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode: frontal ? 'user' : 'environment' }, audio:false
    });
    // O usuário pode ter saído da câmera enquanto a permissão era pedida.
    if (estado.telaAtual !== 'tela-camera'){
      fluxo.getTracks().forEach(t => t.stop());
      return;
    }
    fluxoVideo = fluxo;
    video.srcObject = fluxoVideo;
    video.play().catch(() => {});   // o Safari às vezes precisa do play explícito
    visor.classList.add('tem-video');
    estado.cameraReal = true;
    atualizarCena();
  } catch (e) {
    // Sem permissão ou aberto via arquivo local: usamos a cena simulada.
    visor.classList.remove('tem-video');
    estado.cameraReal = false;
    atualizarCena();
  }
}

function desligarCamera(){
  if (fluxoVideo){ fluxoVideo.getTracks().forEach(t => t.stop()); fluxoVideo = null; }
}

function montarChipsModo(){
  const alvo = $('#chips-modo');
  alvo.innerHTML = '';
  MODOS.forEach(m => {
    const b = document.createElement('button');
    b.className = 'chip' + (m.id === estado.modo ? ' ativo' : '');
    b.textContent = m.nome.replace('Modo ','');
    b.setAttribute('role','tab');
    b.setAttribute('aria-selected', m.id === estado.modo);
    b.addEventListener('click', () => trocarModo(m.id));
    alvo.appendChild(b);
  });
}

function trocarModo(id){
  estado.modo = id;
  const m = MODOS.find(x => x.id === id);
  $('#camera-modo-nome').textContent = m.nome;
  $('#camera-modo-dica').textContent = m.dica;
  sementeCena = Date.now() % 9999;
  atualizarCena();
  montarChipsModo();
  vibrar(8);
}

/** Captura: usa o quadro real da câmera quando existe; senão, gera a cena. */
function capturar(){
  const botao = $('#btn-obturador');
  if (botao.classList.contains('ocupado')) return;

  botao.classList.add('ocupado');
  $('#visor-flash').classList.add('dispara');
  vibrar(18);

  const imagens = estado.cameraReal ? quadroDaCamera() : cenaGerada();

  // Tempo curto de "processamento" para o feedback visual fazer sentido.
  setTimeout(() => {
    $('#visor-flash').classList.remove('dispara');
    botao.classList.remove('ocupado');
    estado.pendente = novaMidia(estado.modo, new Date(),
                                imagens.tratada, imagens.original, estado.autoRealce);
    if (!estado.cameraReal){ sementeCena = Date.now() % 9999; atualizarCena(); }
    abrirPreview(estado.pendente);
  }, 380);
}

/** Desenha o quadro do vídeo com e sem o tratamento JOVI. */
function quadroDaCamera(){
  const video = $('#video');
  const c = $('#tela-oculta');
  c.width = 600; c.height = 800;
  const ctx = c.getContext('2d');
  const lado = Math.min(video.videoWidth, video.videoHeight * 0.75) || 600;
  const px = (video.videoWidth - lado)/2, py = (video.videoHeight - lado/0.75)/2;

  const desenhar = (filtro) => {
    ctx.filter = filtro;
    ctx.clearRect(0,0,600,800);
    ctx.drawImage(video, px, py, lado, lado/0.75, 0, 0, 600, 800);
    return c.toDataURL('image/jpeg', 0.85);
  };

  const original = desenhar('none');
  return {
    original,
    tratada: estado.autoRealce
      ? desenhar('saturate(1.35) contrast(1.14) brightness(1.04)')
      : original
  };
}

/** Mesma composição em duas versões: com e sem auto-realce. */
function cenaGerada(){
  const original = gerarImagem(estado.modo, sementeCena, false);
  return {
    original,
    tratada: estado.autoRealce ? gerarImagem(estado.modo, sementeCena, true) : original
  };
}

/* ---------- 6. PREVIEW (ANTES / DEPOIS) ---------- */

function abrirPreview(midia){
  $('#img-antes').src  = midia.caminhoOriginal;
  $('#img-depois').src = midia.caminho;
  $('#ficha-realce').textContent = midia.realce ? 'Ligado' : 'Desligado';
  $('#comparador').classList.toggle('comparador--sem', !midia.realce);
  $('#ficha-tamanho').textContent  = `${formatarTamanho(midia.kbOriginal)} → ${formatarTamanho(midia.kbOtimizado)}`;
  $('#ficha-tempo').textContent    = `${midia.msOtimizacao} ms`;
  $('#ficha-contexto').textContent = MODOS.find(m => m.id === midia.contexto).nome.replace('Modo ','');
  moverComparador(50);
  $('#comparador-range').value = 50;
  irPara('tela-preview');
}

function moverComparador(pct){
  $('#comparador-corte').style.clipPath = `inset(0 ${100-pct}% 0 0)`;
  $('#comparador-alca').style.left = pct + '%';
}

function salvarFoto(){
  const midia = estado.pendente;
  if (!midia) return;
  estado.midias.unshift(midia);
  estado.kbEconomizados += (midia.kbOriginal - midia.kbOtimizado);
  estado.pendente = null;
  // volta para a visão completa, senão a foto nova pode cair fora do filtro
  estado.filtro = 'todos';
  estado.visao = 'fotos';
  $('#miniatura-ultima').style.backgroundImage = `url("${midia.caminho}")`;
  avisar('Foto salva', `otimizada em ${midia.msOtimizacao} ms`);
  vibrar(12);
  irPara('tela-galeria');
}

/* ---------- 7. GALERIA E ÁLBUNS ---------- */

function montarChipsFiltro(){
  const alvo = $('#chips-filtro');
  const contagens = { todos: estado.midias.length };
  MODOS.forEach(m => contagens[m.id] = estado.midias.filter(f => f.contexto === m.id).length);
  contagens.favoritos = estado.midias.filter(f => f.favorito).length;

  const itens = [
    { id:'todos', rotulo:'Todas' },
    ...MODOS.map(m => ({ id:m.id, rotulo:rotuloContexto(m.id) })),
    { id:'favoritos', rotulo:'Favoritas' }
  ];

  alvo.innerHTML = '';
  itens.forEach(it => {
    const b = document.createElement('button');
    b.className = 'chip' + (it.id === estado.filtro ? ' ativo' : '');
    b.setAttribute('role','tab');
    b.setAttribute('aria-selected', it.id === estado.filtro);
    b.innerHTML = `${it.rotulo}<small>${contagens[it.id] || 0}</small>`;
    b.addEventListener('click', () => { estado.filtro = it.id; montarGaleria(); });
    alvo.appendChild(b);
  });
}

function filtrarMidias(){
  if (estado.filtro === 'todos') return estado.midias;
  if (estado.filtro === 'favoritos') return estado.midias.filter(f => f.favorito);
  return estado.midias.filter(f => f.contexto === estado.filtro);
}

/** Esqueletos primeiro, conteúdo depois: o usuário nunca vê tela em branco. */
let galeriaJaAberta = false;
let timerGaleria = null;

function atualizarAbas(){
  $('#aba-fotos-n').textContent  = estado.midias.length;
  $('#aba-albuns-n').textContent = estado.albuns.length;
  const fotos = estado.visao === 'fotos';
  $('#aba-fotos').classList.toggle('aba--ativa', fotos);
  $('#aba-albuns').classList.toggle('aba--ativa', !fotos);
  $('#aba-fotos').setAttribute('aria-selected', fotos);
  $('#aba-albuns').setAttribute('aria-selected', !fotos);
  $('#chips-filtro').hidden = !fotos || !estado.midias.length;
}

/** Explica o filtro em uma frase e oferece o atalho para virar álbum. */
function atualizarResumo(){
  const caixa = $('#resumo-filtro');
  const ehTipo = MODOS.some(m => m.id === estado.filtro);

  if (estado.visao !== 'fotos' || !ehTipo || !estado.midias.length){
    caixa.hidden = true;
    return;
  }
  const total = filtrarMidias().length;
  const album = estado.albuns.find(a => a.contexto === estado.filtro);
  const botao = $('#btn-resumo-album');

  if (album){
    $('#resumo-texto').innerHTML =
      `Estas <strong>${total} fotos</strong> já formam o álbum "${limpar(album.nome)}".`;
    botao.hidden = true;
  } else {
    $('#resumo-texto').innerHTML =
      `<strong>${total} ${total === 1 ? 'foto' : 'fotos'}</strong> do tipo ${estado.filtro}.`;
    botao.hidden = false;
  }
  caixa.hidden = false;
}

function montarGaleria(comEsqueleto = false){
  montarChipsFiltro();
  atualizarAbas();
  atualizarResumo();
  const grade = $('#grade-fotos');
  const albuns = $('#lista-albuns');
  const vazio = $('#galeria-vazia');

  clearTimeout(timerGaleria);

  if (estado.visao === 'albuns'){
    grade.hidden = true; vazio.hidden = true; albuns.hidden = false;
    $('#sugestao').hidden = true;
    montarAlbuns();
    return;
  }
  albuns.hidden = true;
  grade.hidden = false;

  const lista = filtrarMidias();
  if (!lista.length){
    grade.innerHTML = '';
    vazio.hidden = false;
    $('#sugestao').hidden = true;
    return;
  }
  vazio.hidden = true;

  // O esqueleto só faz sentido ao entrar na galeria. Trocar de filtro ou
  // favoritar uma foto redesenha na hora, sem piscar a tela.
  grade.innerHTML = '';
  if (comEsqueleto){
    for (let i = 0; i < Math.min(lista.length, 9); i++){
      const s = document.createElement('div');
      s.className = 'esqueleto';
      grade.appendChild(s);
    }
  }

  clearTimeout(timerGaleria);
  timerGaleria = setTimeout(() => {
    grade.innerHTML = '';
    let rotuloAtual = null;

    lista.forEach((midia, i) => {
      const rot = rotuloData(midia.dataHora);
      if (rot !== rotuloAtual){
        rotuloAtual = rot;
        const h = document.createElement('h3');
        h.className = 'dia';
        h.textContent = rot;
        grade.appendChild(h);
      }

      const b = document.createElement('button');
      b.className = 'foto';
      b.setAttribute('aria-label', `${midia.titulo}, ${rot} às ${horaCurta(midia.dataHora)}`);
      b.innerHTML = `
        <img alt="" loading="lazy">
        <span class="foto__ctx">${rotuloContexto(midia.contexto)}</span>
        ${midia.favorito ? '<span class="foto__coracao"><svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="m12 20.3-1.4-1.3C5.4 14.3 2 11.3 2 7.6A4.6 4.6 0 0 1 6.6 3c1.6 0 3.1.7 4 2 .9-1.3 2.4-2 4-2A4.6 4.6 0 0 1 19.2 7.6c0 3.7-3.4 6.7-8.6 11.4L12 20.3Z"/></svg></span>' : ''}`;
      b.addEventListener('click', () => abrirDetalhe(midia));
      grade.appendChild(b);

      // Carregamento progressivo: cada imagem aparece com um pequeno atraso.
      const img = b.querySelector('img');
      setTimeout(() => {
        img.src = midia.caminho;
        img.addEventListener('load', () => img.classList.add('carregada'), { once:true });
      }, 40 * Math.min(i, 12));
    });

    if (!galeriaJaAberta && estado.kbEconomizados > 0){
      galeriaJaAberta = true;
      avisar('Galeria pronta', `${formatarTamanho(estado.kbEconomizados)} economizados`);
    }
    checarSugestao();
  }, comEsqueleto ? 520 : 0);
}

/** Sugestão automática: nasce de um padrão de uso, como no MER (entidade Sugestão). */
function checarSugestao(){
  const caixa = $('#sugestao');
  if (estado.sugestaoDispensada) { caixa.hidden = true; return; }

  const recentes = estado.midias.filter(f => (Date.now() - new Date(f.dataHora)) < 7*86400000);
  const porContexto = {};
  recentes.forEach(f => porContexto[f.contexto] = (porContexto[f.contexto] || 0) + 1);

  const alvo = Object.entries(porContexto)
    .filter(([ctx,qtd]) => qtd >= 3 && !estado.albuns.some(a => a.contexto === ctx))
    .sort((a,b) => b[1]-a[1])[0];

  if (!alvo){ caixa.hidden = true; return; }

  const [ctx,qtd] = alvo;
  caixa.dataset.contexto = ctx;
  caixa.dataset.qtd = qtd;
  $('#sugestao-texto').innerHTML =
    `Você tirou <strong>${qtd} fotos de ${ctx}</strong> nesta semana. Quer juntar tudo em um álbum?`;
  caixa.hidden = false;
}

function criarAlbum(contexto, qtd, nome){
  const fotos = estado.midias.filter(f => f.contexto === contexto);
  estado.albuns.push({
    id: Date.now(),
    nome: nome || contexto.charAt(0).toUpperCase() + contexto.slice(1) + ' desta semana',
    contexto,
    criadoEm: new Date(),
    capa: fotos[0] ? fotos[0].caminho : '',
    total: qtd
  });
  $('#sugestao').hidden = true;
  avisar('Álbum criado', qtd ? `${qtd} fotos organizadas`
                             : 'as próximas fotos desse tipo entram sozinhas');
  vibrar(12);
}

function montarAlbuns(){
  const alvo = $('#lista-albuns');
  alvo.innerHTML = '';
  albumArmado = null;

  const novoBtn = document.createElement('button');
  novoBtn.className = 'novo-album';
  novoBtn.textContent = '+  Criar novo álbum';
  novoBtn.addEventListener('click', () => abrirNovoAlbum());
  alvo.appendChild(novoBtn);

  if (!estado.albuns.length){
    const vazio = document.createElement('div');
    vazio.className = 'vazio';
    vazio.innerHTML = `<p><strong>Nenhum álbum ainda.</strong></p>
      <p>Um álbum reúne sozinho todas as fotos de um tipo — estudo, trabalho ou social.
      Crie um acima ou espere o Moments sugerir.</p>`;
    alvo.appendChild(vazio);
    return;
  }

  estado.albuns.forEach(a => {
    const fotos = estado.midias.filter(f => f.contexto === a.contexto);
    const capa = fotos[0] ? fotos[0].caminho : a.capa;

    const linha = document.createElement('div');
    linha.className = 'album';

    const abrir = document.createElement('button');
    abrir.className = 'album__principal';
    abrir.innerHTML = `<span class="album__capa" style="background-image:url('${capa}')"></span>
      <span><strong>${limpar(a.nome)}</strong>
      <small>${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'} do tipo ${a.contexto}</small></span>`;
    abrir.addEventListener('click', () => {
      estado.visao = 'fotos';
      estado.filtro = a.contexto;
      montarGaleria();
    });

    const apagar = document.createElement('button');
    apagar.className = 'album__excluir';
    apagar.title = 'Excluir o álbum (as fotos continuam na galeria)';
    apagar.setAttribute('aria-label', 'Excluir o álbum ' + a.nome);
    apagar.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2ZM6 9h12l-1 11a2 2 0 0 1-2 1.8H9A2 2 0 0 1 7 20L6 9Z"/></svg>';
    apagar.addEventListener('click', () => excluirAlbum(a.id, apagar));

    linha.appendChild(abrir);
    linha.appendChild(apagar);
    alvo.appendChild(linha);
  });
}

/* ---------- 8. DETALHE DA FOTO ---------- */

let modalDetalhe, folhaCompartilhar, folhaAlbum;

function abrirDetalhe(midia){
  estado.fotoAberta = midia;
  $('#detalhe-img').src = midia.caminho;
  $('#detalhe-img').alt = midia.titulo;
  $('#detalhe-titulo').textContent = midia.titulo;
  $('#detalhe-data').textContent =
    `${rotuloData(midia.dataHora)} · ${horaCurta(midia.dataHora)} · ${formatarTamanho(midia.kbOtimizado)}`;
  $('#detalhe-palco').classList.remove('zoom');
  $('#btn-zoom').setAttribute('aria-pressed','false');
  atualizarBotaoFavorito();
  resetarExclusao();
  prepararArquivo(midia);        // adianta o arquivo para o compartilhamento
  modalDetalhe.show();
}

function atualizarBotaoFavorito(){
  const fav = estado.fotoAberta && estado.fotoAberta.favorito;
  $('#btn-favorito').setAttribute('aria-pressed', fav ? 'true' : 'false');
  $('#btn-favorito-texto').textContent = fav ? 'Favorita' : 'Favoritar';
}

let exclusaoArmada = false;
let timerExclusao = null;

function resetarExclusao(){
  exclusaoArmada = false;
  clearTimeout(timerExclusao);
  const b = $('#btn-excluir-foto');
  if (b){ b.classList.remove('acao--armada'); $('#btn-excluir-texto').textContent = 'Excluir'; }
}

function pedirExclusao(){
  if (!estado.fotoAberta) return;
  if (exclusaoArmada){ excluirFoto(); return; }

  exclusaoArmada = true;
  $('#btn-excluir-foto').classList.add('acao--armada');
  $('#btn-excluir-texto').textContent = 'Confirmar';
  vibrar(8);
  timerExclusao = setTimeout(resetarExclusao, 3500);
}

function excluirFoto(){
  resetarExclusao();
  const foto = estado.fotoAberta;
  if (!foto) return;
  estado.midias = estado.midias.filter(f => f.id !== foto.id);
  estado.kbEconomizados = Math.max(0, estado.kbEconomizados - (foto.kbOriginal - foto.kbOtimizado));
  estado.fotoAberta = null;
  modalDetalhe.hide();

  const ultima = estado.midias[0];
  $('#miniatura-ultima').style.backgroundImage = ultima ? `url("${ultima.caminho}")` : 'none';

  avisar('Foto excluída', rotuloContexto(foto.contexto));
  vibrar(14);
  montarGaleria();
  atualizarInicio();
}

/* ---------- 8b. ÁLBUNS CRIADOS PELO USUÁRIO ---------- */

let contextoNovoAlbum = 'estudo';

function montarOpcoesAlbum(){
  const alvo = $('#album-contexto');
  alvo.innerHTML = '';

  MODOS.forEach(m => {
    const qtd = estado.midias.filter(f => f.contexto === m.id).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opcao' + (m.id === contextoNovoAlbum ? ' opcao--ativa' : '');
    b.setAttribute('role','radio');
    b.setAttribute('aria-checked', m.id === contextoNovoAlbum);
    b.innerHTML = `<span class="opcao__marca"></span>
      <span class="opcao__texto">
        <strong>Fotos de ${m.id}</strong>
        <small>${m.dica.toLowerCase()}</small>
      </span>
      <span class="opcao__conta"><strong>${qtd}</strong><small>agora</small></span>`;
    b.addEventListener('click', () => {
      contextoNovoAlbum = m.id;
      montarOpcoesAlbum();
      $('#album-nome').placeholder = 'Ex.: ' + rotuloContexto(m.id) + ' desta semana';
    });
    alvo.appendChild(b);
  });
  atualizarResumoAlbum();
}

function atualizarResumoAlbum(){
  const qtd = estado.midias.filter(f => f.contexto === contextoNovoAlbum).length;
  $('#album-resumo').textContent = qtd
    ? `Começa com ${qtd} ${qtd === 1 ? 'foto' : 'fotos'} e recebe sozinho as próximas de ${contextoNovoAlbum}.`
    : `Ainda não há fotos de ${contextoNovoAlbum}. O álbum vai receber as próximas que você capturar.`;
}

function rotuloContexto(id){
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/** Abre a folha já no contexto que tem mais fotos, para não começar num vazio. */
function abrirNovoAlbum(contexto){
  if (contexto){
    contextoNovoAlbum = contexto;
  } else {
    const contagens = MODOS.map(m => [m.id, estado.midias.filter(f => f.contexto === m.id).length])
                           .sort((a,b) => b[1] - a[1]);
    contextoNovoAlbum = contagens[0][1] ? contagens[0][0] : contextoNovoAlbum;
  }
  montarOpcoesAlbum();
  $('#album-nome').value = '';
  $('#album-nome').placeholder = 'Ex.: ' + rotuloContexto(contextoNovoAlbum) + ' desta semana';
  folhaAlbum.show();
}

function confirmarNovoAlbum(){
  const nome = $('#album-nome').value.trim() ||
               rotuloContexto(contextoNovoAlbum) + ' desta semana';
  const total = estado.midias.filter(f => f.contexto === contextoNovoAlbum).length;

  if (estado.albuns.some(a => a.contexto === contextoNovoAlbum)){
    avisar('Já existe um álbum de ' + contextoNovoAlbum, 'escolha outro tipo');
    return;
  }
  folhaAlbum.hide();
  criarAlbum(contextoNovoAlbum, total, nome);
  estado.visao = 'albuns';
  if (estado.telaAtual !== 'tela-galeria') irPara('tela-galeria');
  else montarGaleria();
}

let albumArmado = null;

function excluirAlbum(id, botao){
  if (albumArmado !== id){
    albumArmado = id;
    botao.classList.add('album__excluir--armado');
    avisar('Toque de novo para excluir', 'as fotos continuam na galeria');
    setTimeout(() => {
      if (albumArmado === id){ albumArmado = null; botao.classList.remove('album__excluir--armado'); }
    }, 3500);
    return;
  }
  albumArmado = null;
  const alvo = estado.albuns.find(a => a.id === id);
  estado.albuns = estado.albuns.filter(a => a.id !== id);
  avisar('Álbum excluído', alvo ? alvo.nome : '');
  vibrar(12);
  montarGaleria();
}

/* ---------- 9. COMPARTILHAMENTO ---------- */

/* A web não deixa anexar uma imagem em um link do WhatsApp nem em um
   mailto: só texto viaja pela URL. Para enviar a foto de verdade usamos
   o compartilhamento nativo do aparelho (navigator.share com arquivo).
   Onde ele não existe — a maioria dos computadores — baixamos a imagem
   e abrimos o destino, avisando que basta anexá-la.                    */

let arquivoPronto = null;

function carregarImagem(src){
  return new Promise((ok, erro) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = erro;
    i.src = src;
  });
}

/** Converte a foto em um arquivo JPEG antes de a folha abrir. */
async function prepararArquivo(midia){
  arquivoPronto = null;
  if (!midia) return;
  try {
    const img = await carregarImagem(midia.caminho);
    const c = document.createElement('canvas');
    c.width = 600; c.height = 800;
    c.getContext('2d').drawImage(img, 0, 0, 600, 800);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    if (!blob) return;
    arquivoPronto = new File([blob], nomeArquivo(midia, 'jpg'), { type:'image/jpeg' });
  } catch (e) {
    arquivoPronto = null;   // segue pelo caminho alternativo
  }
}

function nomeArquivo(midia, ext){
  const d = new Date(midia.dataHora);
  const p = (n) => String(n).padStart(2,'0');
  const carimbo = `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  return `jovi-moments-${midia.contexto}-${carimbo}.${ext}`;
}

function abrirLink(url){
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

/* O Safari ignora o atributo download em endereços data:, então
   sempre convertemos a imagem em blob antes de baixar.          */
function uriParaBlob(uri){
  const [cabecalho, corpo] = uri.split(',');
  const tipo = (cabecalho.match(/data:([^;]+)/) || [null,'image/png'])[1];
  if (cabecalho.indexOf('base64') > -1){
    const bin = atob(corpo);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type:tipo });
  }
  return new Blob([decodeURIComponent(corpo)], { type:tipo });
}

function baixarFoto(midia){
  let url, nome;
  try {
    if (arquivoPronto){
      url = URL.createObjectURL(arquivoPronto);
      nome = arquivoPronto.name;
    } else {
      const ext = midia.caminho.indexOf('image/svg') > -1 ? 'svg' : 'jpg';
      url = URL.createObjectURL(uriParaBlob(midia.caminho));
      nome = nomeArquivo(midia, ext);
    }
  } catch (e) {
    url = midia.caminho;
    nome = nomeArquivo(midia, 'jpg');
  }
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  if (url.indexOf('blob:') === 0) setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function textoDaFoto(midia){
  return `Foto tratada no JOVI Moments · ${rotuloData(midia.dataHora)}, ${horaCurta(midia.dataHora)}`;
}

function podeEnviarArquivo(){
  return arquivoPronto && navigator.canShare && navigator.canShare({ files:[arquivoPronto] });
}

function compartilhar(destino, detalhe, botao){
  const midia = estado.fotoAberta;
  if (!midia) return;

  ocupar(botao, true);
  vibrar(12);

  // Caminho 1: compartilhamento nativo do aparelho.
  const enviaNativo = destino === 'WhatsApp' || destino === 'E-mail'
                   || destino === 'Instagram Stories';

  if (enviaNativo && navigator.share){
    const comArquivo = podeEnviarArquivo();
    const dados = comArquivo
      ? { files:[arquivoPronto], text: textoDaFoto(midia) }
      : { title:'JOVI Moments', text: textoDaFoto(midia) };

    navigator.share(dados)
      .then(() => {
        ocupar(botao, false);
        concluirEnvio(midia, destino, comArquivo
          ? 'A foto foi enviada com a imagem anexada.'
          : 'Enviado pelo compartilhamento do aparelho.');
      })
      .catch(() => {
        ocupar(botao, false);   // o usuário cancelou: volta para a lista
      });
    return;
  }

  // Caminho 2: baixa a imagem e abre o destino.
  let recado;
  try {
    if (destino === 'WhatsApp'){
      baixarFoto(midia);
      abrirLink('https://wa.me/?text=' + encodeURIComponent(textoDaFoto(midia)));
      recado = 'A conversa abriu com o texto e a foto foi baixada — é só anexá-la.';
    } else if (destino === 'E-mail'){
      baixarFoto(midia);
      window.location.href =
        'mailto:?subject=' + encodeURIComponent('Foto do JOVI Moments') +
        '&body=' + encodeURIComponent(textoDaFoto(midia) + '\n\nA imagem está anexada.');
      recado = 'O rascunho abriu no seu app de e-mail e a foto foi baixada para anexar.';
    } else if (destino === 'Instagram Stories'){
      baixarFoto(midia);
      recado = 'Imagem baixada no formato do Stories. Abra o Instagram e publique.';
    } else {
      baixarFoto(midia);
      recado = 'A foto está na sua pasta de downloads, sem a marca JOVI.';
    }
  } catch (e) {
    recado = detalhe;
  }

  setTimeout(() => {
    ocupar(botao, false);
    concluirEnvio(midia, destino, recado);
  }, 650);
}

function ocupar(botao, ligado){
  botao.classList.toggle('destino--enviando', ligado);
  $('#folha-opcoes').classList.toggle('esperando', ligado);
}

function concluirEnvio(midia, destino, recado){
  estado.compartilhamentos.push({
    id: Date.now(), idMidia: midia.id, canal: destino,
    dataHora: new Date(), status: 'concluido'
  });
  $('#fim-titulo').textContent =
    destino === 'Arquivo salvo' ? 'Foto salva no aparelho' : 'Enviado para ' + destino;
  $('#fim-texto').textContent = recado;
  $('#folha-opcoes').hidden = true;
  $('#folha-fim').hidden = false;
}

function voltarDestinos(){
  $('#folha-fim').hidden = true;
  $('#folha-opcoes').hidden = false;
}

/* ---------- 10. INÍCIO DO APLICATIVO ---------- */

function atualizarInicio(){
  const total = estado.midias.length;
  $('#inicio-contagem').textContent = total === 1 ? '1 foto' : `${total} fotos`;

  const h = new Date().getHours();
  $('#inicio-saudacao').textContent = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

  const totalOriginal = estado.midias.reduce((s,f) => s + f.kbOriginal, 0) || 1;
  const economia = estado.midias.reduce((s,f) => s + (f.kbOriginal - f.kbOtimizado), 0);
  const pct = Math.round(economia / totalOriginal * 100);
  $('#perf-espaco').textContent = formatarTamanho(economia);
  $('#perf-barra').style.width = pct + '%';
  $('#perf-barra').parentElement.setAttribute('aria-valuenow', pct);
  $('#perf-nota').textContent = total
    ? `${pct}% menor que as originais, sem perda visível de qualidade.`
    : 'Cada foto é otimizada antes de entrar na galeria.';
}

function montarOnboarding(){
  const passo = ONBOARDING[estado.passoOnb];
  $('#onb-titulo').textContent = passo.t;
  $('#onb-desc').textContent = passo.d;
  $('#onb-palco').innerHTML = `<img src="${gerarImagem(passo.ctx, 100 + estado.passoOnb, true)}" alt="">`;

  const pontos = $('#onb-pontos');
  pontos.innerHTML = '';
  ONBOARDING.forEach((_,i) => {
    const i2 = document.createElement('i');
    if (i === estado.passoOnb) i2.className = 'ativo';
    pontos.appendChild(i2);
  });
  $('#btn-onb-avancar').textContent =
    estado.passoOnb === ONBOARDING.length - 1 ? 'Começar a usar' : 'Continuar';
}

function abertura(){
  const barra = $('#abertura-progresso');
  const status = $('#abertura-status');
  const etapas = [
    [25,'Preparando a câmera'],
    [55,'Carregando a galeria'],
    [85,'Aplicando o perfil JOVI'],
    [100,'Tudo pronto']
  ];
  etapas.forEach(([pct,texto], i) => {
    setTimeout(() => { barra.style.width = pct + '%'; status.textContent = texto; }, 260 * (i+1));
  });
  setTimeout(() => { montarOnboarding(); irPara('tela-onboarding'); }, 1500);
}

function ligarEventos(){
  // navegação
  $$('.menu__item').forEach(b => b.addEventListener('click', () => irPara(b.dataset.ir)));
  $('#btn-abrir-camera').addEventListener('click', () => irPara('tela-camera'));
  $('#btn-abrir-galeria').addEventListener('click', () => irPara('tela-galeria'));
  $('#btn-vazio-capturar').addEventListener('click', () => irPara('tela-camera'));
  $('#btn-camera-voltar').addEventListener('click', () => irPara('tela-inicio'));

  // onboarding
  $('#btn-onb-avancar').addEventListener('click', () => {
    if (estado.passoOnb < ONBOARDING.length - 1){ estado.passoOnb++; montarOnboarding(); }
    else irPara('tela-inicio');
  });
  $('#btn-onb-pular').addEventListener('click', () => irPara('tela-inicio'));

  // câmera
  $('#btn-obturador').addEventListener('click', capturar);
  $('#btn-realce').addEventListener('click', (e) => {
    estado.autoRealce = !estado.autoRealce;
    e.currentTarget.setAttribute('aria-pressed', estado.autoRealce);
    atualizarCena();
    avisar(estado.autoRealce ? 'Auto-realce ligado' : 'Auto-realce desligado',
           estado.autoRealce ? 'cor e contraste tratados' : 'a foto sai como veio');
  });
  $('#btn-grade').addEventListener('click', (e) => {
    estado.grade = !estado.grade;
    $('#visor-grade').hidden = !estado.grade;
    e.currentTarget.setAttribute('aria-pressed', estado.grade);
  });
  $('#btn-virar').addEventListener('click', () => {
    frontal = !frontal;
    desligarCamera(); ligarCamera();
    avisar(frontal ? 'Câmera frontal' : 'Câmera traseira');
  });
  // toque no visor = foco manual
  $('#visor').addEventListener('click', (e) => {
    const foco = $('#visor-foco');
    const r = e.currentTarget.getBoundingClientRect();
    foco.style.left = (e.clientX - r.left) + 'px';
    foco.style.top  = (e.clientY - r.top) + 'px';
    foco.classList.remove('mostra');
    void foco.offsetWidth;               // reinicia a animação
    foco.classList.add('mostra');
  });

  // preview
  $('#comparador-range').addEventListener('input', (e) => moverComparador(e.target.value));
  $('#btn-salvar').addEventListener('click', salvarFoto);
  $('#btn-salvar-grande').addEventListener('click', salvarFoto);
  $('#btn-descartar').addEventListener('click', () => {
    estado.pendente = null;
    avisar('Foto descartada');
    irPara('tela-camera');
  });
  $('#btn-preview-voltar').addEventListener('click', () => { estado.pendente = null; irPara('tela-camera'); });

  // galeria
  $('#aba-fotos').addEventListener('click', () => {
    estado.visao = 'fotos';
    montarGaleria();
  });
  $('#aba-albuns').addEventListener('click', () => {
    estado.visao = 'albuns';
    montarGaleria();
  });
  $('#btn-resumo-album').addEventListener('click', () => abrirNovoAlbum(estado.filtro));
  $('#btn-sugestao-aceitar').addEventListener('click', () => {
    const c = $('#sugestao');
    criarAlbum(c.dataset.contexto, Number(c.dataset.qtd));
    montarGaleria();
  });
  $('#btn-sugestao-dispensar').addEventListener('click', () => {
    estado.sugestaoDispensada = true;
    $('#sugestao').hidden = true;
  });

  // detalhe
  $('#btn-zoom').addEventListener('click', (e) => {
    const palco = $('#detalhe-palco');
    palco.classList.toggle('zoom');
    e.currentTarget.setAttribute('aria-pressed', palco.classList.contains('zoom'));
  });
  $('#btn-favorito').addEventListener('click', () => {
    if (!estado.fotoAberta) return;
    estado.fotoAberta.favorito = !estado.fotoAberta.favorito;
    atualizarBotaoFavorito();
    avisar(estado.fotoAberta.favorito ? 'Adicionada às favoritas' : 'Removida das favoritas');
    montarGaleria();
  });
  $('#btn-album').addEventListener('click', () => {
    if (!estado.fotoAberta) return;
    const ctx = estado.fotoAberta.contexto;
    const existente = estado.albuns.find(a => a.contexto === ctx);
    if (existente){ avisar('Já está no álbum', existente.nome); return; }
    // Fecha o detalhe antes: o modal do Bootstrap prende o foco e
    // impediria a digitação no campo de nome do álbum.
    modalDetalhe.hide();
    setTimeout(() => abrirNovoAlbum(ctx), 320);
  });
  $('#btn-excluir-foto').addEventListener('click', pedirExclusao);
  $('#modal-detalhe').addEventListener('hidden.bs.modal', resetarExclusao);
  $('#btn-criar-album').addEventListener('click', confirmarNovoAlbum);
  $('#album-nome').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmarNovoAlbum();
  });
  $('#btn-compartilhar').addEventListener('click', () => {
    $('#folha-img').src = estado.fotoAberta ? estado.fotoAberta.caminho : '';
    folhaCompartilhar.show();
  });
  $$('.destino').forEach(b => b.addEventListener('click',
    () => compartilhar(b.dataset.destino, b.dataset.detalhe, b)));

  $('#btn-fim-voltar').addEventListener('click', voltarDestinos);
  $('#btn-fim-concluir').addEventListener('click', () => folhaCompartilhar.hide());
  // a folha sempre reabre na lista de destinos
  $('#folha-compartilhar').addEventListener('hidden.bs.offcanvas', voltarDestinos);

  // barra de espaço dispara o obturador quando a câmera está aberta
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && estado.telaAtual === 'tela-camera'){
      e.preventDefault(); capturar();
    }
  });
}

function iniciar(){
  modalDetalhe = new bootstrap.Modal('#modal-detalhe');
  folhaCompartilhar = new bootstrap.Offcanvas('#folha-compartilhar');
  folhaAlbum = new bootstrap.Offcanvas('#folha-album');

  montarChipsModo();
  montarOpcoesAlbum();
  trocarModo(estado.modo);
  ligarEventos();
  atualizarInicio();
  abertura();
}

document.addEventListener('DOMContentLoaded', iniciar);

})();
