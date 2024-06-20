import { test, expect } from 'bun:test'
import { decryptONSValue } from '../src/index'
import { ready } from 'libsodium-wrappers-sumo'
await ready

test('modern format decryption', async () => {
  expect(
    decryptONSValue('71772d0deba03d42d84f5e7fe3e619eab6adf1809a03be32e9a546378647346069180213b360bd19e4931985770ba51c54' + 'bfa1d8c53a92357c0c170af90a743dc2b4960eff150ea407', 'hloth')
  ).toBe('057aeb66e45660c3bdfb7c62706f6440226af43ec13f3b6f899c1dd4db1b8fce5b')
  expect(
    decryptONSValue('cb9a41fa75f39964cd8fc9b416da3d231cd0197cbac2146bf2ec64a8595d0be049b6ee0fd66af3cbad705bebedf22835b8' + '2093c675db2c805674f6b235b96760f282542782a675a5b8', 'gay')
  ).toBe('0531da1c39e3e524c4fe7ee8ad8b50088204e43d650df97bfaee015f3cc174a85c')
  expect(
    decryptONSValue('c71773a775682adc79ccdbe863a43685c007bdda195f3a33d3e188d756e9e90d7fd2bc12512bbb47f2e51018cec2b6a2b7' + 'f7fb09af1c7931c0d188f1df6ea77f373a094a139e2a94b9', 'keejef')
  ).toBe('05d871fc80ca007eed9b2f4df72853e2a2d5465a92fcb1889fb5c84aa2833b3b40')
  
})

test('legacy format decryption', async () => {
  expect(
    decryptONSValue('be3445a80763dd0e63a4d8a524c8f3a1bbedf8921947b2987b7e7173e7d920c649d6d7c2391967598c65d3f2e81b760787', 'sissi')
  ).toBe('05bf7d78abf034661c691523b009ea2a281ee9c2093009808e098399e49fa1c54f')
  expect(
    decryptONSValue('33d78cf37e4903e6a196aae1322fdb1c348805e56435b0c99fefde74c202b823e9f17e03881ed949064c34104c77607a4f', 'costa')
  ).toBe('05bf7d78abf034661c691523b009ea2a281ee9c2093009808e098399e49fa1c54f')
  expect(
    decryptONSValue('e322301bd6f551ca9c89448746b9276f94e2493ee73bb5e7aa6495ce19fbd90a929f78a78cf0201d0d1540110ffdb3e3e1', 'tinder')
  ).toBe('0563854b4dbf5ccaddbd077f91b40e93fa9d095582027bfaabc36e3b821c4e4f04')
})