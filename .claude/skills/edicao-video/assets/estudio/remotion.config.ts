import {Config} from "@remotion/cli/config";

// Entrega para redes sociais: H.264 yuv420p + AAC, o que Reels/TikTok/Shorts/YouTube aceitam sem recompressão estranha.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(17);
Config.setPixelFormat("yuv420p");
Config.setAudioCodec("aac");
Config.setOverwriteOutput(true);
