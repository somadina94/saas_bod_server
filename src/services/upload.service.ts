import crypto from "crypto";
import path from "path";
import B2 from "backblaze-b2";
import { env } from "../config/env.js";

export type UploadKind =
  | "company_logo"
  | "user_avatar"
  | "customer_doc"
  | "supplier_doc"
  | "expense_receipt"
  | "product_image";

export const uploadFile = async (params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  kind: UploadKind;
}): Promise<{ url: string; key: string }> => {
  const applicationKeyId = env.b2ApplicationKeyId?.trim();
  const applicationKey = env.b2ApplicationKey?.trim();
  const bucketId = env.b2BucketId?.trim();
  const bucketName = env.b2BucketName?.trim();
  if (!applicationKeyId || !applicationKey || !bucketId || !bucketName) {
    throw new Error(
      "B2 upload is not configured. Set B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_ID, and B2_BUCKET_NAME.",
    );
  }

  const ext = path.extname(params.originalName) || ".bin";
  const name = `${crypto.randomUUID()}${ext}`;
  const key = `${params.kind}/${name}`;
  const hash = crypto.createHash("sha1").update(params.buffer).digest("hex");

  const b2 = new B2({
    applicationKeyId,
    applicationKey,
  });
  const auth = await b2.authorize();
  const upload = await b2.getUploadUrl({ bucketId });
  await b2.uploadFile({
    uploadUrl: upload.data.uploadUrl,
    uploadAuthToken: upload.data.authorizationToken,
    fileName: key,
    data: params.buffer,
    contentLength: params.buffer.length,
    mime: params.mimeType || "b2/x-auto",
    hash,
  });

  const normalizedBase =
    env.b2PublicBaseUrl?.trim().replace(/\/$/, "") ||
    `${auth.data.downloadUrl.replace(/\/$/, "")}/file/${bucketName}`;
  const url = `${normalizedBase}/${key}`;
  return { url, key };
};
