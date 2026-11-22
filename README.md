# CardioIA — Fase 4
## Coração em Imagens — Diagnóstico com Visão Computacional

### Grupo Purkinje

---

## 👨‍🎓 Integrantes

| Integrante | RM | Turma |
|---|---|---|
| Miriã Leal Mantovani | RM567811 | 2TIAOR-2026 |
| João Pedro Santos Azevedo | RM566701 | 2TIAOR-2026 |

## 👩‍🏫 Professores

### Tutor
Leonardo Ruiz Orabona

### Coordenador
André Godoi Chiovato

---

## 📜 Sumário

- [1. Sobre o projeto](#1-sobre-o-projeto)
- [2. O que foi construído](#2-o-que-foi-construído)
- [3. Como rodar](#3-como-rodar)
- [4. Decisões técnicas que valem explicação](#4-decisões-técnicas-que-valem-explicação)
- [5. Resultados](#5-resultados)
- [6. Estrutura de pastas](#6-estrutura-de-pastas)
- [7. Ir Além](#7-ir-além)
- [8. Limitações reconhecidas](#8-limitações-reconhecidas)
- [9. Histórico de versões](#9-histórico-de-versões)
- [10. Licença](#10-licença)
- [11. Agradecimentos](#11-agradecimentos)

---

## 1. Sobre o projeto

Protótipo de **Assistente Cardiológico Virtual** que recebe a imagem de um eletrocardiograma de
12 derivações e classifica o traçado em quatro condições: normal, batimento anormal, histórico
de infarto e infarto agudo do miocárdio.

A fase fecha um arco do CardioIA. A Fase 1 construiu a base de pacientes, a Fase 2 classificou
risco a partir de texto, a Fase 3 monitorou sinais vitais em tempo real num wearable. A Fase 4
lê o exame — a mesma pergunta clínica, agora a partir da imagem.

### Dataset escolhido

**ECG Images of Cardiac Patients** — cerca de 930 imagens, quatro classes.

O enunciado sugere o NIH Chest X-ray. Optamos pelo ECG porque é o exame cardiológico de fato,
enquanto no NIH a única condição cardíaca disponível é a cardiomegalia, minoritária dentro de
um conjunto voltado a patologias torácicas em geral. As 930 imagens também treinam em minutos
no Colab, contra 112 mil do NIH.

**O custo dessa escolha:** o dataset não traz idade nem sexo. O [Ir Além 1](ir-alem-1/) trata
essa limitação de frente e adota outro eixo de análise de fairness.

## 2. O que foi construído

### 2.1 O que o enunciado pede e onde está

| Entregável exigido | Onde está |
|---|---|
| Notebook com o pré-processamento | [`notebooks/CardioIA_Fase4_ECG_CNN.ipynb`](notebooks/) — seções 1.1 a 1.5 |
| Relatório da Parte 1 (1 a 2 páginas) | [`docs/RELATORIO_PARTE1_PREPROCESSAMENTO.md`](docs/RELATORIO_PARTE1_PREPROCESSAMENTO.md) |
| Notebook com a CNN e os resultados | mesmo notebook — seções 2.1 a 2.3 |
| CNN treinada do zero | seção 2.1 |
| Transfer Learning com modelo pré-treinado | seção 2.2 — ResNet50 em duas etapas |
| Métricas: acurácia, matriz de confusão, precisão, recall, F1 | função `evaluate`, aplicada em validação e teste |
| Prints das métricas de avaliação | `outputs/` após a execução |
| Protótipo de apresentação dos resultados | seção 2.4 — interface Gradio com link público |
| Documentação | este README e os dois relatórios |
| Trabalho em grupo (ponto extra) | dupla, conforme a tabela de integrantes |

### 2.2 Em uma lista

**Parte 1 — pré-processamento**

- Rotulagem pelas pastas e remoção de duplicatas por hash MD5, contra vazamento entre conjuntos
- Conversão para tons de cinza, recorte de 10 % do cabeçalho, 224 × 224, três canais
- Divisão estratificada 70 / 15 / 15, materializada em disco e registrada em `manifest_splits.csv`
- Carregamento com `tf.data`, cache e prefetch
- Aumento de dados **sem espelhamento** — inverter um ECG cria um exame impossível
- Pesos por classe calculados a partir da distribuição real

**Parte 2 — classificação**

- CNN do zero: quatro blocos convolucionais com normalização em lote e *global average pooling*
- ResNet50 pré-treinada na ImageNet, em duas etapas: cabeça congelada e depois *fine-tuning* do bloco `conv5`
- Avaliação nas duas abordagens, em validação e em teste, com matriz de confusão e relatório por classe
- Destaque explícito para o **recall da classe IAM** — a métrica que importa clinicamente
- Protótipo em Gradio com upload, probabilidades por classe e aviso de revisão humana abaixo de 60 % de confiança

## 3. Como rodar

### 3.1 Notebook principal

O notebook **detecta sozinho** se está no Colab ou numa máquina local, e ajusta caminhos,
origem do dataset e download dos artefatos. É um arquivo só para os dois ambientes.

**No VS Code (local)**

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows — no macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Depois de criar o ambiente, **selecione o kernel `.venv` no canto superior direito do
notebook**. Se o VS Code continuar mostrando o Python global (por exemplo `Python 3.13.7`),
o `pip install` foi para um lugar e o notebook está rodando em outro — é a causa mais comum
de `ModuleNotFoundError: No module named 'tensorflow'`.

> **Sobre o Python 3.13:** o TensorFlow só passou a publicar wheel para essa versão a partir
> da 2.20. Por isso o `requirements.txt` usa `tensorflow>=2.20` em vez de uma versão travada
> mais antiga — com uma pin de 2.17, o pip em Python 3.13 falha com *no matching distribution
> found*, e a instalação parece ter funcionado porque o erro passa despercebido no meio da
> saída.

Baixe o dataset em <https://data.mendeley.com/datasets/gwbz3fsgp8/2> (*Download All*) e deixe o
zip em `dados/`, sem extrair. Abra o notebook, selecione o kernel `.venv` e execute em ordem.

> **Sem GPU NVIDIA o TensorFlow usa a CPU.** O treino funciona, mas em vez de ~20 minutos leva
> algumas horas. Se for esse o caso, reduza as épocas antes de começar: `epochs=50` → `15` na
> CNN e `25` → `8` no fine-tuning. A parada antecipada já interrompe quando a validação para de
> melhorar, mas o teto alto custa caro na CPU mesmo assim.

**No Google Colab**

Suba o zip para `MyDrive/CardioIA/`, ative a GPU T4 em Ambiente de execução → Alterar tipo, e
execute em ordem. Cerca de 20 minutos.

**Nos dois casos:** na figura "antes × depois" da seção 1.3, confira se o recorte de 10 % não
cortou traçado. Se cortou, reduza o `CROP_TOP` e rode de novo a partir dali.

### 3.2 Notebook de fairness (Ir Além 1)

Rode depois do principal, **na mesma sessão** do Colab — ele reaproveita `/content/outputs` e
`/content/processed`. Detalhes em [`ir-alem-1/`](ir-alem-1/).

### 3.3 App mobile (Ir Além 2)

Backend Flask e app React Native em [`ir-alem-2/`](ir-alem-2/), com instruções próprias.

## 4. Decisões técnicas que valem explicação

**O cabeçalho é recortado.** As imagens trazem nome do paciente, data e parâmetros do aparelho
no topo. Esse texto é um atalho: a rede poderia aprender a associar um formato de cabeçalho a
uma classe e atingir boa acurácia sem olhar o traçado. Seria um modelo aprovado na métrica e
inútil na clínica.

**O aumento de dados não espelha.** Inverter horizontalmente um ECG produz um exame
fisiologicamente impossível — a sequência das derivações e a polaridade das ondas têm
significado anatômico fixo. É a decisão mais específica do domínio em todo o pipeline.

**A normalização mora dentro do modelo.** As camadas `Rescaling` e `Normalization` fazem parte
do grafo salvo. Assim o protótipo Gradio e o backend do Ir Além 2 enviam pixels de 0 a 255 e
obtêm exatamente o resultado do treino, sem reimplementar a normalização em três lugares e
mantê-los sincronizados para sempre.

**Duas abordagens com a mesma entrada.** CNN do zero e ResNet50 recebem 224 × 224 × 3 e o mesmo
aumento de dados. A diferença medida entre elas é de arquitetura e de pré-treino, não de
condição experimental.

**Duplicatas removidas por hash antes de dividir.** Sem isso, a mesma imagem poderia cair em
treino e teste e a acurácia medida seria ficção. É a defesa mais barata contra vazamento — e a
que mais costuma faltar.

**O protótipo declara incerteza.** Abaixo de 60 % de confiança, a interface exige revisão
humana. Um sistema de apoio ao diagnóstico que esconde a dúvida é pior que nenhum, porque
produz confiança injustificada.

### Vídeos

| Entrega | Vídeo | Exigido pelo enunciado |
|---|---|---|
| Fase 4 — principal | <https://www.youtube.com/watch?v=bNeYV9i306E> | não |
| Ir Além 1 | <https://www.youtube.com/watch?v=aefW0OsMvx8> | não |
| **Ir Além 2** | <https://www.youtube.com/watch?v=Sca5HZtB8eY> | **sim, até 3 min** |

## 5. Resultados

Execução de 13/11/2026, em CPU. Números de `outputs/comparacao_modelos.csv`.

**Quatro classes, conjunto de teste (74 imagens):**

| Modelo | Acurácia | Precisão (macro) | Recall (macro) | F1 (macro) | Recall IAM |
|---|---|---|---|---|---|
| CNN do zero | 0,297 | 0,074 | 0,250 | 0,115 | **0,000** |
| ResNet50 (transfer + fine-tuning) | **0,541** | 0,620 | 0,624 | 0,570 | 0,750 |

**A CNN do zero colapsou:** previu "Normal" para todas as 74 imagens. A acurácia de 29,7 % é
exatamente a proporção da classe Normal no teste, e o recall de infarto é zero. As curvas em
`outputs/cnn_do_zero_curvas.png` mostram a validação congelada em 28,3 % enquanto o treino
subia a 83 % — sobreajuste completo.

**Isso não é defeito de ajuste, é limite de amostra.** O dataset tem 437 imagens duplicadas
(seção 1.2b do notebook); depois de deduplicar sobram 491 distintas, das quais **apenas 21 de
infarto agudo no treino**. A ResNet50 se sai melhor porque traz representações do ImageNet, mas
também sobreajusta.

**Triagem binária (Normal × Alterado)** — a pergunta que estes dados sustentam, seção 2.4:

| Abordagem | Acurácia | AUC |
|---|---|---|
| Linha de base: pixels 32×32 + regressão logística | 0,730 | 0,861 |
| **ResNet50 congelada + regressão logística** | **0,905** | **0,955** |

Validação cruzada em 5 dobras: **0,906 ± 0,064**.
O resultado no teste cai dentro de um desvio-padrão da média das dobras, então não é efeito de
uma divisão favorável.

A linha de base existe para manter a honestidade da comparação: uma rede de 25 milhões de
parâmetros precisa superar o que se obtém com pixels crus, ou não está pagando o próprio custo.
Ela ganha **17 pontos percentuais** sobre os pixels — está pagando.

**7 falsos negativos** no teste: exames alterados liberados como normais.
Numa triagem é esse o número que importa, porque o custo de liberar um paciente alterado é maior
que o de encaminhar um normal para revisão.

Matrizes de confusão, curvas e relatórios por classe em `outputs/`.

## 6. Estrutura de pastas

```
cardioia-fase4/
├── notebooks/
│   └── CardioIA_Fase4_ECG_CNN.ipynb      Partes 1 e 2 + protótipo Gradio
├── requirements.txt                       dependências para rodar localmente
├── dados/                                 o zip do Mendeley vai aqui (não versionado)
├── docs/
│   └── RELATORIO_PARTE1_PREPROCESSAMENTO.md
├── outputs/                               prints, métricas e modelo (após a execução)
├── ir-alem-1/                             ética, governança e fairness
│   ├── notebooks/CardioIA_Fase4_IrAlem1_Fairness.ipynb
│   └── docs/RELATORIO_IR_ALEM_1.md
├── ir-alem-2/                             app mobile + backend
│   ├── backend/                           API Flask servindo o modelo
│   ├── app/                               React Native (Expo)
│   └── docs/                              relatório de integração e roteiro do vídeo
├── LICENSE
└── README.md
```

## 7. Ir Além

### [`ir-alem-1/`](ir-alem-1/) — Ética e governança em visão computacional

O dataset não tem idade nem sexo, o que impede a análise de fairness da forma convencional.
Em vez de inventar atributos proxy ou abandonar a medição, **medimos disparidade entre as
classes diagnósticas**: um modelo que acerta quase sempre no exame normal e falha no infarto é
injusto com pacientes infartados, quem quer que eles sejam.

O notebook calcula TPR, FPR e PPV por grupo, a razão de igualdade de oportunidade com a regra
dos 80 %, a calibração do modelo via ECE — que diz se o limiar de revisão humana significa algo
— e um experimento de limiar por custo, trocando precisão por sensibilidade na classe mais
grave. Intervalos de Wilson acompanham cada taxa, para que diferenças dentro do ruído não sejam
lidas como reais.

### [`ir-alem-2/`](ir-alem-2/) — Integração com aplicativo mobile

App em React Native que fotografa ou carrega um ECG e exibe a classe detectada, com as
probabilidades de cada condição e a sinalização de revisão humana. O backend em Flask carrega o
`.keras` salvo pelo notebook e reproduz o pré-processamento **lendo os parâmetros do mesmo
`config.json`** gerado no treino — porque uma divergência ali degradaria a acurácia sem lançar
exceção nenhuma.

O backend foi exercitado com um modelo de mesma assinatura do real, cobrindo seis cenários,
incluindo as falhas: sem modelo na pasta, sem campo `imagem`, arquivo que não é imagem.

## 8. Limitações reconhecidas

- **Sem metadados demográficos.** Não há como verificar se o modelo funciona pior para
  mulheres — pergunta que não é hipotética em cardiologia.
- **Origem institucional única.** O modelo aprende também as características do equipamento.
  Em outro hospital o desempenho pode cair sem aviso.
- **Conjunto de teste pequeno.** Poucas dezenas de imagens por classe: cada erro move a métrica
  em pontos percentuais inteiros.
- **Sem identificador de paciente.** A remoção por hash pega o arquivo duplicado, não o segundo
  exame da mesma pessoa.
- **Protótipo acadêmico.** Não é dispositivo médico, não lauda e não substitui avaliação
  clínica. A interface diz isso em toda resposta.

## 9. Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 1.0.0 | 12/11/2026 | Notebook das Partes 1 e 2: pipeline, CNN do zero, ResNet50 e protótipo Gradio |
| 1.1.0 | 13/11/2026 | Ir Além 1: notebook de fairness por classe diagnóstica e relatório técnico |
| 1.2.0 | 13/11/2026 | Ir Além 2: backend Flask verificado em seis cenários e app React Native |
| 1.3.0 | 13/11/2026 | Relatório da Parte 1, README e estrutura do repositório |
| 1.4.0 | 13/11/2026 | Relatório do Ir Além 2 e notebook adaptado para rodar também fora do Colab |
| 1.4.1 | 13/11/2026 | Correção: dependências em faixas — `tensorflow>=2.20` para Python 3.13 — e chamada do Gradio compatível com as versões 4 e 5 |
| 1.5.0 | 18/11/2026 | Seção 2.4 executada: triagem binária com 0,905 de acurácia e linha de base em pixels |
| 1.5.1 | 18/11/2026 | Correção do extrator: `preprocess_input` oficial no lugar da camada `Normalization` (ordem BGR) |
| 1.6.0 | 22/11/2026 | Três vídeos publicados, documentos em PDF no padrão ABNT e links nos READMEs |

## 10. Licença

<img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" width="30"> <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" width="30">

Este trabalho está licenciado sob **[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)**.

## 11. Agradecimentos

Ao tutor Leonardo Ruiz Orabona e ao coordenador André Godoi Chiovato, pela condução do PBL
CardioIA.
