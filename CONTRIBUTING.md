# Contributing to FlappyPy

Thanks for helping improve FlappyPy.

## Before you start

1. Check open issues and pull requests for related work.
2. For a larger change, open an issue first so the approach can be discussed.
3. Keep changes focused and preserve the dependency-free browser setup.

## Local development

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`, then test the game with keyboard, pointer, and touch controls when possible.

## Pull requests

- Use a short, imperative title.
- Explain the user-visible behavior and why it changed.
- Include screenshots or a short recording for visual changes.
- Run `node --check game.js` and `git diff --check` before submitting.
- Update `CHANGELOG.md` for notable user-facing changes.

## Code style

Use the existing plain JavaScript, HTML, and CSS patterns. Prefer small focused functions, descriptive names, and accessible controls. Avoid adding dependencies unless they solve a clear maintenance problem.
