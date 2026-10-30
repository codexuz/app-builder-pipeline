# Design

Every generated business must look like its own company and feel at home to shoppers in Uzbekistan. `app.style` picks
one of five complete worlds, each drawn from a craft those shoppers know by heart. A style changes composition, not
just colour: never reduce one to a palette swap, and never add a sixth by recolouring another.

## The five worlds

| Style | Source | Ground | Display / body | Signature | Composition |
|---|---|---|---|---|---|
| `market` | Chorsu bazaar | `#fffdf7`, saffron `#ffb703` | Unbounded / Golos Text | Painted awning stripe across the top | Search in the header, compact banner, five-up grid, price above the title |
| `fashion` | Adras ikat | White, dyed purple `#2a0a3e` | Oswald / Commissioner | Stepped ikat field | Full-height dyed hero, type on solid blocks, large 3:4 photographs, no radius |
| `fresh` | Rishtan ceramics | Glaze `#f3fbfb`, cobalt `#0b2a6b` | Yeseva One / Nunito | Petal-rim plate | Product on a plate in the hero, round product images with a rim |
| `luxury` | Lapis and brass | Lapis `#0a1a3f`, brass `#d9b45c` | Forum / Jost | Girih star tile at low contrast | Centred, sparse, three-up 4:5 grid, always dark |
| `studio` | Suzani | Pomegranate `#7d1531`, blush `#fff8f6` | Philosopher / Mulish | Stitched medallion | Split hero, services as a price list, booking as the main action |

## Rules

- **Tokens live in one file per style:** `templates/web/app/assets/styles/<style>.css` and the mobile equivalent. Only
  the chosen style ships, so only its fonts load.
- **Fonts** must cover Latin Extended and Cyrillic, because Uzbek and Russian are first-class.
- **Colour:** `app.color` sets the button colour on `market` and `fresh`. The other styles carry their own accent so
  their identity holds. Buttons on a coloured hero need their own contrast colour; never primary on primary.
- **Motifs** are authored SVG in `Motif.vue`, sharp at any size and almost weightless. They are decoration only and
  carry no meaning, so they are hidden from screen readers.
- **Photographs lead.** The motif frames the page; products fill it. Every card must look right with a real photo and
  with no photo.
- **Prices** are always visible next to the buy action, in so'm, formatted by `formatMoney`. Uzbek dates and numbers
  are formatted by our own code, never by `Intl`, because browsers often lack Uzbek data.
- **The staff area** (`/app`) keeps the style's fonts and colours but stays a calm working tool: no motifs.
- **Shoppers on phones come first:** two-column grids, large buttons, no sideways scrolling at 375px.
- **Respect motion preferences.** Motion is small and purposeful: image zoom on hover, nothing that delays buying.
