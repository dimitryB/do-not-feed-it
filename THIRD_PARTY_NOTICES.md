# Third-party notices and asset provenance

## Proof of Patience

This project contains source adapted from
[dimitryB/proofOfPatience](https://github.com/dimitryB/proofOfPatience) at commit
`5cc281e5740198e4d2bc7b6d4322d2a2b5d6a65c`.

Upstream license: MIT.

> Copyright (c) 2026 Neva Technologies Inc and Proof of Patience contributors

The complete upstream license is retained in
[licenses/ProofOfPatience-MIT.txt](licenses/ProofOfPatience-MIT.txt). Adapted
components include engine utilities, presentation infrastructure, mixer/UI
patterns, Workers/D1 scaffolding and Hemi signed-result patterns. See
[docs/reuse-manifest.json](docs/reuse-manifest.json) for the file-level record.

The new game rules, identity, small sound-cue implementation, local practice
page, and project design documents were created for this project. The new root
MIT license preserves the upstream notice for adapted portions.

## Dependencies

Runtime and development dependencies are listed in `package.json`, with exact
resolution/integrity in `package-lock.json`. Their own licenses and notices
remain in the packages. No claim is made that the root MIT license relicenses
third-party packages. Review notices required by the final bundled distribution
when preparing its public release.

The local development toolchain uses the official `@openai/sites-vite-plugin`;
POP's repository-local Sites plugin implementation is not retained.

## Game assets

No POP artwork, soundtrack, audience voice/content or likeness asset was copied
into this scaffold. The interface currently uses CSS and text; its few feedback
tones are synthesized by the new compact audio engine. A final creature rig,
environment art, music and ambience have not been authored yet.

When adding final assets, record path, creator/source URL, date, license,
modifications and attribution requirements below. For generated assets, record
the tool/source and relevant usage terms without placing private prompts or
credentials in public files.

| Asset | Source / creator | License or rights | Changes / required credit |
| --- | --- | --- | --- |
| No external game media in the scaffold | — | — | Add entries when assets are introduced |

## Research material

The user-provided judging analysis and transcript are preserved locally in the
Git-ignored `research/source-material/` directory. They are research inputs,
not redistributed game assets, project instructions or automatically licensed
material for public publication. Public source URLs and concise attributed
summaries appear in the context document.
