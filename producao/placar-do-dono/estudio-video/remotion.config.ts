import {Config} from "@remotion/cli/config";

// Qualidade de entrega para redes sociais (H.264, yuv420p é o que Reels/TikTok/Shorts aceitam sem recompressão estranha).
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setAudioCodec("aac");

// WebGL no Chromium headless. "angle" usa a GPU quando existe; em servidor/container sem GPU
// troque por "swangle" (software) — passe `--gl=swangle` no render ou altere aqui.
Config.setChromiumOpenGlRenderer("angle");

Config.setOverwriteOutput(true);

// adaptação local: navegador do sistema (ex.: /opt/pw-browsers) em vez de baixar o do Remotion
if (process.env.BROWSER_EXECUTABLE) Config.setBrowserExecutable(process.env.BROWSER_EXECUTABLE);
