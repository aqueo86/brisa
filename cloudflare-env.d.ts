declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    GOOGLE_DRIVE_CLIENT_ID?: string;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    BUCKET?: R2Bucket;
  }
}
