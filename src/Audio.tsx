import { useEffect, useRef, useState } from "react";
export function AudioTools({ text, url }: { text: string; url?: string }) {
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const requesting = useRef(false);
  const alive = useRef(true);
  const clipRef = useRef("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (recorder.current && recorder.current.state !== "inactive")
        recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (clipRef.current) URL.revokeObjectURL(clipRef.current);
    };
  }, []);
  function speak(rate: number) {
    if (!("speechSynthesis" in window)) {
      setMessage("当前浏览器不支持语音合成，请使用真人音频或更换浏览器。");
      return;
    }
    const voices = speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.toLowerCase().startsWith("ar"));
    if (!voice) {
      setMessage(
        "未检测到阿拉伯语音色。请在系统中安装阿语语音，或使用真人音频。",
      );
      return;
    }
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.lang = voice.lang;
    utter.rate = rate;
    utter.onerror = () => setMessage("朗读失败，请检查系统语音设置。");
    utter.onend = () => setMessage("朗读结束");
    speechSynthesis.speak(utter);
    setMessage("已请求阿语朗读");
  }
  async function record() {
    if (requesting.current) return;
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMessage(
        "录音需要支持 MediaRecorder 的浏览器，并通过 HTTPS 或本机访问。",
      );
      return;
    }
    requesting.current = true;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!alive.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      const r = new MediaRecorder(stream.current);
      recorder.current = r;
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        if (!alive.current) return;
        if (clipRef.current) URL.revokeObjectURL(clipRef.current);
        clipRef.current = URL.createObjectURL(
          new Blob(chunks, { type: r.mimeType }),
        );
        setClip(clipRef.current);
        setRecording(false);
        setMessage("可回放录音，与原音对照；录音仅保留在本页内存中。");
      };
      r.start();
      setRecording(true);
      setMessage("正在录音，请完成后点击停止");
    } catch {
      setMessage("无法获取麦克风，请检查权限及设备。");
    } finally {
      requesting.current = false;
    }
  }
  return (
    <div className="audio-tools">
      <div className="button-row">
        <button onClick={() => speak(1)} aria-label={`朗读 ${text}`}>
          ◖ 正常朗读
        </button>
        <button onClick={() => speak(0.65)}>慢速</button>
        <button
          onClick={() => {
            if ("speechSynthesis" in window) speechSynthesis.cancel();
            setMessage("已停止朗读");
          }}
        >
          停止朗读
        </button>
        <button onClick={record}>
          {recording ? "■ 停止录音" : "○ 跟读录音"}
        </button>
      </div>
      {url && (
        <audio
          controls
          src={url}
          onError={() => setMessage("真人音频加载失败")}
        />
      )}{" "}
      {clip && <audio controls src={clip} />}
      <small role="status">{message}</small>
    </div>
  );
}
