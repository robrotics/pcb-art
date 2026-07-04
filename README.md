# \<pcb-art/\>

Community silkscreen art for your PCBs, curated by [robrotics](https://robrotics.web.app).

Browse and vote in the gallery at **[robrotics.web.app/pcb-art](https://robrotics.web.app/pcb-art)** —
every merged piece shows up there automatically.

## Using a piece

Each piece ships as a KiCad footprint (`.kicad_mod`) and/or an SVG source:

- **KiCad**: copy the `.kicad_mod` into a footprint library (or add this repo's
  `art/` folders as a library path), then place it like any footprint. The art
  lives on `F.SilkS`; flip it to the back or rescale it in the footprint editor
  as needed.
- **SVG**: import via KiCad's *Image Converter* (bitmap2component takes SVG →
  footprint) or your EDA tool's silkscreen import.

Check the piece's license (shown in the gallery and in its `piece.json`)
before shipping it on a commercial board — `CC0-1.0` is do-anything,
`CC-BY-4.0` needs attribution (silkscreen credit or docs), `CC-BY-SA-4.0`
needs attribution + share-alike for derivatives.

## Submitting your art

1. Fork this repo.
2. Add a folder `art/<your-slug>/` (lowercase letters, digits, dashes) containing:
   - `piece.json` — copy `art/_template/piece.json` and fill it in
   - a preview image — `preview.svg` or `preview.png` (roughly 4:3, this is the gallery card)
   - the art itself — at least one `.kicad_mod` or `.svg` source file
3. Open a pull request. CI validates the folder; a maintainer reviews and merges.

`piece.json` fields:

```json
{
  "title": "Robro Bot",
  "author": "your name or handle",
  "license": "CC0-1.0",
  "description": "optional one-liner shown on the card",
  "tags": ["robot", "mascot"]
}
```

Ground rules:

- **Original work only** — you made it, or it's clearly licensed for reuse and
  you say where it's from.
- **License** must be one of `CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`.
- **Silkscreen-appropriate**: single-colour line/solid art. If it needs
  gradients, it won't print.
- Keep files under ~1 MB each; no build outputs or zips.
- Nothing offensive, no logos/trademarks you don't own.

## How this repo works

`index.json` at the root is the machine-readable gallery manifest. CI
regenerates it on every merge to `main` (see `scripts/build-index.js` and
`.github/workflows/index.yml`) — don't edit it by hand. The website reads it
plus the art files straight from this repo; votes live on the website.
