"""CardioIA — Fase 4 — Ir Além 2
Backend Flask que serve o modelo de classificação de ECG treinado na Parte 2.

O pré-processamento aqui é byte a byte o mesmo do notebook (cinza, recorte do
cabeçalho, 224x224, replicado em 3 canais). Isso não é detalhe de estilo: se o
servidor pré-processasse diferente do treino, o modelo receberia uma distribuição
que nunca viu e erraria de um jeito silencioso, sem lançar exceção nenhuma.

A normalização NÃO acontece aqui — ela é uma camada dentro do próprio modelo
(`Rescaling` na CNN, `Normalization` na ResNet50). Enviar pixels 0–255 é o correto.

Rodar:
    pip install -r requirements.txt
    python app.py
"""
import io
import json
import os
import time

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

# --------------------------------------------------------------------------
# Configuração
# --------------------------------------------------------------------------
MODELO_PATH = os.environ.get("CARDIOIA_MODELO", "modelo/cardioia_ecg_modelo.keras")
CONFIG_PATH = os.environ.get("CARDIOIA_CONFIG", "modelo/cardioia_ecg_config.json")
PORTA = int(os.environ.get("PORT", 5000))

LIMIAR_CONFIANCA = 0.60   # abaixo disso, o app exibe o aviso de revisão humana
MAX_BYTES = 8 * 1024 * 1024

ORIENTACAO = {
    "Normal": "Traçado compatível com ECG normal.",
    "Batimento_anormal": ("Padrão compatível com alteração do ritmo ou do batimento. "
                          "Recomenda-se avaliação cardiológica."),
    "Historico_IAM": ("Padrão compatível com sinais de infarto prévio. "
                      "Recomenda-se acompanhamento cardiológico."),
    "IAM": ("Padrão compatível com infarto agudo. Em cenário real, isso exigiria "
            "avaliação médica imediata."),
}
GRAVIDADE = {"Normal": "normal", "Batimento_anormal": "atencao",
             "Historico_IAM": "atencao", "IAM": "critico"}

app = Flask(__name__)
CORS(app)

_modelo = None
_cfg = None


def _ler_texto(caminho):
    """Lê um arquivo que pode ter sido gravado em UTF-8 ou em cp1252.

    O notebook rodando no Windows grava com a codificação padrão do sistema
    quando o `encoding` não é declarado — e aí "Histórico" e "miocárdio" saem
    em cp1252. Assumir UTF-8 aqui faria o servidor quebrar na primeira palavra
    acentuada do config.json, num ponto bem distante da causa real.
    """
    dados = open(caminho, "rb").read()
    for enc in ("utf-8", "cp1252"):
        try:
            return dados.decode(enc)
        except UnicodeDecodeError:
            continue
    return dados.decode("utf-8", errors="replace")


def carregar():
    """Carrega modelo e configuração uma única vez, na primeira requisição.

    O import do TensorFlow fica aqui dentro de propósito: ele leva alguns
    segundos e não deve atrasar a subida do processo nem quebrar o /saude.
    """
    global _modelo, _cfg
    if _modelo is not None:
        return
    from tensorflow import keras
    if not os.path.exists(MODELO_PATH):
        raise FileNotFoundError(
            f"Modelo não encontrado em {MODELO_PATH}. Copie o arquivo "
            "cardioia_ecg_modelo.keras gerado pelo notebook para backend/modelo/."
        )
    _cfg = json.loads(_ler_texto(CONFIG_PATH))
    _modelo = keras.models.load_model(MODELO_PATH)
    print(f"[cardioia] modelo '{_cfg.get('modelo')}' carregado "
          f"({len(_cfg['classes'])} classes)")


def preprocessar(img: Image.Image) -> np.ndarray:
    """Idêntico ao `preprocess_pil` do notebook. Qualquer divergência aqui
    degrada a acurácia sem gerar erro, por isso os valores vêm do config.json
    salvo junto com o modelo, e não de constantes repetidas à mão."""
    size = _cfg["img_size"]
    crop_top = _cfg["crop_top"]
    img = img.convert("L")                       # ECG é monocromático
    w, h = img.size
    img = img.crop((0, int(h * crop_top), w, h))  # remove o cabeçalho com texto
    img = img.resize((size, size), Image.LANCZOS)
    img = img.convert("RGB")                      # 3 canais, como espera a rede
    return np.expand_dims(np.array(img, dtype="float32"), 0)


@app.get("/saude")
def saude():
    """Responde sem carregar o modelo — o /saude precisa ser rápido.

    Mesmo assim informa o nome do modelo, lido do config.json, para que o app
    consiga distinguir "servidor no ar e pronto" de "servidor no ar mas sem
    modelo na pasta" — que é a falha mais comum ao montar a demonstração.
    """
    nome, disponivel = None, os.path.exists(MODELO_PATH)
    if _cfg is not None:
        nome = _cfg.get("modelo")
    elif os.path.exists(CONFIG_PATH):
        try:
            nome = json.load(open(CONFIG_PATH, encoding="utf-8")).get("modelo")
        except Exception:
            nome = None
    return jsonify({
        "servico": "CardioIA — classificador de ECG",
        "modelo_disponivel": disponivel,
        "modelo_carregado": _modelo is not None,
        "modelo": nome,
        "limiar_confianca": LIMIAR_CONFIANCA,
    })


@app.post("/api/v1/classificar")
def classificar():
    if "imagem" not in request.files:
        return jsonify({"erro": "envie o arquivo no campo 'imagem'"}), 400

    arquivo = request.files["imagem"]
    dados = arquivo.read()
    if not dados:
        return jsonify({"erro": "arquivo vazio"}), 400
    if len(dados) > MAX_BYTES:
        return jsonify({"erro": "arquivo acima de 8 MB"}), 413

    try:
        img = Image.open(io.BytesIO(dados))
        img.load()
    except Exception:
        return jsonify({"erro": "não foi possível ler a imagem"}), 400

    try:
        carregar()
    except FileNotFoundError as e:
        return jsonify({"erro": str(e)}), 503

    inicio = time.time()
    probs = _modelo.predict(preprocessar(img), verbose=0)[0]
    ms = int((time.time() - inicio) * 1000)

    classes = _cfg["classes"]
    display = _cfg["display"]
    i = int(np.argmax(probs))
    topo = classes[i]
    conf = float(probs[i])

    return jsonify({
        "classe": topo,
        "rotulo": display[topo],
        "confianca": round(conf, 4),
        "gravidade": GRAVIDADE[topo],
        "orientacao": ORIENTACAO[topo],
        "revisao_humana": bool(conf < LIMIAR_CONFIANCA),
        "probabilidades": [
            {"classe": c, "rotulo": display[c], "valor": round(float(p), 4)}
            for c, p in sorted(zip(classes, probs), key=lambda t: -t[1])
        ],
        "tempo_ms": ms,
        "aviso": ("Protótipo acadêmico (FIAP — CardioIA). "
                  "Não substitui avaliação médica."),
    })


if __name__ == "__main__":
    # host 0.0.0.0 para que o celular na mesma rede alcance o servidor
    app.run(host="0.0.0.0", port=PORTA, debug=False)
