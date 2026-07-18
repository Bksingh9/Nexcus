export function GET() {
  return Response.json({
    status: "ok",
    service: "nexcus",
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
