import imageCompression from "browser-image-compression"

const MAX_SIZE_MB = 0.5
const MAX_DIMENSION = 1024

export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_SIZE_MB * 1024 * 1024) {
    return file
  }

  return imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: true,
    initialQuality: 0.8,
  })
}

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const compressed = await compressImage(file)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = reject
    reader.readAsDataURL(compressed)
  })
}
