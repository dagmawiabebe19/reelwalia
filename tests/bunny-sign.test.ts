import { afterEach, describe, expect, it } from "vitest";
import { computeBunnyToken, directoryOf, signBunnyUrl, signBunnyVideoUrl } from "@/lib/video/bunnySign";
import { signedUrlExpiresAt, signedUrlExpiresSoon } from "@/lib/video/signed-url";
import { signStreamUrl, signThumbnailUrl, streamTtlSeconds } from "@/lib/video/stream-urls";

const KEY = "SecurityKey";
const EXPIRES = 1598024587;
const VIDEO = "0f6b2c1e-1111-4222-8333-944445555666";
const B64URL = /^[A-Za-z0-9_-]+$/;

describe("signBunnyUrl — official BunnyCDN.TokenAuthentication vectors (HS256)", () => {
  it("plain per-file token", () => {
    expect(
      signBunnyUrl({ url: "https://token-tester.b-cdn.net/300kb.jpg", securityKey: KEY, expires: EXPIRES })
    ).toBe(
      "https://token-tester.b-cdn.net/300kb.jpg?token=HS256-o10JRWlsAItyAsdKS6jJKjabHN4FrFsplDHPV1idcX4&expires=1598024587"
    );
  });

  it("token_path in query string", () => {
    expect(
      signBunnyUrl({
        url: "https://token-tester.b-cdn.net/abc/300kb.jpg",
        securityKey: KEY,
        expires: EXPIRES,
        tokenPath: "/abc",
        embedInPath: false,
      })
    ).toBe(
      "https://token-tester.b-cdn.net/abc/300kb.jpg?token=HS256-uVZvT3SbEoVKYJyDJgbcsDmSFf73cv-uNUVaJiKWpbQ&token_path=%2Fabc&expires=1598024587"
    );
  });
});

describe("signBunnyVideoUrl — Bunny Stream HLS", () => {
  // Fixtures produced by Bunny's reference nodejs/token.js signUrl().
  it("signs the video directory with a path-embedded token (HLS segments inherit it)", () => {
    expect(
      signBunnyVideoUrl({
        url: `https://vz-test.b-cdn.net/${VIDEO}/playlist.m3u8`,
        securityKey: KEY,
        expires: EXPIRES,
      })
    ).toBe(
      `https://vz-test.b-cdn.net/bcdn_token=HS256-RGCIhGfnLHawcF6ZeOdeNqKOHAhsz8w-ss2kcQ6tXu0&token_path=%2F${VIDEO}%2F&expires=1598024587/${VIDEO}/playlist.m3u8`
    );
  });

  it("signs non-HLS files (thumbnail / MP4) per file", () => {
    expect(
      signBunnyVideoUrl({
        url: `https://vz-test.b-cdn.net/${VIDEO}/thumbnail.jpg`,
        securityKey: KEY,
        expires: EXPIRES,
      })
    ).toBe(
      `https://vz-test.b-cdn.net/${VIDEO}/thumbnail.jpg?token=HS256-H8GQNUjbBO9tJKQ9Wm_-oX03SxiqMQ9fGbJkJ7j4UW0&expires=1598024587`
    );
  });

  it("directoryOf", () => {
    expect(directoryOf(`/${VIDEO}/playlist.m3u8`)).toBe(`/${VIDEO}/`);
    expect(directoryOf("/file.mp4")).toBe("/");
  });
});

describe("legacy SHA256 algorithm (base64url(sha256(key + path + expires + params)))", () => {
  // Fixtures computed independently with Python hashlib.
  it("per-file", () => {
    expect(
      computeBunnyToken({
        securityKey: KEY,
        signaturePath: "/300kb.jpg",
        expires: EXPIRES,
        signingData: "",
        algorithm: "sha256",
      })
    ).toBe("DlAr_yuteDmLE0l9_myLDuNMbGzKG67E5uBEAp3vnvw");
  });

  it("directory token includes token_path in the hash", () => {
    const url = signBunnyVideoUrl({
      url: `https://vz-test.b-cdn.net/${VIDEO}/playlist.m3u8`,
      securityKey: KEY,
      expires: EXPIRES,
      algorithm: "sha256",
    });
    expect(url).toBe(
      `https://vz-test.b-cdn.net/bcdn_token=_AKbl4HnuyUtIVr1yOD7fwTqm89us-vg4E2xSzxF8dw&token_path=%2F${VIDEO}%2F&expires=1598024587/${VIDEO}/playlist.m3u8`
    );
  });
});

describe("token format", () => {
  it("is base64url with no padding, and expires round-trips", () => {
    const url = signBunnyVideoUrl({
      url: `https://vz-test.b-cdn.net/${VIDEO}/playlist.m3u8`,
      securityKey: "another-key",
      expires: 1900000000,
    });
    const token = /bcdn_token=HS256-([^&]+)/.exec(url)?.[1] ?? "";
    expect(token).toMatch(B64URL);
    expect(token).not.toContain("=");
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(signedUrlExpiresAt(url)).toBe(1900000000);
  });

  it("never signs token/expires into the hash and ignores stale ones", () => {
    const fresh = signBunnyUrl({ url: "https://z.b-cdn.net/a.jpg", securityKey: KEY, expires: EXPIRES });
    const resigned = signBunnyUrl({
      url: "https://z.b-cdn.net/a.jpg?token=old&expires=1",
      securityKey: KEY,
      expires: EXPIRES,
    });
    expect(resigned).toBe(fresh);
  });

  it("rejects bad input", () => {
    expect(() => signBunnyUrl({ url: "https://z.b-cdn.net/a", securityKey: "", expires: EXPIRES })).toThrow();
    expect(() => signBunnyUrl({ url: "https://z.b-cdn.net/a", securityKey: KEY, expires: 1.5 })).toThrow();
  });
});

describe("signed-url helpers", () => {
  it("parses expires from path and query forms; unsigned → null", () => {
    expect(signedUrlExpiresAt("https://z/bcdn_token=x&expires=123/v/playlist.m3u8")).toBe(123);
    expect(signedUrlExpiresAt("https://z/v/a.jpg?token=x&expires=456")).toBe(456);
    expect(signedUrlExpiresAt("https://z/v/playlist.m3u8")).toBeNull();
  });

  it("expiresSoon only for signed URLs near expiry", () => {
    const now = 1_000_000_000_000;
    expect(signedUrlExpiresSoon(`https://z/a?expires=${now / 1000 + 10}`, 20, now)).toBe(true);
    expect(signedUrlExpiresSoon(`https://z/a?expires=${now / 1000 + 300}`, 20, now)).toBe(false);
    expect(signedUrlExpiresSoon("https://z/a", 20, now)).toBe(false);
  });
});

describe("stream-urls (env-driven)", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("returns the raw URL until BUNNY_TOKEN_AUTH_KEY is configured", () => {
    delete process.env.BUNNY_TOKEN_AUTH_KEY;
    const raw = `https://vz-test.b-cdn.net/${VIDEO}/playlist.m3u8`;
    expect(signStreamUrl(raw)).toEqual({ url: raw, expiresAt: null });
  });

  it("signs with a short TTL covering one watch, capped at 15 minutes", () => {
    process.env.BUNNY_TOKEN_AUTH_KEY = KEY;
    process.env.BUNNY_CDN_HOSTNAME = "vz-test.b-cdn.net";
    const nowMs = 1_700_000_000_000;
    const { url, expiresAt } = signStreamUrl(`https://vz-test.b-cdn.net/${VIDEO}/playlist.m3u8`, {
      durationSeconds: 120,
      nowMs,
    });
    expect(expiresAt).toBe(nowMs / 1000 + 300);
    expect(url).toContain("/bcdn_token=HS256-");
    expect(url).toContain(`token_path=%2F${VIDEO}%2F`);
    expect(streamTtlSeconds(600)).toBe(660);
    expect(streamTtlSeconds(5000)).toBe(900);
    expect(streamTtlSeconds(null)).toBe(300);
  });

  it("does not sign foreign hosts; thumbnails get per-file tokens", () => {
    process.env.BUNNY_TOKEN_AUTH_KEY = KEY;
    process.env.BUNNY_CDN_HOSTNAME = "vz-test.b-cdn.net";
    expect(signStreamUrl("https://example.com/v.m3u8").url).toBe("https://example.com/v.m3u8");
    const thumb = signThumbnailUrl(`https://vz-test.b-cdn.net/${VIDEO}/thumbnail.jpg`)!;
    expect(thumb).toMatch(new RegExp(`^https://vz-test.b-cdn.net/${VIDEO}/thumbnail.jpg\\?token=HS256-`));
    expect(thumb).not.toContain("token_path");
    expect(signThumbnailUrl(null)).toBeNull();
  });
});
