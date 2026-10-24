// Use an English voice explicitly: the device's default voice may be Chinese.
export function speakEnglish(text, onError, scope = window) {
  if (typeof text !== "string" || !text.trim()) return;
  if (!scope.speechSynthesis || !scope.SpeechSynthesisUtterance) {
    onError("当前浏览器不支持发音，请使用支持语音朗读的浏览器");
    return;
  }
  const synth = scope.speechSynthesis;
  synth.cancel();
  const utterance = new scope.SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  utterance.voice = voices.find((voice) => /^en[-_]US$/i.test(voice.lang))
    || voices.find((voice) => /^en[-_]/i.test(voice.lang)) || null;
  utterance.lang = utterance.voice?.lang || "en-US";
  utterance.rate = 0.88;
  utterance.onerror = (event) => {
    if (!["interrupted", "canceled"].includes(event.error)) onError("发音暂时不可用，请检查设备的英语语音设置后重试");
  };
  synth.speak(utterance);
}
