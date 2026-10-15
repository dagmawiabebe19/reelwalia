import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMMERCIALS_BUCKET } from "@/lib/commercials/constants";
import {
  MIGRATION_MISSING_MESSAGE,
  adminError,
  gateCommercialsAdmin,
  isMissingRelation,
} from "@/lib/commercials/admin-server";
import {
  UPLOAD_KIND_LABEL,
  commercialObjectPath,
  resolveUploadType,
  type CommercialUploadKind,
} from "@/lib/commercials/object-path";

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export async function POST(request: Request) {
  const denied = await gateCommercialsAdmin();
  if (denied) return denied;

  let body: { kind?: unknown; fileName?: unknown; contentType?: unknown; size?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return adminError(400, "bad_request", "Invalid request.");
  }

  const kind = body.kind;
  if (kind !== "video" && kind !== "thumbnail") {
    return adminError(400, "bad_request", "kind must be 'video' or 'thumbnail'.");
  }
  if (typeof body.fileName !== "string" || !body.fileName.trim()) {
    return adminError(400, "bad_request", "fileName is required.");
  }

  const type = resolveUploadType(
    kind as CommercialUploadKind,
    body.fileName,
    typeof body.contentType === "string" ? body.contentType : null
  );
  if (!type) return adminError(415, "invalid_type", UPLOAD_KIND_LABEL[kind as CommercialUploadKind]);

  const admin = createAdminClient();
  const storage = admin.storage.from(COMMERCIALS_BUCKET);

  const size = typeof body.size === "number" && Number.isFinite(body.size) ? body.size : null;
  if (size != null) {
    const { data: bucket, error } = await admin.storage.getBucket(COMMERCIALS_BUCKET);
    if (error && isMissingRelation(error)) return adminError(503, "migration_missing", MIGRATION_MISSING_MESSAGE);
    const limit = bucket?.file_size_limit ?? null;
    if (limit && size > limit) {
      return adminError(
        413,
        "too_large",
        `This file is ${formatMb(size)}; the advertisements storage bucket allows up to ${formatMb(limit)}.`
      );
    }
  }

  const path = commercialObjectPath(kind as CommercialUploadKind, type.ext);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) {
    if (isMissingRelation(error)) return adminError(503, "migration_missing", MIGRATION_MISSING_MESSAGE);
    console.error("[admin/commercials] createSignedUploadUrl failed:", error?.message);
    return adminError(502, "storage_error", `Couldn't prepare the upload: ${error?.message ?? "unknown error"}`);
  }

  return NextResponse.json({
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: storage.getPublicUrl(data.path).data.publicUrl,
    contentType: type.contentType,
  });
}
