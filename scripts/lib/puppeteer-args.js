// Vlaggen voor puppeteer.launch(). Zonder sandbox start Chromium niet in CI of
// als root; met de GPU uit rastert elke machine hetzelfde beeld.
export const PUPPETEER_ARGS = ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"];
