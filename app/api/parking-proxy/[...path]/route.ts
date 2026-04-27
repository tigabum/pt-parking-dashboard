import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://157.180.114.86:8080/api/parking";

type Params = Promise<{ path: string[] }>;

async function handler(req: NextRequest, { params }: { params: Params }) {
    const { path: pathSegments } = await params;
    const targetPath = pathSegments.join("/");
    const search = req.nextUrl.search || "";
    const targetUrl = `${BACKEND_BASE}/${targetPath}${search}`;

    // Forward all relevant headers except hop-by-hop ones
    const forwardHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
        if (!["host", "connection", "transfer-encoding"].includes(key.toLowerCase())) {
            forwardHeaders[key] = value;
        }
    });

    let body: ArrayBuffer | undefined;
    if (!["GET", "HEAD"].includes(req.method)) {
        body = await req.arrayBuffer();
    }

    try {
        const backendRes = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            body: body ?? undefined,
        });

        const responseHeaders = new Headers();
        backendRes.headers.forEach((value, key) => {
            if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
                responseHeaders.set(key, value);
            }
        });
        // Expose x-new-token so the browser can read it for token rotation
        responseHeaders.set("Access-Control-Expose-Headers", "x-new-token");

        const responseBody = await backendRes.arrayBuffer();
        return new NextResponse(responseBody, {
            status: backendRes.status,
            statusText: backendRes.statusText,
            headers: responseHeaders,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown proxy error";
        return NextResponse.json(
            { message: `Proxy error: ${message}` },
            { status: 502 }
        );
    }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
