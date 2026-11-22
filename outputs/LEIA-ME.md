# Saídas da execução

Esta pasta recebe o que o notebook principal gera no Colab:

- `01_distribuicao_classes.png`, `02_exemplos_originais.png`, `03_antes_depois.png`, `04_aumento_dados.png`
- `cnn_do_zero_*` e `resnet50_transfer_*` — curvas de treino, matrizes de confusão e relatórios por classe
- `05_comparacao_modelos.png`, `comparacao_modelos.csv`
- `06_galeria_predicoes.png`
- `manifest_splits.csv`
- `cardioia_ecg_modelo.keras` e `cardioia_ecg_config.json`
- `fairness/` — saídas do notebook do Ir Além 1

A última célula do notebook baixa tudo em `cardioia_fase4_outputs.zip`. Extraia aqui.

O `.keras` está no `.gitignore`: a ResNet50 passa de 100 MB, acima do limite do GitHub.
