set export
set dotenv-load

PNR := "pnpm run"

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
quality: lint format-check

# Check preview
[group("package")]
preview:
    {{ PNR }} preview

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
