/**
 * Ambient module declaration for mammoth.
 * mammoth ships a lib/index.d.ts but does not declare it in package.json "types".
 * This shim exposes the subset we use: extractRawText({ buffer }).
 */
declare module "mammoth" {
  interface Result {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  interface BufferInput {
    buffer: Buffer;
  }

  function extractRawText(input: BufferInput): Promise<Result>;

  const mammoth: {
    extractRawText: typeof extractRawText;
  };

  export = mammoth;
}
