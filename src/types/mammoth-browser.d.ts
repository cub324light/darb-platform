/* تعريف نوع لمسار المتصفح من mammoth (لا يأتي مع تعريفات فرعية) */
declare module "mammoth/mammoth.browser" {
  interface ExtractResult { value: string; messages: unknown[]; }
  interface Input { arrayBuffer: ArrayBuffer; }
  export function extractRawText(input: Input): Promise<ExtractResult>;
  export function convertToHtml(input: Input): Promise<ExtractResult>;
}
