# JOVI Moments — Sprint 2

Front-end da aplicação web do Challenge FIAP + JOVI.
Solução 100% web, mobile first, executada no navegador do celular — sem instalação.

## Equipe — 1TDS

| Aluno | RM |
|---|---|
| Arthur Ribeiro Lucena Silva | 571272 |
| Douglas Fabiano | 570248 |
| Gabriel Ferraz do Santos Ferreira | 572412 |

## Como executar

1. Descompacte a pasta.
2. Abra `index.html` no navegador (duplo clique já funciona).
3. Para testar a câmera real do dispositivo, sirva a pasta por HTTP — por exemplo:
   `python -m http.server 8000` e acesse `http://localhost:8000`.
   Sem HTTPS/localhost o navegador bloqueia a câmera e a aplicação usa
   automaticamente a **captura simulada**, sem quebrar a jornada.

No computador, a interface aparece dentro de um aparelho para evidenciar o
mobile first. No celular, ocupa a tela inteira.

## Tecnologias

Apenas o escopo permitido pelo enunciado:

- **HTML5** — estrutura semântica das telas
- **CSS3** — identidade visual JOVI, animações e microinterações
- **JavaScript (ES6, sem bibliotecas)** — toda a jornada dinâmica
- **Bootstrap 5.3** — grid, botões, `modal`, `offcanvas`, `progress`.
  Os arquivos estão em `vendor/bootstrap/`, dentro do projeto: nada é carregado
  da internet, então a aplicação funciona offline.

## Estrutura

```
jovi-moments/
├── index.html          telas da aplicação
├── css/estilo.css      identidade visual e animações
├── js/app.js           estado, navegação e regras da jornada
├── vendor/bootstrap/   Bootstrap 5.3 (CSS e JS) incluído no pacote
└── README.md
```

## Jornada implementada

1. **Abertura** — carregamento progressivo com status a cada etapa
2. **Boas-vindas** — 3 passos explicando tratamento, modos e organização
3. **Início** — captura em um toque, atalho da galeria e painel de desempenho
4. **Câmera** — vídeo real com fallback simulado, modos estudo/trabalho/social,
   auto-realce, grade de composição, foco por toque, flash e obturador animado
5. **Preview** — comparador arrastável com as duas imagens reais: a original e a
   tratada. Com o auto-realce desligado, o comparador avisa que não há tratamento
   a comparar, em vez de simular uma diferença
6. **Galeria** — duas abas visíveis (Fotos e Álbuns), começa vazia,
   *skeleton screens*, carregamento progressivo, agrupamento por data e
   filtros por tipo de foto com contagem
7. **Álbuns** — ao filtrar por um tipo, uma linha de resumo explica a seleção e
   oferece transformá-la em álbum; também é possível criar pelo botão "Criar novo
   álbum" ou aceitar a sugestão automática. Excluir o álbum não apaga as fotos
8. **Detalhe** — tela cheia, zoom, favoritar, adicionar ao álbum e excluir a foto
9. **Compartilhamento** — a foto é convertida em arquivo JPEG e enviada pelo
   compartilhamento nativo do aparelho (`navigator.share` com anexo). Onde ele
   não existe, a imagem é baixada e o destino abre em seguida. Cada envio mostra
   o andamento, uma confirmação e permite cancelar a qualquer momento

## Como o código atende ao desafio

| Pedido do desafio | Onde está |
|---|---|
| 100% web, sem aplicativo | `index.html` — roda direto no navegador |
| Mobile first | CSS escrito primeiro para telas pequenas; desktop é a exceção |
| Simulação de captura | `capturar()` em `js/app.js` |
| Galeria inteligente | `montarGaleria()` — data, contexto e favoritas |
| Sugestões automáticas | `checarSugestao()` e `criarAlbum()` |
| Interação com conteúdo | favoritar, excluir, criar e apagar álbuns, compartilhar |
| Percepção de velocidade | esqueletos, carregamento escalonado, avisos de otimização |

## Relação com o modelo de dados (MER da Sprint 1)

| Entidade | Representação no código |
|---|---|
| Usuário | `estado` (preferências: modo, auto-realce, grade) |
| Mídia | `novaMidia()` — id, tipo, contexto, data, caminho, favorito |
| Álbum | `estado.albuns`, com `criarAlbum()` e `excluirAlbum()` |
| Álbum_Mídia | vínculo por `contexto` entre álbum e mídias |
| Compartilhamento | `compartilhar()` grava em `estado.compartilhamentos` (canal, data, status) |
| Sugestão | `checarSugestao()` — tipo, status e data |

## Acessibilidade e cuidados

- Foco visível no teclado e foco movido para a tela ativa a cada navegação
- Rótulos `aria` nos botões de ícone e região de avisos com `aria-live`
- `prefers-reduced-motion` respeitado
- Texto digitado pelo usuário (nome do álbum) é escapado antes de ir para a tela
- Excluir foto ou álbum pede um segundo toque de confirmação
- A câmera é desligada ao sair da tela, inclusive se a permissão chegar atrasada
