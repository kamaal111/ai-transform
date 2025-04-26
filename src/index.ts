export type TransformConfig = object;

export async function transformFromSource(source: string, prompt: string, config: TransformConfig): Promise<string> {
  console.log('prompt', prompt);
  console.log('config', config);
  return source;
}

export default { transformFromSource };
