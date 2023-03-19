# setup-flox

Download, install, and setup [Flox](https://floxdev.com/) in GitHub Actions.

## 🚀 Usage

```yaml
name: Setup Flox
on:
  push:
    branches:
      - master
  pull_request:
    branches:
      - master
  workflow_dispatch:

jobs:
  setup-superviseur:
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v2
      - name: Install Nix
        uses: DeterminateSystems/nix-installer-action@v1
      - name: Setup Flox
        uses: tsirysndr/setup-flox@v1
      - name: Verify Flox
        run: flox --version
```

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

## 📝 License
[MIT](LICENSE)
