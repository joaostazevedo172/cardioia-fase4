# Ir Além 2 — Integração com aplicativo mobile

**CardioIA — Fase 4 — Grupo Purkinje — FIAP 2TIAOR-2026**

App em React Native que fotografa ou carrega a imagem de um ECG, envia a um backend Flask que
serve a CNN treinada na Parte 2, e exibe a classe detectada com as probabilidades de cada
condição.

## O que o enunciado pede e onde está

| Entregável | Onde |
|---|---|
| Interface simples com upload de imagem e exibição do resultado | `app/App.js` |
| Backend em Flask ou Node.js integrado ao modelo | `backend/app.py` |
| Repositório GitHub com o app | esta pasta |
| Vídeo de até 3 minutos mostrando a interação | roteiro em `docs/ROTEIRO_VIDEO.md` |
| Relatório de integração (não exigido, escrito mesmo assim) | [`docs/RELATORIO_IR_ALEM_2.md`](docs/RELATORIO_IR_ALEM_2.md) |

## Rodar

### 1. Backend

Copie para `backend/modelo/` os dois arquivos que o notebook principal gera
(`cardioia_ecg_modelo.keras` e `cardioia_ecg_config.json`), e então:

```bash
cd backend
pip install -r requirements.txt
python app.py
```

O servidor sobe em `0.0.0.0:5000` — `0.0.0.0`, e não `127.0.0.1`, porque o celular precisa
alcançá-lo pela rede local.

Confira com:

```bash
curl http://localhost:5000/saude
```

A resposta distingue três estados: servidor fora do ar, servidor no ar sem o modelo na pasta, e
servidor pronto. Essa distinção existe porque "o app não funciona" quase sempre é a segunda
situação, e sem ela o diagnóstico vira adivinhação.

### 2. App

```bash
cd app
npm install
npx expo start
```

**Antes de rodar, edite `app/src/api.js`:** troque o `BASE_URL` pelo IP da sua máquina na rede
local (`ipconfig` no Windows, `ifconfig | grep inet` no macOS e Linux). No celular, `localhost`
é o próprio telefone — esse é o erro número um da demonstração.

Leia o QR code com o Expo Go. O celular e o computador precisam estar na mesma rede.

## A API

```
GET  /saude                      estado do serviço e do modelo
POST /api/v1/classificar         multipart com o campo 'imagem'
```

Resposta da classificação:

```json
{
  "classe": "IAM",
  "rotulo": "Infarto agudo do miocárdio",
  "confianca": 0.9134,
  "gravidade": "critico",
  "orientacao": "Padrão compatível com infarto agudo...",
  "revisao_humana": false,
  "probabilidades": [ { "classe": "IAM", "rotulo": "...", "valor": 0.9134 }, "..." ],
  "tempo_ms": 180,
  "aviso": "Protótipo acadêmico (FIAP — CardioIA). Não substitui avaliação médica."
}
```

As probabilidades vêm **ordenadas da maior para a menor**, para o app desenhar as barras sem
reordenar nada.

## A decisão que mais importa neste código

O pré-processamento do backend é byte a byte o mesmo do notebook: cinza, recorte de 10 % do
topo, 224×224, replicado em três canais. E os parâmetros não estão repetidos à mão — são lidos
do `cardioia_ecg_config.json` que o notebook salva junto com o modelo.

A razão é que **uma divergência aqui não gera erro**. O modelo aceitaria a imagem, devolveria
uma probabilidade e erraria mais, silenciosamente. Um bug que não levanta exceção num sistema
de apoio ao diagnóstico é pior que uma falha ruidosa, porque ninguém vai procurá-lo.

Pelo mesmo motivo a normalização **não** acontece no backend: ela é uma camada dentro do
próprio modelo salvo (`Rescaling` na CNN, `Normalization` na ResNet50). O servidor envia pixels
de 0 a 255, exatamente como no treino.

## Testes realizados

O backend foi exercitado com um modelo de mesma assinatura do real (entrada 224×224×3, softmax
de 4 classes), verificando quatro comportamentos:

| Situação | Resposta esperada | Resultado |
|---|---|---|
| `/saude` com modelo na pasta, ainda não carregado | `modelo_disponivel: true`, `modelo_carregado: false` | ✓ |
| `/saude` sem o `.keras` na pasta | `modelo_disponivel: false` | ✓ |
| Classificar sem modelo | HTTP 503 com instrução de onde copiar o arquivo | ✓ |
| Classificar com modelo | probabilidades somando 1,0 e sinalização de revisão humana | ✓ |
| Requisição sem o campo `imagem` | HTTP 400 | ✓ |
| Arquivo que não é imagem | HTTP 400 com mensagem clara | ✓ |

## Estrutura

```
ir-alem-2/
├── backend/
│   ├── app.py                    API Flask
│   ├── requirements.txt
│   └── modelo/                   o .keras vai aqui (não versionado)
├── app/
│   ├── App.js                    tela única: upload, análise, resultado
│   ├── app.json                  permissões de câmera e galeria
│   ├── package.json
│   └── src/
│       ├── api.js                comunicação com o backend
│       └── tema.js               paleta herdada das fases anteriores
└── docs/
    ├── RELATORIO_IR_ALEM_2.md
    └── ROTEIRO_VIDEO.md
```
