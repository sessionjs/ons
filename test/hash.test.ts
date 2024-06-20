import { test, expect } from 'bun:test'
import { generateOnsHash } from '../src/index'

test('hash modern format', async () => {
  expect(generateOnsHash('hloth')).toBe('PPvTuOgAeDo9pgFrQ/SshUdhDAcVW98B2Qc3S8f4xgU=')
  expect(generateOnsHash('gay')).toBe('J+WGyjUSRiekZ+Dbbd7fotjhYFu3O7S72lXq+D8HbB0=')
  expect(generateOnsHash('keejef')).toBe('mNpp69gJKd4runEa2LZ5MyWUpw1LjMlP8xtMbLDBVuc=')
  expect(generateOnsHash('pen')).toBe('wzfaHImAyXnp49S5Mu5dh0CMnb42p/58x7d8VjYEm0Y=')
  expect(generateOnsHash('is')).toBe('OSmQdoh67G/4To0jlWGIClm18rSzDiDB4N2LSZ4f+jM=')
})

test('hash legacy format', async () => {
  expect(generateOnsHash('sissi')).toBe('fLVBiIabN/ke3g7Yjqo/JZ438TeEZjQU6oMIOA97SXU=')
  expect(generateOnsHash('costa')).toBe('N/1LPFRkgbgaQd8ko2NqkA9CwBIfA0IDapbalzKain8=')
  expect(generateOnsHash('tinder')).toBe('IHKR0fFzfeZypMLDmmnjusFXcJ2oAH4/s7KSTgZdCBg=')
})