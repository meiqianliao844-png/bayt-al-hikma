export type Palette = { primary: string; hover: string; tint: string };
const rgb = (v: number[]) =>
  `#${v.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;
export function contrastOnWhite(v: number[]) {
  const c = v.map((x) => {
    const n = x / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] + 0.05);
}
export function wallpaperPalette(input: number[]): Palette {
  let color = input.map((x) => Math.max(0, Math.min(255, Math.round(x))));
  while (contrastOnWhite(color) < 7)
    color = color.map((x) => Math.floor(x * 0.9));
  return {
    primary: rgb(color),
    hover: rgb(color.map((x) => x * 0.8)),
    tint: rgb(color.map((x) => x * 0.12 + 255 * 0.88)),
  };
}
export function wallpaperStore(blob?: Blob | null): Promise<Blob | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("hikma-appearance", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("settings");
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(Error("壁纸存储暂不可用，请关闭其他智慧宫标签页后重试"));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(
        "settings",
        blob === undefined ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("settings");
      const action =
        blob === undefined
          ? store.get("wallpaper")
          : blob === null
            ? store.delete("wallpaper")
            : store.put(blob, "wallpaper");
      tx.oncomplete = () => {
        db.close();
        resolve(blob === undefined ? action.result : blob || undefined);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
export async function readWallpaper(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw Error("图片无法读取");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("浏览器无法读取图片颜色");
    ctx.drawImage(img, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    const sum = [0, 0, 0];
    let weight = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      weight += a;
      for (let j = 0; j < 3; j++) sum[j] += data[i + j] * a;
    }
    const palette = wallpaperPalette(
      weight ? sum.map((n) => n / weight) : [33, 76, 63],
    );
    return { url, palette };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}
