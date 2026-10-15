# Fonts

## JetBrains Mono

- File: `JetBrainsMono-Regular.ttf` (regular weight only, which is all the terminal uses)
- Author: JetBrains, https://www.jetbrains.com/lp/mono/
- License: SIL Open Font License 1.1, which allows bundling and redistribution
- Used by the `font JetBrainsMono` command, see `core/services/font.service.ts`
  and the `@font-face` in `src/styles.scss`

To add another font: put the file here, add an `@font-face` and a `data-font` rule in
`styles.scss`, and add its name to `FONTS` in `font.service.ts`.
