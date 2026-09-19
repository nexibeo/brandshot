# brand.json reference

Every field is optional except `name`. JSON Schema: `brand.schema.json` in the repository root.

| Field | Type | Default | What it does |
| --- | --- | --- | --- |
| `name` | string | `"Your Brand"` | Brand name. Used for the monogram and file names. |
| `wordmark` | string | `name` | Text beside the logo. `*part*` is drawn in the accent colour. |
| `headline` | string | `name` | Main line on banners and posts. `\n` forces a line break, and lines with breaks never wrap: the font shrinks to fit instead. `*part*` is the accent colour. |
| `tagline` | string | `""` | Optional secondary line under the headline (shown where there is room). |
| `url` | string | `""` | Shown in monospace under the headline. |
| `logo` | string | `""` | A file path relative to brand.json (`.svg`, `.png`, `.jpg`, `.webp`), inline `<svg…>`, a `data:` URL or an `https:` URL. Square works best. |
| `monogram` | string | first letter of `name` | Drawn on an accent plate when there is no logo. |
| `theme.background` | colour | `#0E1116` | Canvas colour. Light or dark both work, and the glow adapts. |
| `theme.text` | colour | `#E6EAF0` | Headline and wordmark colour. |
| `theme.muted` | colour | `#8D99A9` | URL and tagline colour. |
| `theme.accent` | colour | `#FF7A1A` | Starred text, monogram plate, top-right glow. |
| `theme.accent2` | colour | `#35D6C3` | Bottom-left glow. |
| `theme.grid` | colour | derived | Grid line colour (a hex with alpha is fine). |
| `palette` | colour[] | `[accent, accent2]` | Colours the tiles cycle through. |
| `fonts.display` | `"Family:weight"` or `{family, weight}` | `Archivo:800` | Any Google Fonts family. |
| `fonts.mono` | `"Family:weight"` or `{family, weight}` | `IBM Plex Mono:500` | Used for the URL. |
| `fonts.google` | boolean | `true` | Set to `false` to use locally installed fonts only (offline rendering). |
| `tiles.style` | `robots` \| `shapes` \| `emoji` \| `images` \| `none` | `shapes` | Decorative tiles beside the headline. |
| `tiles.items` | string[] | built-in seeds | Seeds (robots, shapes), emoji (emoji) or image paths/URLs (images). |
| `background.grid` | boolean | `true` | Faint grid texture. |
| `background.glow` | boolean | `true` | Two soft colour glows. |

## Writing good headlines

- Keep it to 2 lines of up to ~24 characters each. A 1500×500 header gives the headline about 1,000 px of width.
- Put one short phrase in stars. More than one accent phrase stops working as an accent.
- Lead with what the brand does for people, not the brand name, because the wordmark already carries the name.
- Examples: `"A parts catalog for\n*Grok Bot* teammates"`, `"Small-batch beans,\nroasted *every Monday*"`, `"We design *brands and websites*\nfor founders who ship fast"`.
