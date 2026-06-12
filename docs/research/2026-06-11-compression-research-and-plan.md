# Compressão de texto e áudio — pesquisa + plano de implementação

Data: 2026-06-11
Raw completo (claims, votos, fontes): `docs/research/2026-06-11-deep-research-raw.json`
Pesquisa: 106 agentes, 24 fontes, 120 claims extraídos, 25 verificados adversarialmente (23 confirmados, 2 refutados).

## Achados verificados — TEXTO

1. **Compressão lossy agressiva pode AUMENTAR o custo total** (nosso `minify`/`shorten`):
   em compressão pesada, outputs do LLM ficaram até 38x–56x mais longos, e output
   token custa ~3x o input. Remover instruções/artigos do prompt é inseguro.
2. **LLMLingua-2 é a técnica real de compressão de prompt sem LLM no loop**:
   2x–5x de redução com encoder pequeno (mBERT 110M para CPU / XLM-RoBERTa 355M),
   única variante com taxa de compressão previsível (pré-requisito para SLA/pricing).
   É o grande diferencial a adicionar depois (precisa de dep nova: ONNX + modelo).
3. **Vender como economia de custo, não latência**: atrás de APIs comerciais
   (GPT-4o mini etc.) compressão não dá speedup confiável.
4. **Qualidade é dependente de tarefa**: sumarização aguenta 5.7x; classificação
   few-shot perde até 52%. API genérica precisa de presets/avisos por uso.
5. **TOON: só para payloads tabulares grandes**: dois benchmarks independentes
   mostram perda de acurácia em geração e "prompt tax" em payloads pequenos.
   Gate por tamanho é obrigatório.
6. Português: LLMLingua-2 degrada em não-inglês (~75% retenção em chinês);
   validar PT antes de prometer.

## Achados verificados — ÁUDIO

1. **Opus > MP3, decisivo (9-0)**: MP3 precisa de ~40% mais bitrate e ainda perde
   em testes cegos (HydrogenAudio, IETF). MP3 vira opt-in de compatibilidade.
2. **Ladder de bitrate para voz, Opus mono (12-0)**:
   - 32 kbps = teto quase transparente ("high")
   - 24 kbps = default podcast/audiobook (recomendação dos autores do Opus)
   - 16 kbps = "economy"
   - 12 kbps = piso VoIP ("max compression")
   - ffmpeg: `-c:a libopus -ac 1 -b:a 24k -vbr on`
3. **VBR sempre** (CBR custa ~8% a mais para a mesma qualidade).
4. NÃO afirmar tiers exatos de kHz por bitrate (claim refutado 0-3).
5. Lacunas da pesquisa (nada sobreviveu à verificação): parâmetros ideais de
   silenceremove/VAD, alvos LUFS de podcast, defaults de acompressor, o que
   Auphonic/Descript fazem. Manter loudnorm/silence-trim atuais é decisão por
   omissão de evidência contrária, não endosso.

## Plano manter / cortar / adicionar

| Ação | Item | Status |
|---|---|---|
| CORTAR | `shorten` (dicionário bc/b4/ppl) — risco de custo, ganho nulo | ✅ feito |
| CORTAR | `minify` (remove artigos/stopwords) — mesmo motivo | ✅ feito |
| MANTER | `trim` (limpeza lossless) | ✅ |
| REESCREVER | `json-to-toon`: parsing balanceado (regex não pegava nested), formato tabular real, literais padrão (true/false/null), gate ≥120 chars + só converte se reduzir | ✅ feito |
| AJUSTAR | Presets de texto recompostos (nomes chill/medium/aggressive mantidos) | ✅ feito |
| ADICIONAR | Operação `encode` de áudio: Opus mono VBR default (24k), tiers 32/24/16/12k, mp3 opt-in | ✅ feito |
| AJUSTAR | Pipeline de áudio: intermediários em WAV (antes cada step re-encodava MP3 = perda em cascata) | ✅ feito |
| AJUSTAR | `trim-silence`: manter ~200ms de gap (`stop_silence=0.2`) para não picotar | ✅ feito |
| AJUSTAR | Output dinâmico no processor: `.ogg`/`audio/ogg` para opus, `.mp3` para mp3 | ✅ feito |
| AJUSTAR | Presets de áudio com encode explícito (chill 32k, medium/podcast 24k, lecture 16k, aggressive 12k) | ✅ feito |
| AJUSTAR | Copy do dashboard que mencionava shorten/minify/stopwords (QuickActions, Features, Hero, home) | ✅ feito |
| ADICIONAR (próxima rodada) | LLMLingua-2 via ONNX (mBERT 110M em CPU) como endpoint de compressão de prompt — o diferencial real do produto. Precisa: aprovação de dependência nova, teste de viabilidade no worker Bun, validação em PT | ⬜ |

## Estado da implementação

Tudo do plano (exceto LLMLingua-2, próxima rodada) está implementado e verificado:
typecheck limpo nos dois workspaces e 11 testes unitários do TOON passando
(`api/src/utils/toon.test.ts` — tabular, nested, quoting, gate de tamanho).

Validação pendente que exige ambiente: rodar um job de áudio real de ponta a
ponta e conferir o .ogg gerado (precisa de ffmpeg com libopus no worker —
`ffmpeg -encoders | grep libopus` para confirmar o binário).
