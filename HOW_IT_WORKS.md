# How it works

A plain guide to the parts of My Loci Library and how to fix each one. It is written for someone who remembers nothing about the project.

## The parts

To be written as the parts are built.

## Verified approaches

Results of the phase 4 experiments go here.

## Decisions

Choices made during the build that the plan did not settle, with the reason for each.

- **No GitHub CLI at the start (2026-11-08).** `gh` was not installed when the build began. All local work for phases 1 and 2 went ahead, and the GitHub repositories were created once `gh` was installed and signed in.
- **Line endings.** Every repository has a `.gitattributes` file that stores text with Unix line endings (LF), so files read the same on Windows and Linux.
- **Local preview server.** ES modules do not load from `file://` addresses, so during development the app is served with any static server (for example `python -m http.server`). Nothing in the app depends on which server is used.
