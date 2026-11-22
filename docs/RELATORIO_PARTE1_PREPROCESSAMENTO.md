# Relatório — Parte 1
## Pré-processamento e organização das imagens

**Projeto:** CardioIA — Fase 4 — Coração em Imagens
**Grupo:** Purkinje — FIAP — Turma 2TIAOR-2026
**Integrantes:** Miriã Leal Mantovani (RM567811) · João Pedro Santos Azevedo (RM566701)
**Notebook:** `notebooks/CardioIA_Fase4_ECG_CNN.ipynb` (seções 1.1 a 1.5)

> Os números deste relatório vêm da execução real do notebook em 13/11/2026
> (`outputs/manifest_splits.csv` e `outputs/duplicacao_dataset.csv`).

---

### 1. O dataset e por que este

Escolhemos o **ECG Images of Cardiac Patients**, com cerca de 930 imagens distribuídas em
quatro classes: normal, batimento anormal, histórico de infarto e infarto agudo do miocárdio.

A alternativa natural era o NIH Chest X-ray, citado no próprio enunciado. Descartamos por três
razões. A primeira é de aderência: o eletrocardiograma **é** o exame cardiológico, enquanto no
NIH a condição cardíaca disponível é a cardiomegalia, uma classe minoritária dentro de um
conjunto pensado para patologias torácicas em geral. A segunda é de viabilidade: 930 imagens
treinam em minutos no Colab, enquanto o NIH tem 112 mil e exigiria recortar o problema. A
terceira é de balanceamento: as quatro classes do ECG têm ordens de grandeza parecidas.

A desvantagem, assumida de olhos abertos, é que **o dataset não traz idade nem sexo dos
pacientes**, o que impede análise de fairness demográfico. O Ir Além 1 trata essa limitação
explicitamente e adota outro eixo de agrupamento.

**Uma segunda desvantagem só apareceu na execução, e é bem mais séria.** O dataset é
massivamente duplicado: os 928 arquivos correspondem a apenas **491 imagens distintas**. Na
classe de infarto agudo, cada imagem aparece **oito vezes** — `MI(1).jpg`, `MI(121).jpg`,
`MI(151).jpg` e outras cinco são byte a byte idênticas.

| Classe | Arquivos | Imagens distintas | Duplicatas |
|---|---|---|---|
| Batimento anormal | 233 | 233 | 0 |
| Normal | 284 | 142 | 142 |
| Histórico de infarto | 172 | 86 | 86 |
| **Infarto agudo (IAM)** | 239 | **30** | **209** |
| **Total** | **928** | **491** | **437** |

A razão de desbalanceamento anunciada pelas contagens de arquivo seria de 1,2×. A real, depois
de deduplicar, é de **7,8×**. Isso condiciona tudo o que a Parte 2 consegue fazer, e está medido
na seção 1.2b do notebook.

### 2. Etapas do pipeline

| # | Etapa | Implementação |
|---|---|---|
| 1 | Extração e rotulagem | Rótulo inferido do nome da pasta, mapeado para quatro classes canônicas |
| 2 | Remoção de duplicatas | Hash MD5 do conteúdo do arquivo |
| 3 | Inventário | Contagem por classe, dimensões e modo de cor das imagens originais |
| 4 | Conversão para tons de cinza | `img.convert('L')` |
| 5 | Recorte do cabeçalho | 10 % superiores descartados |
| 6 | Redimensionamento | 224 × 224 com reamostragem LANCZOS |
| 7 | Replicação em três canais | `convert('RGB')` |
| 8 | Divisão estratificada | 70 % treino, 15 % validação, 15 % teste |
| 9 | Carregamento e normalização | `tf.data` com cache e prefetch; `Rescaling(1/255)` dentro do modelo |
| 10 | Aumento de dados | Rotação, zoom, translação e contraste — **sem espelhamento** |

### 3. Justificativa de cada escolha

**Tons de cinza.** O traçado do ECG é monocromático por natureza: a cor do papel não carrega
informação diagnóstica. Converter para cinza elimina variação de digitalização sem perder
sinal.

**Recorte de 10 % do topo.** O cabeçalho das imagens traz nome do paciente, data e parâmetros
do aparelho. Esse texto é um atalho perigoso: a rede poderia aprender a associar um formato de
cabeçalho a uma classe, em vez de aprender o traçado. Seria um modelo com boa acurácia e
nenhuma validade clínica. O valor de 10 % é conservador e deve ser conferido na figura
"antes × depois" gerada pelo notebook — se cortar traçado, reduza o `CROP_TOP`.

**224 × 224.** É a entrada padrão das redes pré-treinadas no ImageNet. Usar o mesmo tamanho nas
duas abordagens mantém a comparação honesta: a diferença medida entre a CNN do zero e a
ResNet50 é de arquitetura, não de resolução de entrada.

**Três canais a partir de uma imagem em cinza.** A ResNet50 espera três canais. Replicar o
canal único é a prática padrão e preserva a informação; a alternativa, adaptar a primeira
camada da rede, descartaria os pesos pré-treinados justamente onde eles mais ajudam.

**Remoção de duplicatas por hash.** Sem isso, a mesma imagem poderia cair em treino e em teste,
e a acurácia medida seria uma ficção. É a defesa mais barata contra vazamento de dados — e a
que mais frequentemente falta. Foram removidas **437 imagens duplicadas**, 47 % do dataset.

Vale dizer o que teria acontecido sem essa etapa: com cada imagem de IAM repetida oito vezes, a
probabilidade de pelo menos uma cópia cair no treino e outra no teste é praticamente certa. O
modelo seria avaliado em imagens que memorizou, e o relatório mostraria uma acurácia alta e
inteiramente falsa. **O resultado modesto da Parte 2 é o preço de uma medição honesta.**

**Divisão estratificada.** Mantém a proporção de cada classe nos três conjuntos. Numa divisão
aleatória simples, com classes desbalanceadas e poucas centenas de imagens, o conjunto de teste
pode acabar com pouquíssimos exemplos da classe menor, e a métrica dessa classe perde sentido.

**Normalização dentro do modelo, não no pipeline de dados.** A camada `Rescaling(1./255)` faz
parte do grafo salvo. Isso garante que o backend do Ir Além 2 e o protótipo Gradio recebam
pixels de 0 a 255 e ainda assim obtenham o mesmo resultado do treino — sem precisar reimplementar
a normalização em dois lugares e mantê-los sincronizados para sempre.

**Aumento de dados sem espelhamento.** Esta é a decisão mais específica do domínio. Inverter
horizontalmente um ECG produz um exame fisiologicamente impossível: a sequência das derivações
e a polaridade das ondas têm significado anatômico fixo. Treinar com imagens espelhadas
ensinaria a rede a aceitar como normal algo que não existe. Rotação de ±7°, zoom de 8 %,
translação de 4 % e variação de contraste de 15 % simulam o que de fato varia — o enquadramento
da digitalização e a qualidade do papel.

**Pesos por classe.** Calculados com `compute_class_weight('balanced')` e aplicados no `fit`.
Compensam o desbalanceamento na função de perda, sem descartar dados como faria o
subamostramento nem duplicar imagens como faria o superamostramento.

### 4. Resultado da divisão

| Conjunto | Imagens | Normal | Bat. anormal | Hist. infarto | IAM |
|---|---|---|---|---|---|
| Treino | 343 | 99 | 163 | 60 | **21** |
| Validação | 74 | 21 | 35 | 13 | **5** |
| Teste | 74 | 22 | 35 | 13 | **4** |
| **Total** | **491** | 142 | 233 | 86 | **30** |

As 21 imagens de treino da classe IAM são o número que explica a Parte 2. Nenhuma arquitetura
aprende uma condição clínica a partir de 21 exemplos.

Distribuição por classe e razão de desbalanceamento: ver `outputs/01_distribuicao_classes.png`
e a seção 2 do notebook do Ir Além 1.

### 5. Reprodutibilidade

Semente `42` fixada em `random`, `numpy` e `tensorflow`, e passada ao `train_test_split` e aos
embaralhamentos do `tf.data`. Rodar o notebook duas vezes na mesma máquina produz a mesma
divisão e os mesmos conjuntos.

As imagens processadas são gravadas em `processed/<split>/<classe>/<hash>.png`, de modo que a
divisão fica materializada em disco: o notebook do Ir Além 1 e qualquer reexecução posterior
avaliam exatamente o mesmo conjunto de teste.

### 6. Evidências geradas

| Arquivo | Conteúdo |
|---|---|
| `01_distribuicao_classes.png` | Contagem por classe |
| `02_exemplos_originais.png` | Quatro exemplos originais, um de cada classe |
| `03_antes_depois.png` | Imagem original × pré-processada, para auditar o recorte |
| `04_aumento_dados.png` | A mesma imagem sob cinco aumentos diferentes |
| `manifest_splits.csv` | Que imagem foi para qual conjunto — a divisão em forma auditável |

---

*Documento sob licença CC BY 4.0 — Grupo Purkinje, FIAP 2026.*
