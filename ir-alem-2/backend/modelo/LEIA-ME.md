# Onde colocar o modelo

O backend espera dois arquivos nesta pasta, gerados pela célula 2.3 do notebook
principal (`CardioIA_Fase4_ECG_CNN.ipynb`):

- `cardioia_ecg_modelo.keras`
- `cardioia_ecg_config.json`

Eles saem no zip baixado ao final do notebook (`cardioia_fase4_outputs.zip`).
O `.keras` não é versionado no Git — está no `.gitignore`, porque passa de
100 MB no caso da ResNet50.
