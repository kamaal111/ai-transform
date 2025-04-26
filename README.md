# AI Transform

A library for transforming source code or text using Large Language Models (LLMs).

## Installation

```bash
# SOON!
```

## Usage

The primary function is `transformFromSource`. It takes a source string, a prompt describing the desired transformation, and a configuration object specifying the LLM provider and its settings.

```typescript
import { transformFromSource } from 'ai-transform';

const sourceCode = `
function hello() {
  console.log("Hello, world!");
}
`;

const prompt = 'Convert this function to an arrow function';

const config = {
  llm: {
    provider: 'openai', // Select the preferred AI provider
    apiKey: process.env.OPENAI_API_KEY, // Optional to override the OpenAI, by default the library takes `OPENAI_API_KEY` environment variable
    model: 'gpt-4.1', // Select OpenAI model
  },
};

try {
  const transformedCode = await transformFromSource(sourceCode, prompt, config);
  console.log(transformedCode);
  /*
  Expected output (will vary based on LLM response):
  const hello = () => {
    console.log("Hello, world!");
  };
  */
} catch (error) {
  console.error('Transformation failed:', error);
}
```

## Configuration

The `config` object requires an `llm` property.

### OpenAI Configuration (`provider: 'openai'`)

- `provider`: Must be set to `'openai'`.
- `apiKey`: Optional to override the OpenAI, by default the library takes `OPENAI_API_KEY` environment variable.
- `model`: Select your preferred OpenAI model, for example; gpt4.1

## Error Handling

The `transformFromSource` function may throw an `AITransformError` if the transformation fails (e.g., due to API errors or issues with the LLM response). It's recommended to wrap the call in a `try...catch` block.
