// CardioIA — Fase 4 — Ir Além 2
// Assistente Cardiológico Virtual: envia a imagem de um ECG ao backend Flask
// e exibe a classe detectada pela CNN, com as probabilidades de cada condição.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Asset } from 'expo-asset';

import { BASE_URL, classificarECG, verificarServidor } from './src/api';
import { cores, corGravidade, rotuloGravidade } from './src/tema';

// Três exames do conjunto de teste, embutidos no app. O modelo nunca os viu
// durante o treino, então o resultado exibido é uma predição de verdade — e
// quem avalia o protótipo consegue usá-lo sem ter imagens de ECG à mão.
const EXEMPLOS = [
  { rotulo: 'Normal', fonte: require('./assets/exemplo_normal.png') },
  { rotulo: 'Infarto agudo', fonte: require('./assets/exemplo_iam.png') },
  { rotulo: 'Histórico de IAM', fonte: require('./assets/exemplo_historico.png') },
];

// O que `require` de uma imagem devolve muda conforme a plataforma: no React Native
// é um número (índice no registro de assets); no react-native-web, outra coisa. E
// Image.resolveAssetSource, a função que resolveria isso, não existe no alvo web.
// O expo-asset é a via que funciona nos dois, e é a recomendada pelo próprio Expo.
function uriDoAsset(fonte) {
  if (typeof fonte === 'string') return fonte;
  if (fonte && typeof fonte === 'object' && fonte.uri) return fonte.uri;
  return Asset.fromModule(fonte).uri;
}

export default function App() {
  const [imagem, setImagem] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [servidor, setServidor] = useState({ estado: 'verificando' });

  useEffect(() => {
    // Verificar o servidor na abertura evita o erro mais comum da demonstração:
    // o app parece quebrado quando na verdade o BASE_URL aponta para o lugar errado.
    verificarServidor().then((r) => {
      if (!r.ok) return setServidor({ estado: 'erro', erro: r.erro });
      // Servidor no ar mas sem o .keras na pasta é falha distinta de servidor fora do ar.
      return setServidor({
        estado: r.dados.modelo_disponivel ? 'ok' : 'sem_modelo',
        info: r.dados,
      });
    });
  }, []);

  async function escolher(origem) {
    setErro(null);
    setResultado(null);

    const permissao =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      setErro(
        origem === 'camera'
          ? 'Permissão de câmera negada.'
          : 'Permissão de acesso às imagens negada.'
      );
      return;
    }

    const opcoes = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 };
    const r =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);

    if (r.canceled) return;
    setImagem(r.assets[0].uri);
  }

  async function analisar() {
    if (!imagem) return;
    setCarregando(true);
    setErro(null);
    try {
      setResultado(await classificarECG(imagem));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  function limpar() {
    setImagem(null);
    setResultado(null);
    setErro(null);
  }

  const cor = resultado ? corGravidade[resultado.gravidade] : cores.borda;

  return (
    <SafeAreaView style={e.tela}>
      <StatusBar barStyle="light-content" backgroundColor={cores.fundo} />
      <ScrollView contentContainerStyle={e.conteudo}>
        <Text style={e.titulo}>CardioIA</Text>
        <Text style={e.subtitulo}>Assistente Cardiológico Virtual</Text>

        <View style={e.statusLinha}>
          <View
            style={[
              e.bolinha,
              {
                backgroundColor:
                  servidor.estado === 'ok'
                    ? cores.verde
                    : servidor.estado === 'erro'
                    ? cores.vermelho
                    : cores.ambar,
              },
            ]}
          />
          <Text style={e.statusTexto}>
            {servidor.estado === 'ok'
              ? `Servidor conectado — ${servidor.info?.modelo ?? 'modelo disponível'}`
              : servidor.estado === 'sem_modelo'
              ? 'Servidor no ar, mas sem modelo em backend/modelo/'
              : servidor.estado === 'erro'
              ? `Sem conexão com ${BASE_URL}`
              : 'Verificando servidor…'}
          </Text>
        </View>

        {imagem ? (
          <Image source={{ uri: imagem }} style={e.previa} resizeMode="contain" />
        ) : (
          <View style={[e.previa, e.previaVazia]}>
            <Text style={e.previaTexto}>Nenhum exame selecionado</Text>
            <Text style={e.previaDica}>Envie a imagem de um ECG de 12 derivações</Text>
          </View>
        )}

        <View style={e.botoes}>
          <Botao titulo="Galeria" onPress={() => escolher('galeria')} />
          <Botao titulo="Câmera" onPress={() => escolher('camera')} />
        </View>

        <Text style={e.exemplosRotulo}>OU USE UM EXAME DE EXEMPLO</Text>
        <View style={e.exemplos}>
          {EXEMPLOS.map((ex) => (
            <Pressable
              key={ex.rotulo}
              onPress={() => {
                setErro(null);
                setResultado(null);
                setImagem(uriDoAsset(ex.fonte));
              }}
              style={({ pressed }) => [e.exemplo, pressed && { opacity: 0.7 }]}
            >
              <Image source={ex.fonte} style={e.exemploMiniatura} resizeMode="cover" />
              <Text style={e.exemploTexto} numberOfLines={1}>
                {ex.rotulo}
              </Text>
            </Pressable>
          ))}
        </View>

        <Botao
          titulo={carregando ? 'Analisando…' : 'Analisar ECG'}
          destaque
          desabilitado={!imagem || carregando}
          onPress={analisar}
        />

        {carregando && <ActivityIndicator style={{ marginTop: 18 }} color={cores.vermelho} />}

        {erro && (
          <View style={e.erroCaixa}>
            <Text style={e.erroTexto}>{erro}</Text>
          </View>
        )}

        {resultado && (
          <View style={[e.cartao, { borderColor: cor }]}>
            <View style={[e.faixa, { backgroundColor: cor }]}>
              <Text style={e.faixaTexto}>{rotuloGravidade[resultado.gravidade]}</Text>
            </View>

            <Text style={e.classe}>{resultado.rotulo}</Text>
            <Text style={[e.confianca, { color: cor }]}>
              {(resultado.confianca * 100).toFixed(1)}% de confiança
            </Text>
            <Text style={e.orientacao}>{resultado.orientacao}</Text>

            {resultado.revisao_humana && (
              <View style={e.revisao}>
                <Text style={e.revisaoTexto}>
                  Confiança abaixo do limiar. Revisão humana obrigatória.
                </Text>
              </View>
            )}

            <Text style={e.secao}>PROBABILIDADES POR CLASSE</Text>
            {resultado.probabilidades.map((p) => (
              <View key={p.classe} style={e.barraLinha}>
                <Text style={e.barraRotulo} numberOfLines={1}>
                  {p.rotulo}
                </Text>
                <View style={e.barraTrilho}>
                  <View
                    style={[
                      e.barraPreenchida,
                      { width: `${Math.max(p.valor * 100, 1)}%`, backgroundColor: cor },
                    ]}
                  />
                </View>
                <Text style={e.barraValor}>{(p.valor * 100).toFixed(1)}%</Text>
              </View>
            ))}

            <Text style={e.rodape}>
              {resultado.tempo_ms} ms · {resultado.aviso}
            </Text>

            <Pressable onPress={limpar} style={e.limpar}>
              <Text style={e.limparTexto}>Analisar outro exame</Text>
            </Pressable>
          </View>
        )}

        <Text style={e.creditos}>
          Grupo Purkinje · FIAP 2TIAOR-2026{'\n'}
          Miriã Leal Mantovani · João Pedro Santos Azevedo
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Botao({ titulo, onPress, destaque, desabilitado }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      style={({ pressed }) => [
        e.botao,
        destaque && e.botaoDestaque,
        desabilitado && e.botaoDesabilitado,
        pressed && !desabilitado && { opacity: 0.75 },
      ]}
    >
      <Text style={[e.botaoTexto, destaque && e.botaoTextoDestaque]}>{titulo}</Text>
    </Pressable>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  // A coluna de conteúdo tem largura máxima e fica centralizada. No celular isso
  // não muda nada — a tela é mais estreita que o limite. No alvo web, impede que
  // os botões e as barras de probabilidade estiquem por um monitor inteiro, que é
  // o que acontece quando um layout pensado para telefone roda numa janela larga.
  conteudo: {
    padding: 20,
    paddingBottom: 48,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  titulo: { color: cores.texto, fontSize: 30, fontWeight: '700', letterSpacing: 0.5 },
  subtitulo: { color: cores.textoFraco, fontSize: 15, marginTop: 2, marginBottom: 16 },

  statusLinha: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  bolinha: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusTexto: { color: cores.textoFraco, fontSize: 12, flex: 1 },

  previa: {
    width: '100%', height: 220, borderRadius: 12, backgroundColor: cores.cartao,
    borderWidth: 1, borderColor: cores.borda,
  },
  previaVazia: { alignItems: 'center', justifyContent: 'center' },
  previaTexto: { color: cores.textoFraco, fontSize: 15 },
  previaDica: { color: cores.borda, fontSize: 12, marginTop: 6 },

  botoes: { flexDirection: 'row', gap: 12, marginTop: 16 },

  exemplosRotulo: {
    color: cores.textoFraco, fontSize: 10, fontWeight: '700',
    letterSpacing: 1, marginTop: 20, marginBottom: 8,
  },
  exemplos: { flexDirection: 'row', gap: 10 },
  exemplo: {
    flex: 1, borderRadius: 10, overflow: 'hidden',
    backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda,
  },
  exemploMiniatura: { width: '100%', height: 54, backgroundColor: '#fff' },
  exemploTexto: {
    color: cores.texto, fontSize: 11, textAlign: 'center',
    paddingVertical: 7, paddingHorizontal: 4,
  },
  botao: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda,
  },
  botaoDestaque: { backgroundColor: cores.vermelho, borderColor: cores.vermelho, marginTop: 12 },
  botaoDesabilitado: { opacity: 0.4 },
  botaoTexto: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  botaoTextoDestaque: { color: '#fff' },

  erroCaixa: {
    marginTop: 16, padding: 14, borderRadius: 10,
    backgroundColor: '#2a1416', borderWidth: 1, borderColor: cores.vermelho,
  },
  erroTexto: { color: '#ffb4b0', fontSize: 13 },

  cartao: {
    marginTop: 22, borderRadius: 14, borderWidth: 1,
    backgroundColor: cores.cartao, overflow: 'hidden',
  },
  faixa: { paddingVertical: 6, paddingHorizontal: 14 },
  faixaTexto: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  classe: { color: cores.texto, fontSize: 21, fontWeight: '700', paddingHorizontal: 16, paddingTop: 14 },
  confianca: { fontSize: 15, fontWeight: '600', paddingHorizontal: 16, paddingTop: 2 },
  orientacao: { color: cores.textoFraco, fontSize: 14, lineHeight: 20, padding: 16, paddingTop: 10 },

  revisao: {
    marginHorizontal: 16, marginBottom: 6, padding: 12, borderRadius: 8,
    backgroundColor: '#2b2410', borderLeftWidth: 3, borderLeftColor: cores.ambar,
  },
  revisaoTexto: { color: '#f0d089', fontSize: 13 },

  secao: {
    color: cores.textoFraco, fontSize: 11, fontWeight: '700', letterSpacing: 1,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
  },
  barraLinha: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 9 },
  barraRotulo: { color: cores.texto, fontSize: 12, width: 110 },
  barraTrilho: { flex: 1, height: 7, borderRadius: 4, backgroundColor: cores.borda, overflow: 'hidden' },
  barraPreenchida: { height: 7, borderRadius: 4 },
  barraValor: { color: cores.textoFraco, fontSize: 11, width: 50, textAlign: 'right' },

  rodape: { color: cores.borda, fontSize: 11, padding: 16, paddingTop: 12, lineHeight: 16 },
  limpar: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: cores.borda },
  limparTexto: { color: cores.azul, fontSize: 14, fontWeight: '600' },

  creditos: { color: cores.borda, fontSize: 11, textAlign: 'center', marginTop: 28, lineHeight: 17 },
});
