import { ConnectError, getTokenResponse } from "@vercel/connect";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const linear = await getTokenResponse("linear/splitit-c0e8", {
      subject: { type: "app" },
      scopes: ["*"],
    });

    return Response.json(
      {
        linear: {
          status: "connected",
          detail: `Conector ${linear.connector.uid}`,
        },
        github: {
          status: "not-configured",
          detail: "Todavía no existe un repositorio",
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const detail =
      error instanceof ConnectError
        ? error.code ?? error.message
        : "No se pudo consultar Vercel Connect";

    return Response.json(
      {
        linear: { status: "disconnected", detail },
        github: {
          status: "not-configured",
          detail: "Todavía no existe un repositorio",
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
