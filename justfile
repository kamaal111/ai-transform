set export
set dotenv-load

PNR := "pnpm run"
PNX := "pnpm exec"
DEV_CLI := "./bin/dev.mjs"
CLI := "./bin/run.mjs"

DEFAULT_MODEL := "gemini-2.0-flash"

# List available commands
default:
    just --list --unsorted

# Test package
[group("test")]
test:
    {{ PNR }} test

# Test package with watch
[group("test")]
test-watch:
    {{ PNR }} test:watch

# Test package with coverage
[group("test")]
test-cov:
    {{ PNR }} test:cov

# Compile package
compile:
    {{ PNR }} compile

# Lint package
[group("quality")]
lint:
    {{ PNR }} lint

# Type check
[group("quality")]
type-check:
    {{ PNR }} type-check

# Format code
format:
    {{ PNR }} format

# Check code formatting
format-check:
    {{ PNR }} format:check

# Run quality checks
[group("quality")]
quality: lint format-check type-check

# Preview transformation
[group("cli")]
preview model=DEFAULT_MODEL: compile
    {{ CLI }} preview {{ model }}

# Preview transformation in dev mode (without transpiling TS)
[group("cli")]
preview-dev model=DEFAULT_MODEL:
    {{ DEV_CLI }} preview {{ model }}

# Publish package to NPM
publish: clean-build install-modules compile
    #!/bin/zsh

    {{ PNX }} tsx scripts/publish-package-json.ts "${VERSION:-null}"

    pnpm publish --access public --no-git-checks

# Install dependencies
install-modules:
    pnpm i

# Bootstrap project
bootstrap: enable-corepack install-modules

# Bootstrap for CI
[group("ci")]
[linux]
bootstrap-ci: install-zsh bootstrap

# Bootstrap for CI
[private]
[linux]
install-zsh:
    sudo apt-get update
    sudo apt-get install -y zsh

[private]
clean-build:
    #!/bin/zsh

    rm -rf ./dist

[private]
enable-corepack:
    corepack enable
