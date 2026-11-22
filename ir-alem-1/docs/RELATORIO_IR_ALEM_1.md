# Ir Além 1 — Ética e governança em visão computacional

**Projeto:** CardioIA — Fase 4 — Coração em Imagens
**Grupo:** Purkinje — FIAP — Turma 2TIAOR-2026
**Integrantes:** Miriã Leal Mantovani (RM567811) · João Pedro Santos Azevedo (RM566701)
**Dataset:** ECG Images of Cardiac Patients — 4 classes, ~930 imagens
**Notebook de apoio:** `notebooks/CardioIA_Fase4_IrAlem1_Fairness.ipynb`

> Todos os números deste relatório vêm da execução do notebook em 17/11/2026
> (`outputs/fairness/resumo_fairness.json` e `metricas_fairness.csv`).

---

## 1. O problema de medir justiça sem atributo protegido

A prática consolidada em *fairness* é comparar o desempenho do modelo entre grupos definidos
por um atributo protegido — sexo, faixa etária, etnia. **O dataset escolhido não traz nenhum
desses campos:** não há idade, não há sexo, não há identificador de paciente. Essa é a primeira
limitação, e ela não é contornável com engenharia.

Havia quatro caminhos. Inventar atributos proxy a partir da própria imagem produziria números
sem significado clínico. Abandonar a medição custaria o critério de avaliação e, pior, deixaria
o modelo sem qualquer auditoria. Trocar pelo NIH Chest X-ray daria o eixo demográfico, mas ao
custo de abandonar o ECG — o exame que dá sentido cardiológico ao CardioIA.

Escolhemos o quarto: **medir disparidade entre as classes diagnósticas**. O argumento é que, em
diagnóstico assistido, o grupo lesado não é definido apenas pela demografia, mas também pela
condição. Um modelo que acerta quase sempre no exame normal e falha no infarto é injusto com
pacientes infartados, quem quer que eles sejam. As métricas são as mesmas da literatura —
*equal opportunity*, *equalized odds*, razão de disparidade; o que muda é o eixo de grupo.

Isso **não substitui** auditoria demográfica, e o notebook diz isso explicitamente. Mede um eixo
real de injustiça, não todos.

## 2. Limitações identificadas no dataset

**Desbalanceamento — e ele é fabricado pela deduplicação.** Pelas contagens de arquivo o
dataset parece quase equilibrado: 284 normais, 239 de infarto agudo, 233 de batimento anormal
e 172 de histórico de infarto, uma razão de **1,65×**. Depois de remover as duplicatas exatas,
a razão real é de **7,77×** (233 contra 30).

A diferença entre esses dois números é o achado. O dataset repete imagens byte a byte, e repete
de forma desigual entre as classes: na de infarto agudo, cada imagem aparece oito vezes. Um
grupo que não deduplicasse não veria nem o desequilíbrio nem o vazamento entre treino e teste —
e reportaria uma acurácia alta e falsa.

Sem compensação, a função de perda aprende que ignorar a classe menor custa pouco. O pipeline
principal aplica pesos por classe (`compute_class_weight`) e divisão estratificada justamente
para isso, mas nenhum peso compensa 21 imagens de treino.

**Origem institucional única.** As imagens vêm de uma única instituição, com um parque de
equipamentos e um protocolo de aquisição. Uma CNN treinada assim aprende, junto com a patologia,
as características do aparelho: espessura do traçado, papel milimetrado, ruído de base. É o
viés mais traiçoeiro porque não aparece em nenhuma métrica interna — só numa validação externa.

**Ausência de metadados demográficos.** Em cardiologia isso é especialmente grave. A
apresentação eletrocardiográfica do infarto difere entre sexos, e o subdiagnóstico de infarto
em mulheres é um problema documentado na literatura médica. Nosso modelo pode reproduzir esse
viés sem que nenhuma métrica deste trabalho o acuse.

**Ausência de identificador de paciente.** Se o mesmo paciente tiver mais de um exame, imagens
correlacionadas podem ter caído em conjuntos diferentes, inflando a métrica. A remoção por hash
implementada na Parte 1 elimina o arquivo duplicado, não o segundo exame da mesma pessoa.

**Tamanho do conjunto de teste.** Com poucas dezenas de imagens por classe, cada erro desloca a
métrica em vários pontos percentuais. Por isso o notebook reporta intervalo de confiança de
Wilson para cada TPR: quando dois intervalos se sobrepõem, a diferença entre os grupos não é
distinguível do acaso.

## 3. Resultados das métricas de fairness

| Grupo diagnóstico | TPR | FPR | PPV | Suporte |
|---|---|---|---|---|
| Normal | 0,682 | 0,423 | 0,405 | 22 |
| Batimento anormal | 0,371 | 0,000 | 1,000 | 35 |
| Histórico de infarto | 0,692 | 0,164 | 0,474 | 13 |
| **Infarto agudo do miocárdio** | 0,750 | 0,029 | 0,600 | 4 |

- **Razão de igualdade de oportunidade** (menor TPR ÷ maior TPR): **0,495**
- **Diferença de equalized odds:** 0,423
- **Regra dos 80 %: REPROVADO.** A razão de 0,495 está muito
  abaixo do limiar de 0,80, e a disparidade não está onde se esperaria: o grupo pior atendido é
  **batimento anormal** (TPR 0,371), que é a classe
  **mais numerosa** do dataset. Quantidade de dados não garantiu desempenho.

A regra dos 80 %, originária do direito antidiscriminatório norte-americano, trata razões
abaixo de 0,80 como indício de impacto desproporcional. Aplicada aqui, ela sinaliza se o modelo
atende uma condição clínica substancialmente pior que as outras.

**A paridade perfeita não é o alvo.** Se fosse, bastaria piorar o desempenho nas classes fáceis.
O que importa clinicamente é o **piso de sensibilidade nas classes graves**, e é isso que a
seção seguinte trata.

## 4. O custo assimétrico do erro

Um falso negativo de infarto manda para casa alguém que está infartando. Um falso positivo gera
um exame a mais. **As métricas da seção 3 contam os dois igual; a clínica, não.**

O notebook mede quantos exames de condição grave foram classificados como Normal —
**4 casos** — e testa uma mitigação direta: acionar a classe IAM sempre que sua
probabilidade ultrapassar um limiar menor que o do `argmax`, trocando precisão por
sensibilidade de propósito. A tabela `limiar_por_custo.csv` mostra o câmbio exato, permitindo
que a decisão sobre onde operar seja explícita e documentada, em vez de herdada do padrão.

## 5. Calibração e o limiar de revisão humana

O protótipo da Parte 2 envia para revisão humana todo exame com confiança abaixo de 60 %. Esse
limiar só faz sentido se a confiança declarada pelo modelo for honesta.

O Erro de Calibração Esperado medido foi de **0,104** — acima do limiar de 0,10 a
partir do qual se considera o modelo confiante demais. **A salvaguarda dos 60 % existe no papel
e não funciona na prática:** o modelo declara mais confiança do que o acerto observado sustenta,
de modo que parte dos exames que deveriam parar para revisão humana passa direto.
É um problema de governança antes de ser um problema estatístico: a salvaguarda existe no
papel e não funciona na prática.

## 6. Práticas de mitigação

**Já aplicadas no pipeline:**

| Prática | Efeito |
|---|---|
| Pesos por classe no treino | Impede que a classe menor seja ignorada pela perda |
| Divisão estratificada | Mantém a proporção das classes nos três conjuntos |
| Remoção de duplicatas por hash | Evita vazamento da mesma imagem entre treino e teste |
| Aumento de dados sem espelhamento | Espelhar um ECG cria um exame fisiologicamente impossível |
| Limiar de revisão humana no protótipo | Devolve ao médico os casos de baixa confiança |

**Recomendadas antes de qualquer uso real:**

1. Auditoria demográfica — coletar idade e sexo e recalcular as métricas nesses eixos.
2. Validação externa em exames de outra instituição e outro equipamento.
3. Recalibração do limiar de revisão a partir do ECE medido.
4. Documentação de proveniência: instituição, período, equipamento, protocolo.
5. Monitoramento pós-implantação, por classe, para detectar desvio de distribuição.

## 7. Enquadramento legal e responsabilidade

Dados de saúde são **dados pessoais sensíveis** pela LGPD (Lei 13.709/2018, Art. 5º, II), e seu
tratamento exige hipótese específica do Art. 11. O dataset utilizado é público e
desidentificado, o que afasta o tratamento de dado pessoal nesta etapa acadêmica. Um sistema
real que receba o ECG de um paciente identificado entra integralmente no escopo da lei —
incluindo o direito à revisão de decisões automatizadas previsto no Art. 20, que no contexto
clínico se traduz em manter o laudo sob responsabilidade médica.

O protótipo classifica e sinaliza. Ele não lauda, e a interface diz isso ao usuário em todas as
respostas.

---

*Documento sob licença CC BY 4.0 — Grupo Purkinje, FIAP 2026.*
