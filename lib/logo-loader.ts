/**
 * Loads the ECOTEMS logo from /ecotems-logo.png and returns it as a base64 data URL.
 * Works in both browser (fetch) and can be imported anywhere client-side.
 */
export async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch("/ecotems-logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
