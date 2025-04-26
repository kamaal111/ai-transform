set export
set dotenv-load

# List available commands
[group("general")]
default:
    just --list --unsorted

# Compile package
[group("package")]
compile:
    pnpm run compile

# Lint package
[group("package")]
lint:
    pnpm run lint

# Format code
[group("package")]
format:
    pnpm run format

# Check preview
[group("package")]
preview:
    pnpm run preview

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
