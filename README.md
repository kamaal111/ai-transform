# AI Transform

A library for transforming source code or text using Large Language Models (LLMs).

## Installation

```bash
# SOON!
```

## Usage

The library provides two main functions for transformations: `transformFromSource` for working with strings and `transformFromFile` for working with files directly.

### Transform from Source String

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
    model: 'gpt-4.1', // Select preferred model
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

### Transform from File

You can also transform code directly from a file:

```typescript
import { transformFromFile } from 'ai-transform';

const filepath = './src/example.js';
const prompt = 'Convert all functions to arrow functions';

const config = {
  llm: {
    provider: 'openai',
    model: 'gpt-4.1',
  },
};

try {
  const transformedCode = await transformFromFile(filepath, prompt, config);
  console.log(transformedCode);
  // Use the transformed code, e.g., write it back to a file
} catch (error) {
  console.error('Transformation failed:', error);
}
```

## Configuration

The `config` object requires an `llm` property.

### OpenAI Configuration (`provider: 'openai'`)

- `provider`: Must be set to `'openai'` or let it be inferred by passing in 1 of the OpenAI models to the `model` property.
- `apiKey`: Optional to override the OpenAI API key, by default the library takes `OPENAI_API_KEY` environment variable.
- `model`: Select your preferred OpenAI model, for example; gpt4.1

### Google Configuration (`provider: 'google'`)

- `provider`: Must be set to `'google'` or let it be inferred by passing in 1 of the Google AI models to the `model` property.
- `apiKey`: Optional to override the Google AI API key, by default the library takes `GOOGLE_AI_API_KEY` environment variable.
- `model`: Select your preferred Google AI model, for example; gemini-2.0-flash

### Anthropics Configuration (`provider: 'anthropics'`)

- `provider`: Must be set to `'anthropics'` or let it be inferred by passing in 1 of the Anthropics models to the `model` property.
- `apiKey`: Optional to override the Anthropics API key, by default the library takes `ANTHROPIC_API_KEY` environment variable.
- `model`: Select your preferred Anthropics model, for example; claude-3-7-sonnet-latest

## Error Handling

The `transformFromSource` function may throw an `AITransformError` if the transformation fails (e.g., due to API errors or issues with the LLM response). It's recommended to wrap the call in a `try...catch` block.
