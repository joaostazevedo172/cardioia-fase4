// Paleta herdada das fases anteriores do CardioIA.
export const cores = {
  fundo: '#0f1117',
  cartao: '#191c25',
  borda: '#2a2e3a',
  texto: '#f2f2f2',
  textoFraco: '#9aa0ae',
  vermelho: '#b3221e',
  azul: '#0563c1',
  ambar: '#d99100',
  verde: '#2e7d4f',
};

// Cor por nível de gravidade devolvido pelo backend.
export const corGravidade = {
  normal: cores.verde,
  atencao: cores.ambar,
  critico: cores.vermelho,
};

export const rotuloGravidade = {
  normal: 'SEM ALTERAÇÕES',
  atencao: 'ATENÇÃO',
  critico: 'CRÍTICO',
};
