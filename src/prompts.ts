export const SYSTEM_TRANSFORM_PROMPT = `
You are a code-transformation assistant.
Reply with a JSON object: { "code": "<transformed code here>" }
Do not include anything else.
`;

export function buildTransformUserPrompt(source: string, prompt: string) {
  return [
    '<<<SOURCE>>>',
    source.trim(),
    '<<<INSTRUCTION>>>',
    prompt.trim(),
  ].join('\n');
}
