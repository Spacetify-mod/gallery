# WebNowPlaying

Shows the song playing in [Rainmeter](https://www.rainmeter.net) skins and other WebNowPlaying apps on your desktop, and lets them control Spotify.

## What it sends and does

- It sends the title, artists, album, cover, position, volume, shuffle and repeat.
- The app can play, pause, skip, seek, change the volume, shuffle and repeat.

## Better than the original

It connects by itself as soon as the app runs, and tries again quietly when it does not. The port can be changed in the settings (8974 by default).

## Good to know

It only talks to an app on this computer (127.0.0.1): nothing leaves it. You need the WebNowPlaying plugin in Rainmeter, or another app that uses it.

## Made to last

It only uses spacetify's API, never Spotify's code: it keeps working after Spotify's updates.

## Credits

A new take on **Web Now Playing**, an extension that comes with [Spicetify](https://github.com/spicetify/cli), written from scratch for spacetify by the spacetify team.
