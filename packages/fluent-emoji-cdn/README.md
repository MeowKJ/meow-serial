# @meow/fluent-emoji-cdn

A small reusable Node-friendly helper for loading Microsoft Fluent Emoji assets from a CDN.

## Why

Windows 11 style 3D emoji are image assets, not a drop-in web font.  
This package keeps a small semantic catalog and builds stable asset URLs for app code.

## Example

```js
import { getFluentEmojiUrl } from '@meow/fluent-emoji-cdn'

const url = getFluentEmojiUrl('cat')
// https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Cat/3D/cat_3d.png
```

## API

- `getFluentEmojiUrl(name, options)`
- `getFluentEmojiMeta(name)`
- `hasFluentEmoji(name)`
- `createFluentEmojiClient(defaults)`
- `buildFluentEmojiUrl(assetName, options)`

## Current Provider Options

- `jsdelivr` (default)
- `rawGithub`

## Notes

- The current default style is Microsoft Fluent Emoji `3D`
- Semantic names are easier to keep stable in app code than raw emoji glyph parsing
