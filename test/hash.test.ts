import { test, expect } from "bun:test";
import { generateOnsHash, uint8ArrayToBase64 } from "../src/index";

test("hash modern format", async () => {
	expect(uint8ArrayToBase64(generateOnsHash("hloth"))).toBe(
		"PPvTuOgAeDo9pgFrQ/SshUdhDAcVW98B2Qc3S8f4xgU=",
	);
	expect(uint8ArrayToBase64(generateOnsHash("gay"))).toBe(
		"J+WGyjUSRiekZ+Dbbd7fotjhYFu3O7S72lXq+D8HbB0=",
	);
	expect(uint8ArrayToBase64(generateOnsHash("keejef"))).toBe(
		"mNpp69gJKd4runEa2LZ5MyWUpw1LjMlP8xtMbLDBVuc=",
	);
	expect(uint8ArrayToBase64(generateOnsHash("pen"))).toBe(
		"wzfaHImAyXnp49S5Mu5dh0CMnb42p/58x7d8VjYEm0Y=",
	);
	expect(uint8ArrayToBase64(generateOnsHash("is"))).toBe(
		"OSmQdoh67G/4To0jlWGIClm18rSzDiDB4N2LSZ4f+jM=",
	);
});

test("hash legacy format", async () => {
	expect(uint8ArrayToBase64(generateOnsHash("sissi"))).toBe(
		"fLVBiIabN/ke3g7Yjqo/JZ438TeEZjQU6oMIOA97SXU=",
	);
	expect(uint8ArrayToBase64(generateOnsHash("costa"))).toBe(
		"N/1LPFRkgbgaQd8ko2NqkA9CwBIfA0IDapbalzKain8=",
	);
	expect(uint8ArrayToBase64(generateOnsHash("tinder"))).toBe(
		"IHKR0fFzfeZypMLDmmnjusFXcJ2oAH4/s7KSTgZdCBg=",
	);
});
