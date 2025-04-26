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
