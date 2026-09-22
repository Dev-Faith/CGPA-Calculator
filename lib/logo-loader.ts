/**
 * Loads the appropriate logo and returns it as a base64 data URL.
 * Works in both browser (fetch) and can be imported anywhere client-side.
 */
export async function loadLogoDataUrl(institutionKey: string = "ECOTAMS"): Promise<string | null> {
  try {
    const filename = institutionKey === "EIT" ? "/eit-logo.png" : "/ecotems-logo.png";
    const response = await fetch(filename);
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
