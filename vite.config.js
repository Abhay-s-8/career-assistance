import { defineConfig, loadEnv } from 'vite';

function apiProxyPlugin(serverGeminiKey, serverElevenKey) {
  const handler = async (req, res, next) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // --- Gemini Status ---
    if (url.pathname === '/api/gemini/status' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        available: !!serverGeminiKey,
        provider: 'gemini',
        defaultModel: 'gemini-2.5-flash',
      }));
      return;
    }

    // --- Gemini Generation Proxy ---
    if ((url.pathname === '/api/gemini' || url.pathname === '/api/gemini/generate') && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const targetModel = data.model || 'gemini-2.5-flash';
          const effectiveKey = (data.customApiKey || serverGeminiKey || '').trim();

          if (!effectiveKey) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: { message: 'No Gemini API key configured on server or in client request.' },
            }));
            return;
          }

          const geminiPayload = {
            systemInstruction: data.systemInstruction,
            contents: data.contents,
            generationConfig: data.generationConfig || {
              temperature: 0.85,
              maxOutputTokens: 600,
              topP: 0.95,
            },
          };

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(effectiveKey)}`;

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);

          const response = await fetch(geminiUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload),
          });
          clearTimeout(timeout);

          const resData = await response.json();
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(resData));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: { message: err.message || 'Internal Gemini proxy error' } }));
        }
      });
      return;
    }

    // --- ElevenLabs Status ---
    if (url.pathname === '/api/elevenlabs/status' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        available: !!serverElevenKey,
        provider: 'elevenlabs',
      }));
      return;
    }

    // --- ElevenLabs TTS Proxy ---
    if (url.pathname === '/api/elevenlabs/tts' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const voiceId = data.voiceId || '21m00Tcm4TlvDq8ikWAM';
          const effectiveKey = (data.customApiKey || serverElevenKey || '').trim();

          if (!effectiveKey) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: { message: 'No ElevenLabs API key configured on server or in client request.' },
            }));
            return;
          }

          const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(elevenUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'xi-api-key': effectiveKey,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
              text: data.text || '',
              model_id: data.model_id || 'eleven_turbo_v2_5',
              voice_settings: data.voice_settings || {
                stability: 0.65,
                similarity_boost: 0.85,
                style: 0.05,
                use_speaker_boost: true,
              },
            }),
          });
          clearTimeout(timeout);

          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(errJson));
            return;
          }

          const arrayBuf = await response.arrayBuffer();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', arrayBuf.byteLength);
          res.end(Buffer.from(arrayBuf));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: { message: err.message || 'Internal ElevenLabs proxy error' } }));
        }
      });
      return;
    }

    next();
  };

  return {
    name: 'api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverGeminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const serverElevenKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || '';

  return {
    base: '/',
    plugins: [apiProxyPlugin(serverGeminiKey, serverElevenKey)],
    server: {
      port: 5173,
      host: true,
      watch: {
        ignored: ['**/dist/**', '**/.git/**'],
      },
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
          },
        },
      },
    },
    // .glb lives in /public so it is copied verbatim and streamed by the loader
    // with real progress events rather than being bundled.
    assetsInclude: ['**/*.glb', '**/*.gltf'],
  };
});
