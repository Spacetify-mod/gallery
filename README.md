<h3 align="center"><a href="https://github.com/spacetify-mod"><img src="https://raw.githubusercontent.com/spacetify-mod/.github/main/profile/assets/banner.png" alt="spacetify" width="700"></a></h3>
<p align="center">
  <img alt="Mods in the gallery" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fspacetify-mod%2Fgallery%2Fmain%2Fgallery%2Findex.json&query=%24.mods.length&label=mods%20in%20the%20gallery&color=FFA273">
  <a href="https://github.com/spacetify-mod/gallery/actions/workflows/ci.yml"><img alt="Gallery safety" src="https://github.com/spacetify-mod/gallery/actions/workflows/ci.yml/badge.svg"></a>
</p>

# The spacetify gallery

The themes and extensions you can install in one click from the **Gallery**
of [spacetify](https://github.com/spacetify-mod/spacetify), inside Spotify.
Every mod here was checked before anyone could install it, and is checked
again at every change.

## What is inside

- **Themes**: the palettes people love (Catppuccin, Nord, Dracula, Gruvbox,
  Rosé Pine, Tokyo Night, Everforest, Kanagawa…) and **all 16 official
  themes of Spicetify with every one of their colour schemes**, rebuilt so
  they survive Spotify's updates: Dribbblish, Sleek, Ziro, Flow, Starry
  Night, Text, Turntable and the others.
- **Extensions**: full screen, a trash bin for songs and artists, precise
  volume, no podcasts, bookmarks, and more on the way.

The list is one file, [`gallery/index.json`](gallery/index.json). It gives,
for every mod, the SHA-256 of each of its files: the app refuses any file
that does not match. The mods themselves are in [`gallery/mods/`](gallery/mods).

## How a mod gets in

1. **Someone sends it**, from the app's **Submit** page or with the
   [request form](https://github.com/spacetify-mod/gallery/issues/new?template=submit-mod.yml).
2. **The robot checks it** within minutes and answers on the request: the
   ClamAV antivirus, disguised programs, invisible characters, scrambled
   code, every web address it contacts, access to the Spotify account, the
   clipboard or the keyboard, and scripts hidden in pictures. The mod is only
   read, never run ([`.github/workflows/submission.yml`](.github/workflows/submission.yml)).
3. **The team decides.** If nothing is blocking, the robot opens a pull
   request; merging it accepts the mod, closing it refuses it, and the robot
   tells the author why ([`decision.yml`](.github/workflows/decision.yml)).
4. **It keeps being checked.** At every change, every mod of the gallery,
   the team's own included, goes through the antivirus and the robot again
   ([`ci.yml`](.github/workflows/ci.yml)). That is what the **Verified**
   badge in the app says.

Only the account that sent a mod first can send its updates, and the robot
shows what changed.

## Writing your own

Guides for [themes](https://github.com/spacetify-mod/spacetify/blob/main/docs/themes.md)
and [extensions](https://github.com/spacetify-mod/spacetify/blob/main/docs/extensions.md).
The checks run on your computer too: `spacetify gallery review my-mod`.

## Credits

Each mod's author is shown in the app and in its `showcase/about.md`. The
themes rebuilt from Spicetify credit the original authors and link to
[spicetify-themes](https://github.com/spicetify/spicetify-themes) (MIT).
spacetify is not affiliated with Spotify or with Spicetify.

---

*La galerie de spacetify : les thèmes et extensions qu'on installe en un clic
depuis Spotify. Chaque mod est vérifié par un antivirus, un robot et
l'équipe avant d'être proposé, puis à chaque changement.*
