declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: any[];
  }
  export function extractRawText(options: { buffer?: Buffer; path?: string }): Promise<MammothResult>;
  export function convertToHtml(options: { buffer?: Buffer; path?: string }): Promise<MammothResult>;
}
