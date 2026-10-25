import { useEffect, useRef, useState } from "react";
import { readWallpaper, wallpaperStore } from "./wallpaper";
export function Wallpaper() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(true),
    [has, setHas] = useState(false);
  const active = useRef("");
  function apply(value: Awaited<ReturnType<typeof readWallpaper>> | null) {
    const root = document.documentElement;
    if (active.current) URL.revokeObjectURL(active.current);
    active.current = value?.url || "";
    for (const name of [
      "--wallpaper",
      "--green",
      "--wallpaper-hover",
      "--wallpaper-tint",
    ])
      root.style.removeProperty(name);
    root.removeAttribute("data-wallpaper");
    if (value) {
      root.setAttribute("data-wallpaper", "true");
      root.style.setProperty("--wallpaper", `url("${value.url}")`);
      root.style.setProperty("--green", value.palette.primary);
      root.style.setProperty("--wallpaper-hover", value.palette.hover);
      root.style.setProperty("--wallpaper-tint", value.palette.tint);
    }
    setHas(Boolean(value));
  }
  useEffect(() => {
    let cancelled = false;
    wallpaperStore()
      .then(async (blob) => {
        if (!(blob instanceof Blob)) return;
        const value = await readWallpaper(blob);
        if (cancelled) URL.revokeObjectURL(value.url);
        else apply(value);
      })
      .catch(() => {
        if (!cancelled)
          setMessage("壁纸读取失败，可重新上传；学习记录不受影响。");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
      if (active.current) URL.revokeObjectURL(active.current);
    };
  }, []);
  return (
    <details className="panel wallpaper-settings">
      <summary>页面壁纸</summary>
      <p>
        上传你喜欢的图片，按钮主色、悬停色和选中效果会自动适配。文字与按钮保留清晰对比。
      </p>
      <label className="field">
        上传壁纸
        <input
          disabled={busy}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 10 * 1024 * 1024
            ) {
              setMessage("请选择不超过10 MB的 JPG、PNG 或 WebP 图片");
              return;
            }
            setBusy(true);
            let value: Awaited<ReturnType<typeof readWallpaper>> | undefined;
            try {
              value = await readWallpaper(file);
              await wallpaperStore(file);
              apply(value);
              setMessage("壁纸已保存，按钮配色已自动适配");
            } catch {
              if (value) URL.revokeObjectURL(value.url);
              setMessage("壁纸保存失败，请换一张图片或重试");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <button
        disabled={busy || !has}
        onClick={async () => {
          setBusy(true);
          try {
            await wallpaperStore(null);
            apply(null);
            setMessage("已恢复默认壁纸与配色");
          } catch {
            setMessage("恢复失败，请重试");
          } finally {
            setBusy(false);
          }
        }}
      >
        恢复默认壁纸
      </button>
      <span aria-live="polite">{busy ? "正在处理壁纸…" : message}</span>
      <p className="muted">
        图片保存在当前浏览器，不上传服务器；学习备份不包含壁纸。
      </p>
    </details>
  );
}
