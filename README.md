# AI Code Review Agent

A complete, production-ready AI GitHub Pull Request Code Review Agent built with Node.js, TypeScript, and the Groq API.

## Features

- **Automated PR Reviews**: Triggers on PR `opened`, `reopened`, `synchronize`, and `ready_for_review`.
- **Intelligent Diff Chunking**: Safely splits large changes and avoids exceeding context windows.
- **Precision Inline Comments**: Maps AI findings directly to the valid lines in the PR diff.
- **Smart Filtering**: Ignores formatting, minor typos, and non-actionable feedback. Focuses on critical bugs, logic errors, and security vulnerabilities.
- **Duplicate Prevention**: Uses fingerprinting to ensure comments are not repeated across synchronizations.
- **PR Summary**: Posts an overarching PR summary and rolls up low-severity or un-commentable findings.

## Setup

1. Copy the workflow file to your repository: `.github/workflows/ai-code-review.yml`.
2. Add the `GROQ_API_KEY` secret in your GitHub Repository settings.
3. The GitHub Token is automatically provided by GitHub Actions.

> [!WARNING]
> If you expect Pull Requests from forks and need the AI reviewer to run, you should change the trigger from `pull_request` to `pull_request_target`. Be aware of the security implications of `pull_request_target` when running arbitrary code.

## Configuration

You can configure the agent via environment variables in the workflow file:
- `GROQ_API_KEY`: Your Groq API key (Required)
- `GROQ_MODEL`: The model to use (Default: llama3-70b-8192)
- `MAX_TOKENS`: Maximum tokens per chunk (Default: 4000)

## Development

```bash
npm install
npm run build
npm test
```
