# Imagem + DX — pesquisa e plano

Data: 2026-07-12
Raw completo (claims, votos, fontes): `2026-07-12-image-dx-research-raw.json`
Pesquisa: 105 agentes, 23 fontes, 107 claims extraídos, 25 verificados adversarialmente (19 confirmados, 6 refutados).

Pesquisa anterior (texto/áudio, algoritmos já implementados): `2026-06-11-compression-research-and-plan.md`

## Achados verificados — IMAGEM

1. **Biblioteca: `sharp` (libvips), in-process no worker Bun.** Suporte oficial a Bun (Node-API v9),
   binários pré-compilados com libvips embutido — sem sidecar, sem toolchain, sem Python. 4–5x mais
   rápido que ImageMagick (em pipelines com resize). Licenças: sharp Apache-2.0, libvips LGPL-3.0 —
   uso dinâmico em SaaS hospedado não gera obrigação de abrir código.
2. **Formatos de saída: WebP + AVIF + JPEG/PNG otimizados. JPEG XL fica de fora.** WebP (~97%) e AVIF
   (~94%) são os únicos com suporte default em todos os browsers; JXL segue atrás de flag fora do
   Safari — e o sharp pré-compilado **não encoda JXL** de qualquer forma.
3. **AVIF é a maior alavanca de economia (~50–56% vs JPEG) e o maior custo de CPU.** O `effort`/speed
   precisa ser fixado explicitamente. **AVIF opt-in / assíncrono; WebP como default.**
4. **NÃO usar o `Bun.Image` nativo.** No Linux (nosso alvo de produção) ele não encoda AVIF, e não tem
   crop/composite/sharpen/ICC.
5. **Pular auto-tuning por métrica perceptual (SSIMULACRA2/butteraugli) no MVP.** Presets de qualidade
   fixos; usar SSIMULACRA2 **offline**, uma vez, para calibrar esses presets.

## Achados verificados — DX / MONETIZAÇÃO

6. **Desenho de API: copiar o Tinify.** Uma chamada síncrona — POST dos bytes (ou `{"source":{"url":...}}`)
   → `201 Created` + `Location` do resultado. Sem SDK obrigatório, sem webhook, sem polling para a
   operação principal. Pós-processamento (resize, convert, store no S3) é POST no output URL.
7. **Cobrança: compress, resize/crop e convert são todos billable, como créditos fungíveis.** Preservar
   metadados é grátis. Free tier ~500 ops/mês. Os diferenciais pagos de verdade: **smart-crop** e
   resize com preservação de qualidade — não o re-encode puro.

## Buracos honestos (nada verificado)

- **Trilha 2 (texto/LLMLingua-2): ZERO claims.** Não sabemos se `onnxruntime-node` carrega sob Bun, nem
  a latência real por 1K tokens em CPU, nem a licença. **A pergunta central do texto segue sem resposta.**
- **Trilha 3 (gaps de áudio): ZERO claims.** RNNoise/DeepFilterNet, loudnorm de duas passadas,
  remoção de filler-words — sem evidência.
- **Preços de Cloudinary/imgix/Kraken:** não verificados. Só temos o modelo do Tinify.

## Números para NÃO citar como promessa

- `~56%` de economia do AVIF é **uma imagem escolhida pelo vendor**, qualidade não declarada.
- `3100x` no encode do AVIF é **pior caso** (preset mais lento do libaom), não o custo do sharp em
  effort 4–6.
- `4–5x` do sharp é self-benchmark **com resize**; para re-compressão pura o tempo é dominado pelo codec.
- **Não temos NENHUMA medição de AVIF no nosso hardware.** Preço, fila e "AVIF pode ser síncrono?"
  dependem desse número.

## Armadilhas de deploy (verificadas)

- `sharp` sob Bun **quebra com `bun build --compile`** (o `.node` da plataforma não é embutido) — usar `bun run`.
- **Alpine/musl + Bun é a falha de instalação mais comum** — preferir base glibc (debian-slim).
- Garantir que `optionalDependencies` resolvam, senão um lockfile gerado no macOS não baixa
  `@img/sharp-linux-{x64,arm64}` no CI/Docker.

## Plano proposto (a decidir)

| Fase | O quê | Esforço |
|---|---|---|
| 1 | **Medir AVIF no nosso worker** (effort 4/6/8 × quality 45/55/65, em foto 12MP / screenshot 4K / produto 1500px): wall-clock e pico de RSS. Sem isso não dá para precificar nem decidir sync vs async. | Baixo — 1 script |
| 2 | **Pipeline de imagem MVP**: módulo `image` + fila + processor com `sharp`. Ops: `resize`, `encode` (webp default / avif opt-in / jpeg / png), `strip-metadata`. Presets calibrados. | Médio — espelha o padrão de áudio |
| 3 | **Rodada de pesquisa nova** só para Trilhas 2 e 3 (LLMLingua-2 sob Bun; gaps de áudio) | Baixo |
| 4 | Smart-crop (`sharp` tem `attention`/`entropy`) — diferencial pago, custo de build desconhecido | ⬜ investigar |
| 5 | Presets por tipo de conteúdo (foto vs screenshot com texto vs produto em fundo branco) — texto/flat-color sofre em preset fotográfico | ⬜ investigar |

## Decisão embutida no MVP de imagem

Repetir o padrão que já funciona no áudio: **default barato e universal (WebP), tier premium opt-in
caro (AVIF)** — igual a Opus default / MP3 opt-in. E manter o custo de crédito proporcional ao tamanho,
como o resto do sistema.
