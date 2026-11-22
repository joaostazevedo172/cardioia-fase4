# Ir Além 2 — Integração com aplicativo mobile

**Projeto:** CardioIA — Fase 4 — Coração em Imagens
**Grupo:** Purkinje — FIAP — Turma 2TIAOR-2026
**Integrantes:** Miriã Leal Mantovani (RM567811) · João Pedro Santos Azevedo (RM566701)

> O enunciado não pede relatório para este Ir Além — pede repositório e vídeo. Escrevemos
> assim mesmo, porque as decisões de integração não cabem num vídeo de três minutos.

---

## 1. O que foi construído

Um aplicativo em **React Native (Expo)** que fotografa ou carrega a imagem de um
eletrocardiograma e exibe a condição detectada pela CNN treinada na Parte 2, acompanhada das
probabilidades de cada uma das quatro classes.

O modelo não roda no celular. Um **backend em Flask** carrega o arquivo `.keras` salvo pelo
notebook e responde por HTTP. O celular cuida da interface; o servidor, da inferência.

## 2. Por que o modelo não roda no dispositivo

A alternativa seria converter para TensorFlow Lite e embarcar. Não fizemos, por três razões.

A ResNet50 ocupa cerca de 100 MB; mesmo quantizada, é um peso considerável para um protótipo
acadêmico. Converter introduz uma segunda implementação do pré-processamento, em Java ou
Swift, que precisaria ficar sincronizada com a do Python para sempre. E o modelo passaria a
estar embutido em cada instalação, de modo que corrigir um viés detectado pelo Ir Além 1
exigiria uma nova versão na loja, em vez de um `restart` no servidor.

Em contrapartida, a arquitetura cliente-servidor exige conectividade. Num cenário real de
telemedicina rural isso seria uma limitação séria, e a escolha mereceria ser revista.

## 3. Arquitetura

```
  CELULAR (React Native / Expo)          SERVIDOR (Flask)
  ─────────────────────────────          ────────────────
  câmera ou galeria
        │
        ├── POST multipart ──────────►   /api/v1/classificar
        │                                      │
        │                                 pré-processamento
        │                                 (cinza, recorte, 224px)
        │                                      │
        │                                 modelo .keras
        │                                      │
        ◄──────── JSON ────────────────   probabilidades
        │
  faixa de gravidade
  barras por classe
  aviso de revisão humana
```

## 4. A decisão que mais importa neste código

O pré-processamento do backend é byte a byte o mesmo do notebook: conversão para tons de
cinza, recorte de 10 % do topo, redimensionamento para 224 × 224 com LANCZOS e replicação em
três canais. E os parâmetros **não estão repetidos à mão** — são lidos do
`cardioia_ecg_config.json` que o notebook salva junto com o modelo.

A razão de tanto cuidado é que uma divergência ali **não geraria erro nenhum**. O modelo
aceitaria a imagem, devolveria uma probabilidade plausível e erraria mais, silenciosamente.
Num sistema de apoio ao diagnóstico, um bug que não levanta exceção é pior que uma falha
ruidosa, porque ninguém vai procurá-lo — todos os sinais indicam que está funcionando.

Pelo mesmo motivo a normalização **não** acontece no backend. Ela é uma camada dentro do grafo
salvo (`Rescaling` na CNN, `Normalization` na ResNet50). O servidor envia pixels de 0 a 255,
exatamente como no treino. Se a normalização fosse externa, existiriam três cópias dela — no
notebook, no protótipo Gradio e no Flask — e bastaria uma divergir para o sistema degradar sem
avisar.

## 5. A API

```
GET  /saude                   estado do serviço e do modelo
POST /api/v1/classificar      multipart, campo 'imagem'
```

O `/saude` distingue três estados: servidor fora do ar, servidor no ar **sem o modelo na
pasta**, e servidor pronto. Essa distinção não é decorativa: "o app não funciona" é quase
sempre o estado do meio, e sem separá-lo o diagnóstico vira adivinhação na hora da
demonstração. O app mostra uma mensagem diferente para cada caso.

O modelo é carregado na primeira classificação, não na subida do processo. Importar o
TensorFlow leva alguns segundos, e o `/saude` precisa responder de imediato.

A resposta da classificação traz as probabilidades **já ordenadas da maior para a menor**, para
o app desenhar as barras sem reordenar nada, e três campos que não são o resultado em si:
`gravidade`, que dirige a cor da faixa; `revisao_humana`, verdadeiro abaixo de 60 % de
confiança; e `aviso`, o texto que declara que aquilo é um protótipo acadêmico.

## 6. O que a interface mostra, e por quê

**As quatro probabilidades, não só a vencedora.** Um diagnóstico assistido que esconde a
incerteza é pior que nenhum: induz confiança que o modelo não sustenta. Se o sistema está
dividido entre infarto e batimento anormal, quem decide precisa ver isso.

**A faixa colorida por gravidade.** Verde, âmbar e vermelho. É reconhecimento imediato, antes
da leitura.

**O aviso de revisão humana.** Abaixo do limiar, o app interrompe a leitura com um bloco âmbar.
O limiar está no backend, documentado, e o Ir Além 1 mede — via Erro de Calibração Esperado —
se a confiança declarada pelo modelo é honesta o bastante para esse número significar algo. Um
limiar sobre um modelo mal calibrado é uma salvaguarda que existe no papel e não funciona.

**O rodapé em toda resposta.** "Protótipo acadêmico. Não substitui avaliação médica." Não é
formalidade jurídica: é a definição do que o sistema não se propõe a fazer, no lugar onde a
pessoa está olhando.

## 7. Verificação

O backend foi exercitado com um modelo de brinquedo de mesma assinatura do real — entrada
224 × 224 × 3, normalização interna, softmax de quatro classes. Seis cenários, incluindo as
falhas:

| Situação | Esperado | Resultado |
|---|---|---|
| `/saude` com modelo presente, não carregado | `modelo_disponivel: true`, `modelo_carregado: false` | ✓ |
| `/saude` sem o `.keras` na pasta | `modelo_disponivel: false` | ✓ |
| Classificar sem modelo | HTTP 503 com instrução de onde copiar o arquivo | ✓ |
| Classificar normalmente | probabilidades somando 1,000; revisão humana sinalizada | ✓ |
| POST sem o campo `imagem` | HTTP 400 | ✓ |
| Arquivo que não é imagem | HTTP 400 com mensagem clara | ✓ |

Testar com modelo de brinquedo verifica o **contrato** entre servidor e modelo — formato de
entrada, formato de saída, caminhos de erro — sem depender do treino. A acurácia é assunto do
notebook; aqui o que se verifica é a integração.

Os três arquivos JavaScript foram validados com o parser do Babel configurado para JSX.

## 8. Limitações

- **Exige conectividade.** O celular e o servidor precisam estar na mesma rede, ou o servidor
  precisa estar exposto publicamente.
- **`BASE_URL` é manual.** O app não descobre o servidor sozinho; o IP é editado em
  `app/src/api.js`. Num produto real haveria descoberta por mDNS ou um endpoint fixo.
- **Sem autenticação.** Qualquer cliente na rede pode chamar a API. Um sistema que trafega
  exame de paciente precisaria de TLS, autenticação e registro de acesso — exigências que a
  LGPD impõe a dados pessoais sensíveis, e que um protótipo acadêmico em rede local não cumpre.
- **Servidor de desenvolvimento.** O `app.run` do Flask não é para produção; o caminho seria
  Gunicorn atrás de um proxy reverso.
- **Uma imagem por vez.** Não há fila nem lote.

---

*Documento sob licença CC BY 4.0 — Grupo Purkinje, FIAP 2026.*
