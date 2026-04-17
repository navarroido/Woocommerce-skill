# Contributing to WooCommerce AI Skills

Thank you for contributing! 

## Quick Start

```bash
# Clone and install dev dependencies
git clone https://github.com/navarroido/Woocommerce-skill.git
cd Woocommerce-skill
pnpm install

# Scaffold a new skill
pnpm scaffold

# Validate your skill
pnpm validate

# Lint markdown
pnpm lint
```

## Types of Contributions

- **New skill** — Add a workflow for a WooCommerce operation not yet covered
- **Skill improvement** — Add steps, improve accuracy, fix API details
- **Bug fix** — Correct wrong endpoint, parameter, or workflow logic
- **Documentation** — Improve docs, fix typos, add examples

## Authoring a New Skill

See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for the full workflow.

In brief:
1. Run `pnpm scaffold` — picks category, slug, and description interactively
2. Fill in the generated `SKILL.md` following [docs/SKILL-FORMAT.md](./docs/SKILL-FORMAT.md)
3. Add all REST endpoints used to [docs/rest-api-index.md](./docs/rest-api-index.md)
4. Run `pnpm validate` and `pnpm lint` — both must pass
5. Test against a real WooCommerce dev store
6. Open a PR with branch name `skill/<category>/<slug>`

## Code of Conduct

Be respectful. Security-sensitive skills (reading/writing credentials, PII) require extra review.
Never include actual API keys or store URLs in skill files.

## License

By contributing you agree your work is released under the MIT License.
