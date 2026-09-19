---
name: brandshot
description: Make a brand's social media profile pictures, banners and posts at each platform's exact size (YouTube, Instagram, LinkedIn, X, Facebook, TikTok, Bluesky, Pinterest, OG), plus profile bios.
license: MIT
---

# brandshot

Turn one brand config into every social media image a brand needs, each at the platform's current upload spec, and write the matching profile text. The renderer is a zero-dependency Node script that screenshots HTML templates with a local headless Chrome.

Use this skill when someone asks for social media banners, headers, covers, profile pictures, avatars, a "social kit", channel art, an OG / link-preview image, a GitHub social preview, or profile bios and descriptions for YouTube, Instagram, LinkedIn, X/Twitter, Facebook, TikTok, Bluesky, Threads or Pinterest.

## What it produces

21 PNGs (full list: `node scripts/brandshot.mjs --list`), an `index.html` contact sheet, and optionally a zip:

- **Profile pictures:** YouTube, Instagram, LinkedIn (photo and company logo), X, Facebook, TikTok, Bluesky, Pinterest. The mark sits inside the circle crop.
- **Banners:** YouTube (2560×1440, text inside the 1546×423 safe area), X header, LinkedIn personal and company covers, Facebook cover, Bluesky banner. Text keeps clear of the avatar overlap on each platform.
- **Posts:** Instagram 3:4, square and story, and the Pinterest pin.
- **Link previews:** Open Graph 1200×630 and GitHub social preview 1280×640.

## Workflow

### 1. Gather the brand

Take everything you can from what already exists before asking anything:

- **Working in a website or app repo?** Look for the logo (`favicon.svg`, `logo.svg`, `public/`, `static/`, `assets/`), colours (CSS custom properties, Tailwind theme, design tokens), fonts (Google Fonts `<link>`, `@font-face`, `font-family`), the site name, tagline and domain (layout `<title>`, meta description, home page hero).
- **Only have a URL?** Read the home page for name, hero line, colours and fonts if you can fetch it.
- **Ask only for what's missing**, at most one short round: name, one-line headline, website, logo file, 2 brand colours.

### 2. Write `brand.json`

Put it where the output should go, e.g. `social/brand.json`. Full field reference: [references/brand-config.md](references/brand-config.md). Start from [assets/brand.example.json](assets/brand.example.json).

```json
{
  "name": "Acme Labs",
  "wordmark": "acme*labs*",
  "headline": "Tools that make\nyour team *faster*",
  "url": "acmelabs.com",
  "logo": "logo.svg",
  "theme": { "background": "#0E1116", "text": "#E6EAF0", "muted": "#8D99A9", "accent": "#FF7A1A", "accent2": "#35D6C3" },
  "palette": ["#FF7A1A", "#35D6C3", "#9A7BFF"],
  "fonts": { "display": "Archivo:800", "mono": "IBM Plex Mono:500" },
  "tiles": { "style": "shapes" }
}
```

Copy rules that make the images work:

- **Headline:** 2 lines split with `\n`, each at most ~24 characters, with one short phrase in `*stars*` for the accent colour. It is the main text on every banner, so make it the brand's promise rather than its name.
- **Wordmark:** the name as it should appear beside the logo. Put stars around part of it to colour that part.
- **Contrast:** `text` on `background` needs at least 4.5:1, and `accent` should stand out against the background.
- **Logo:** a square SVG is best, then a square PNG. A logo with its own background plate works as is. Without a logo, a monogram plate is drawn from the name.
- **Tiles:** these are the decorative squares beside the headline. `robots` and `shapes` generate art from seed words (give 6–18 words related to the brand; the same word always gives the same tile). `emoji` takes one emoji per item. `images` takes product shots or faces. `none` removes them.

### 3. Render

```bash
node <skill-dir>/scripts/brandshot.mjs --config social/brand.json --out social/out
```

- Render only some assets with `--only youtube,x-header,linkedin` (ids, platform names or kinds: `profile`, `banner`, `post`, `story`).
- Use `--zip` to also write `social/out.zip`.
- Rendering needs Chrome, Chromium, Edge or Brave. If none is installed, the script writes the HTML pages instead and says so. You can set `BRANDSHOT_CHROME=/path/to/chrome`. If no browser is available at all (for example in a sandbox), run `node <skill-dir>/scripts/brandshot.mjs --config social/brand.json --link` and give the user that studio link. It opens the browser studio pre-filled with the brand, where they can download every PNG.

### 4. Review the images yourself

Open and look at, at minimum: `youtube-banner.png`, `x-header.png`, `linkedin-personal-banner.png`, `instagram-post.png`, `og-image.png` and one profile picture. Check for:

- a headline that is too small or shrunk to fit (shorten the lines)
- low contrast, or an accent colour that disappears into the background
- a logo that is illegible at small size (use a simpler mark, or drop the logo and use the monogram)
- tiles that clash with the brand (switch `tiles.style` or the `palette`)

Fix `brand.json` and re-render only what changed with `--only`.

### 5. Write the profile text

Write `social/profile-copy.md` with a bio or description per platform, keeping to the character limits in [references/profile-copy.md](references/profile-copy.md). Count characters with code rather than guessing:

```bash
node -e "for (const [k,v] of Object.entries(require('./social/copy.json'))) console.log(k, [...v].length)"
```

### 6. Hand over

Tell the user where the files are and which file goes where. The contact sheet `out/index.html` lists every image with its upload spot. Mention the two things only they can do: upload each image in the platform's settings, and, for GitHub, set the social preview under Settings → General → Social preview.

## Platform specs

Sizes, safe areas and avatar overlaps are in [references/platform-specs.md](references/platform-specs.md), with sources. Four changed recently and are often wrong elsewhere:

- LinkedIn company covers are now **1512×256**.
- Instagram's profile grid shows **3:4** tiles.
- X may crop **60 px** off the top and bottom of the header.
- YouTube thumbnails go up to **3840×2160**.
