import { Platform } from 'react-native';

// Comunicação com o backend Flask.
//
// "localhost" significa o próprio aparelho, não o computador que serve o modelo,
// e o endereço certo muda conforme onde o app roda. Em vez de deixar isso como
// uma linha para editar à mão antes de cada demonstração — e esquecer —, a escolha
// é feita pela plataforma:
//
//   web (expo start --web)  ->  localhost      mesmo computador do backend
//   emulador do Android     ->  10.0.2.2       alias fixo para a máquina hospedeira
//   emulador do iOS         ->  localhost
//   celular pelo Expo Go    ->  IP_NA_REDE abaixo (ipconfig no Windows)
//
const IP_NA_REDE = '192.168.0.10';   // troque só se for rodar num celular real

export const BASE_URL = Platform.select({
  web: 'http://localhost:5000',
  android: 'http://10.0.2.2:5000',
  ios: 'http://localhost:5000',
  default: `http://${IP_NA_REDE}:5000`,
});

// A PRIMEIRA classificação é muito mais lenta que as seguintes: o backend só
// carrega o modelo quando chega o primeiro pedido, e são 215 MB de ResNet50 lidos
// do disco e montados na CPU. Trinta segundos não bastam, e o timeout aparecia
// como "signal is aborted without reason", que não diz nada a quem está usando.
const TIMEOUT_MS = 180000;

async function comTimeout(promessa, ms = TIMEOUT_MS) {
  const controlador = new AbortController();
  const id = setTimeout(() => controlador.abort(), ms);
  try {
    return await promessa(controlador.signal);
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(
        `O servidor não respondeu em ${Math.round(ms / 1000)}s. Na primeira ` +
        'análise ele precisa carregar o modelo; tente de novo em alguns instantes.'
      );
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

export async function verificarServidor() {
  try {
    const r = await comTimeout(
      (signal) => fetch(`${BASE_URL}/saude`, { signal }),
      5000
    );
    if (!r.ok) return { ok: false, erro: `HTTP ${r.status}` };
    return { ok: true, dados: await r.json() };
  } catch (e) {
    return { ok: false, erro: e.name === 'AbortError' ? 'tempo esgotado' : e.message };
  }
}

export async function classificarECG(uri) {
  const nome = (uri.split('/').pop() || 'ecg.png').split('?')[0];
  const ext = (nome.split('.').pop() || 'png').toLowerCase();
  const tipo = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  const form = new FormData();
  if (Platform.OS === 'web') {
    // No navegador, o FormData exige um Blob de verdade: o formato de objeto
    // {uri, name, type} é uma extensão do React Native e seria enviado como
    // "[object Object]", fazendo o backend responder 400 sem explicação óbvia.
    const resp = await fetch(uri);
    form.append('imagem', await resp.blob(), nome);
  } else {
    form.append('imagem', { uri, name: nome, type: tipo });
  }

  const resposta = await comTimeout((signal) =>
    fetch(`${BASE_URL}/api/v1/classificar`, {
      method: 'POST',
      body: form,
      // Não definimos Content-Type: o fetch precisa gerar o boundary do multipart.
      headers: { Accept: 'application/json' },
      signal,
    })
  );

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(corpo.erro || `Falha na classificação (HTTP ${resposta.status})`);
  }
  return corpo;
}
