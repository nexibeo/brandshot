/**
 * Every asset brandshot renders, with each platform's upload spec.
 *
 * Sizes are CSS pixels; `dpr` multiplies them for the saved PNG (LinkedIn's
 * company cover is tiny, so it is drawn at 2×). `safe` is the region every
 * device shows. `content` is where layouts put text: the safe region minus
 * anything the platform draws on top (the avatar on banners, the UI on
 * stories). `limits` are profile-text character limits, used by the skill
 * when it writes profile copy.
 *
 * Sources are listed in docs/platform-specs.md. Checked 2026-09-19.
 */

const box = (x, y, w, h) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
/** A region centred in a w×h canvas. */
const centred = (W, H, w, h) => box((W - w) / 2, (H - h) / 2, w, h);
/** Shrink a box by [top, right, bottom, left]. */
const inset = (b, t, r = t, bt = t, l = r) => box(b.x + l, b.y + t, b.w - l - r, b.h - t - bt);

const square = (id, platform, label, size, extra = {}) => ({
  id, platform, label, kind: 'profile', layout: 'profile', w: size, h: size, dpr: 1,
  safe: box(size * 0.15, size * 0.15, size * 0.7, size * 0.7), circle: true, ...extra,
});

export const ASSETS = [
  /* ---------------------------------------------------------- YouTube --- */
  square('youtube-profile', 'YouTube', 'Channel picture', 800, {
    notes: 'Shown as a circle, rendered as small as 98×98. JPG/PNG/GIF/BMP, ≤ 15 MB.',
  }),
  {
    id: 'youtube-banner', platform: 'YouTube', label: 'Channel banner', kind: 'banner', layout: 'banner',
    w: 2560, h: 1440, dpr: 1,
    safe: centred(2560, 1440, 1546, 423),
    content: inset(centred(2560, 1440, 1546, 423), 16, 24),
    decor: 'sides', gridDiv: 18,
    notes: 'Min 2048×1152 (16:9), recommended 2560×1440, ≤ 6 MB. Text and logos stay inside the centred 1546×423 safe area; TV shows the whole image, desktop a 2560×423 strip.',
  },

  /* -------------------------------------------------------- Instagram --- */
  square('instagram-profile', 'Instagram', 'Profile picture', 1080, {
    notes: 'Shown as a circle at 110×110 (320×320 is plenty). Also used by Threads by default.',
  }),
  {
    id: 'instagram-post', platform: 'Instagram', label: 'Feed post (3:4)', kind: 'post', layout: 'post',
    w: 1080, h: 1440, dpr: 1,
    safe: box(0, 0, 1080, 1440),
    content: inset(box(0, 0, 1080, 1440), 104, 96),
    notes: '1080×1440 (3:4), the tallest ratio Instagram keeps uncropped. Since 2025 the profile grid shows 3:4 tiles, so this fills a tile exactly. 4:5 and 1:1 posts get their sides trimmed on the grid.',
  },
  {
    id: 'instagram-square', platform: 'Instagram', label: 'Square post (1:1)', kind: 'post', layout: 'post',
    w: 1080, h: 1080, dpr: 1,
    safe: box(0, 0, 1080, 1080),
    content: inset(box(0, 0, 1080, 1080), 88, 88),
    notes: '1080×1080. Also works as a LinkedIn, Facebook or X feed image.',
  },
  {
    id: 'instagram-story', platform: 'Instagram', label: 'Story / Reel cover', kind: 'story', layout: 'post',
    w: 1080, h: 1920, dpr: 1,
    safe: box(65, 269, 950, 980),
    content: box(80, 269, 920, 1920 - 269 - 420),
    notes: '1080×1920 (9:16). Meta\'s safe zone keeps the top 14% (269 px) and 6% each side clear; Reels overlay captions and buttons on the bottom 35%. Text stops 420 px from the bottom, tiles may extend lower.',
  },

  /* --------------------------------------------------------- LinkedIn --- */
  square('linkedin-profile', 'LinkedIn', 'Profile photo (personal)', 800, {
    notes: 'Min 400×400, shown as a circle. JPG/PNG, ≤ 8 MB.',
  }),
  square('linkedin-logo', 'LinkedIn', 'Company page logo', 400, {
    circle: false,
    notes: '400×400 (min 268×268), shown as a rounded square. PNG/JPG, ≤ 3 MB. Transparent logos are shown on white.',
  }),
  {
    id: 'linkedin-personal-banner', platform: 'LinkedIn', label: 'Personal background', kind: 'banner', layout: 'banner',
    w: 1584, h: 396, dpr: 1,
    safe: centred(1584, 396, 1200, 300),
    content: box(380, 48, 1584 - 380 - 238, 396 - 96),
    notes: '1584×396 (4:1), JPG/PNG ≤ 8 MB. The photo covers roughly x 40–350, y 170–396 on desktop, and the mobile app trims ~15% off each side, so text sits between x 380 and 1346.',
  },
  {
    id: 'linkedin-company-cover', platform: 'LinkedIn', label: 'Company page cover', kind: 'banner', layout: 'banner',
    w: 1512, h: 256, dpr: 1,
    safe: box(0, 0, 1512, 256),
    content: box(290, 28, 1512 - 290 - 110, 256 - 56),
    noBrandRow: true,
    notes: '1512×256 is now both the minimum and the recommended size (1128×191 is outdated). PNG/JPG ≤ 3 MB. The logo covers the lower-left and LinkedIn asks to keep the lower-right clear.',
  },

  /* ---------------------------------------------------------------- X --- */
  square('x-profile', 'X', 'Profile photo', 400, {
    notes: '400×400, shown as a circle. JPG/PNG/GIF, ≤ 2 MB.',
  }),
  {
    id: 'x-header', platform: 'X', label: 'Header', kind: 'banner', layout: 'banner',
    w: 1500, h: 500, dpr: 1,
    safe: box(0, 60, 1500, 380),
    content: box(420, 72, 1500 - 420 - 64, 500 - 144),
    notes: '1500×500 (3:1), JPG/PNG/GIF ≤ 5 MB. X may cut up to 60 px from the top and bottom, and the avatar covers about x 0–400, y 330–500.',
  },

  /* --------------------------------------------------------- Facebook --- */
  square('facebook-profile', 'Facebook', 'Profile picture', 720, {
    notes: 'Min 320×320, shown as a circle at 176 px (desktop) / 196 px (phone). PNG keeps logos and text sharp.',
  }),
  {
    id: 'facebook-cover', platform: 'Facebook', label: 'Cover photo', kind: 'banner', layout: 'banner',
    w: 1640, h: 924, dpr: 1,
    safe: centred(1640, 924, 1640, 624),
    content: box(220, 190, 1640 - 220 - 140, 544),
    decor: 'sides', gridDiv: 12,
    notes: 'Min 400×150. Facebook shows the cover at several ratios (16:9, 2.4:1, 2.63:1); 1640×924 covers all of them and the centred 1640×624 band is always visible. The profile picture covers the lower-left.',
  },

  /* ----------------------------------------------------------- TikTok --- */
  square('tiktok-profile', 'TikTok', 'Profile photo', 720, {
    notes: 'Min 20×20, shown as a circle; 200×200 or larger recommended.',
  }),

  /* ---------------------------------------------------------- Bluesky --- */
  square('bluesky-avatar', 'Bluesky', 'Avatar', 1000, {
    notes: '1000×1000, shown as a circle. PNG/JPEG ≤ 1,000,000 bytes.',
  }),
  {
    id: 'bluesky-banner', platform: 'Bluesky', label: 'Banner', kind: 'banner', layout: 'banner',
    w: 1500, h: 500, dpr: 1,
    safe: box(100, 62, 1300, 375),
    content: box(470, 72, 1400 - 470, 500 - 144),
    notes: '1500×500 (3:1), PNG/JPEG ≤ 1 MB. Web trims ~62 px top and bottom, phones ~100 px each side, and the avatar covers about x 0–450, y 320–500.',
  },

  /* -------------------------------------------------------- Pinterest --- */
  square('pinterest-profile', 'Pinterest', 'Profile picture', 600, {
    notes: 'Shown as a circle at about 165×165 (280×280 is enough).',
  }),
  {
    id: 'pinterest-pin', platform: 'Pinterest', label: 'Standard pin (2:3)', kind: 'post', layout: 'post',
    w: 1000, h: 1500, dpr: 1,
    safe: box(0, 0, 1000, 1500),
    content: inset(box(0, 0, 1000, 1500), 110, 84),
    notes: '1000×1500 (2:3). PNG/JPEG ≤ 20 MB. Pins taller than about 1:2.1 get cut off in the feed.',
  },

  /* -------------------------------------------------------------- Web --- */
  {
    id: 'og-image', platform: 'Web', label: 'Open Graph link preview', kind: 'banner', layout: 'banner',
    w: 1200, h: 630, dpr: 1,
    safe: box(0, 0, 1200, 630),
    content: inset(box(0, 0, 1200, 630), 64, 64),
    notes: '1200×630 (1.91:1), ≤ 8 MB. The card Facebook, LinkedIn, X, Slack, iMessage and Discord show when your URL is shared.',
  },
  {
    id: 'github-social-preview', platform: 'Web', label: 'GitHub social preview', kind: 'banner', layout: 'banner',
    w: 1280, h: 640, dpr: 1,
    safe: box(40, 40, 1200, 560),
    content: inset(box(0, 0, 1280, 640), 72, 72),
    notes: 'Repository → Settings → Social preview. 1280×640 recommended (min 640×320), < 1 MB.',
  },
];

/** Character limits for profile text, per platform. */
export const TEXT_LIMITS = {
  YouTube: { 'Channel description': 1000, 'Channel name': 50, Handle: 30 },
  Instagram: { Bio: 150, Name: 30, Username: 30 },
  LinkedIn: { 'Headline (personal)': 220, 'About (personal)': 2600, 'Tagline (company)': 120, 'About (company)': 2000 },
  X: { Bio: 160, 'Display name': 50 },
  Facebook: { 'Page bio': 101 },
  TikTok: { Bio: 80 },
  Bluesky: { Bio: 256, 'Display name': 64 },
  Threads: { Bio: 150 },
  Pinterest: { About: 500 },
};

export const PLATFORMS = [...new Set(ASSETS.map((a) => a.platform))];

/** Filter by asset id, platform name or kind; accepts a comma list. */
export function selectAssets(filter) {
  if (!filter) return ASSETS;
  const want = String(filter).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return ASSETS.filter((a) => want.some((w) =>
    a.id === w || a.platform.toLowerCase() === w || a.kind === w || a.id.startsWith(w + '-')));
}

/** The pixel size of the saved PNG. */
export const pixelSize = (a) => ({ w: a.w * a.dpr, h: a.h * a.dpr });
