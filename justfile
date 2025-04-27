set export
set dotenv-load

PNR := "pnpm run"
DEV_CLI := "./bin/dev.mjs"
CLI := "./bin/run.mjs"

DEFAULT_MODEL := "gemini-2.0-flash"

# List available commands
[group("general")]
default:
    just --list --unsorted

# Test package
[group("package")]
test:
    {{ PNR }} test

# Test package with watch
[group("package")]
test-watch:
    {{ PNR }} test:watch

# Test package with coverage
[group("package")]
test-cov:
    {{ PNR }} test:cov

# Compile package
[group("package")]
compile:
    {{ PNR }} compile

# Lint package
[group("package")]
lint:
    {{ PNR }} lint

# Type check
[group("package")]
type-check:
    {{ PNR }} type-check

# Format code
[group("package")]
format:
    {{ PNR }} format

# Check code formatting
[group("package")]
format-check:
    {{ PNR }} format:check

# Run quality checks
[group("package")]
quality: lint format-check type-check

# Preview transformation
[group("cli")]
preview model=DEFAULT_MODEL: compile
    {{ CLI }} preview {{ model }}

# Preview transformation in dev mode (without transpiling TS)
[group("cli")]
preview-dev model=DEFAULT_MODEL:
    {{ DEV_CLI }} preview {{ model }}

# Install dependencies
[group("package")]
install-modules:
    pnpm i

# Bootstrap project
[group("general")]
bootstrap: enable-corepack install-modules

# Bootstrap for CI
[group("ci")]
[linux]
bootstrap-ci:
    sudo apt-get update
    sudo apt-get install -y zsh

    just bootstrap

[private]
enable-corepack:
    corepack enable
