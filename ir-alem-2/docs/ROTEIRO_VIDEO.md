# Roteiro do vídeo — Ir Além 2 (até 3 minutos)

**Formato:** gravação de tela do celular com o Expo Go, mais uma janela do terminal mostrando o
backend. O enunciado pede que o vídeo mostre **a interação** — então a maior parte do tempo é
o app sendo usado, não slides.

**Duração alvo:** 2 min 40 s, com folga para o limite de 3 minutos.

---

## 00:00 – 00:15 · Abertura

**Tela:** app aberto no celular, nenhum exame selecionado, indicador de servidor verde.

> Este é o Assistente Cardiológico Virtual do CardioIA. Ele recebe a foto de um
> eletrocardiograma e devolve a condição que a rede neural reconheceu. O modelo é a CNN que
> treinamos na Parte 2 desta fase.

## 00:15 – 00:40 · A arquitetura, em uma frase

**Tela:** terminal com o backend rodando, resposta do `/saude` visível.

> O modelo não roda no celular. O app envia a imagem para um backend em Flask, que carrega o
> arquivo `.keras` salvo pelo notebook e devolve as probabilidades. O celular cuida da
> interface; o servidor, da inferência.

Mostre a resposta do `/saude` indicando qual modelo está carregado.

## 00:40 – 01:15 · Primeiro exame: um ECG normal

**Tela:** toque em Galeria → escolher um ECG da classe Normal → Analisar.

> Escolho um exame do conjunto de teste, que o modelo nunca viu no treino.

Aguarde o resultado aparecer. Aponte para:

- a faixa verde com "SEM ALTERAÇÕES";
- a confiança em porcentagem;
- as quatro barras de probabilidade, ordenadas.

> O app não mostra só o palpite. Mostra o quanto o modelo acredita em cada uma das quatro
> condições — porque um diagnóstico assistido que esconde a incerteza é pior que nenhum.

## 01:15 – 01:55 · Segundo exame: um infarto

**Tela:** Analisar outro exame → escolher um ECG da classe IAM → Analisar.

> Agora um exame de infarto agudo.

Aponte para a faixa vermelha e o texto de orientação.

> A faixa muda de cor conforme a gravidade, e o texto diz o que aquilo significaria num cenário
> real. Repare no rodapé: o app declara em toda resposta que é um protótipo acadêmico e que não
> substitui avaliação médica. Isso não é formalidade — é a parte do projeto que define o que o
> sistema não se propõe a fazer.

## 01:55 – 02:25 · O caso em que o modelo não sabe

**Tela:** escolher um exame em que a confiança fique abaixo de 60 % — ou, se não houver, uma
imagem fora da distribuição, como uma foto qualquer.

> E quando o modelo está em dúvida?

Mostre o aviso âmbar de revisão humana.

> Abaixo de sessenta por cento de confiança, o app para e exige revisão humana. O limiar está
> no backend, documentado, e o Ir Além 1 mede se a confiança declarada pelo modelo é honesta o
> bastante para esse limiar significar alguma coisa.

## 02:25 – 02:40 · Encerramento

**Tela:** volta à tela inicial, ou o repositório aberto.

> Código do app e do backend no repositório, na pasta `ir-alem-2`. CardioIA Fase 4, Grupo
> Purkinje — Miriã Leal Mantovani e João Pedro Santos Azevedo, turma 2TIAOR-2026.

---

## Antes de gravar

- [ ] Backend rodando e `/saude` respondendo com o modelo disponível
- [ ] `BASE_URL` em `app/src/api.js` apontando para o IP certo da máquina
- [ ] Três imagens separadas na galeria do celular: uma normal, uma de IAM, uma de baixa confiança
- [ ] Notificações do celular silenciadas
- [ ] Gravação de tela em modo retrato, com o terminal numa segunda janela se for gravar o computador

## Depois de gravar

- [ ] Conferir que a duração ficou abaixo de 3 minutos
- [ ] Publicar no YouTube e colar o link neste README e no principal
- [ ] O enunciado não exige que este vídeo seja não listado — diferente do Ir Além 2 da Fase 3
