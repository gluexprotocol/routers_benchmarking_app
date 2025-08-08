import crypto from "crypto";

export const etagFor = (body: any) => {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  return crypto.createHash("sha1").update(json).digest("hex");
};
