import { connection, NextResponse } from "next/server";

/** GET /api/v1/health : sonde de vie, sans authentification ni appel à Databricks. */
export async function GET() {
  await connection(); // répondre depuis le serveur vivant, pas depuis un fichier généré au build
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}
