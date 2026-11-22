# Ir Além 1 — Ética e governança em visão computacional

**CardioIA — Fase 4 — Grupo Purkinje — FIAP 2TIAOR-2026**

Análise de vieses do dataset de ECG e medição de disparidade de desempenho do modelo, com
proposta de práticas de mitigação.

## O que o enunciado pede e onde está

| Entregável | Onde |
|---|---|
| Relatório técnico (até duas páginas) | [`docs/RELATORIO_IR_ALEM_1.md`](docs/RELATORIO_IR_ALEM_1.md) |
| Notebook com experimentos de fairness (opcional) | [`notebooks/CardioIA_Fase4_IrAlem1_Fairness.ipynb`](notebooks/) |

## Rodar

Execute **depois** do notebook principal, na mesma sessão do Colab — ele reaproveita o modelo
salvo em `/content/outputs` e o conjunto de teste em `/content/processed`.

Saídas em `outputs/fairness/`: cinco figuras, duas tabelas em CSV e um `resumo_fairness.json`
com os números que o relatório cita.

## O problema, e a escolha que ele forçou

A prática consolidada em *fairness* compara desempenho entre grupos definidos por atributo
protegido: sexo, faixa etária, etnia. **O dataset não traz nenhum desses campos.**

Havia quatro saídas, e nenhuma é gratuita:

| Caminho | Por que não / por que sim |
|---|---|
| Inventar atributos proxy da imagem | Produziria números bonitos sem significado clínico |
| Abandonar a medição quantitativa | Deixaria o modelo sem auditoria nenhuma |
| Trocar pelo NIH Chest X-ray | Daria o eixo demográfico, ao custo de abandonar o ECG |
| **Medir disparidade entre classes diagnósticas** | **Escolhido** — mede um eixo real de injustiça |

O argumento: em diagnóstico assistido, o grupo lesado não é definido apenas pela demografia,
mas também pela condição. Um modelo que acerta quase sempre no exame normal e falha no infarto
é injusto com pacientes infartados, quem quer que eles sejam. As métricas são as da literatura
— *equal opportunity*, *equalized odds*, razão de disparidade. O que muda é o eixo de grupo.

**Isso não substitui auditoria demográfica**, e tanto o notebook quanto o relatório dizem isso
explicitamente. Mede um eixo, não todos.

## O que o notebook calcula

1. **Desbalanceamento** — distribuição por classe e conjunto, razão entre maior e menor.
2. **Métricas por grupo** — TPR, FPR, PPV e taxa de seleção para cada condição.
3. **Razões de disparidade** — igualdade de oportunidade com a regra dos 80 % e diferença de
   equalized odds.
4. **Custo assimétrico do erro** — quantos exames graves foram ditos "Normal", que é o erro
   que manda alguém infartando para casa.
5. **Calibração** — Erro de Calibração Esperado. Se o modelo é confiante demais, o limiar de
   revisão humana do protótipo existe no papel e não funciona na prática.
6. **Mitigação por limiar de custo** — acionar IAM com limiar menor, trocando precisão por
   sensibilidade de propósito, com a tabela do câmbio exato.
7. **Intervalos de Wilson** — para que diferenças dentro do ruído amostral não sejam lidas como
   reais. Com poucas dezenas de imagens por classe, isso não é preciosismo.

## O que não conseguimos medir

Sem idade e sexo, não dá para verificar se o modelo funciona pior para mulheres — pergunta que
não é hipotética em cardiologia, onde a apresentação eletrocardiográfica do infarto difere entre
sexos e o subdiagnóstico em mulheres é documentado. O modelo pode reproduzir esse viés sem que
nenhuma métrica deste notebook o acuse.

A seção 7 do notebook lista as quatro lacunas e a seção 8 traz as recomendações.
