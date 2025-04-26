set export
# set dotenv-load

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
[group("group")]
test-watch:
    {{ PNR }} test:watch

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

[private]
enable-corepack:
    corepack enable
