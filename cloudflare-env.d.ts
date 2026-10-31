declare namespace Cloudflare {
  interface Env {
    // D1 is optional until the DB binding is enabled in hosting configuration.
    DB?: D1Database;
  }
}
