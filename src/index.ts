import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add": result = a + b; break;
					case "subtract": result = a - b; break;
					case "multiply": result = a * b; break;
					case "divide":
						if (b === 0) return {
							content: [{ type: "text", text: "Error: Cannot divide by zero" }]
						};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// MCP schema endpoint for connector creation
		if (request.method === "POST" && url.pathname === "/schema") {
			return new Response(JSON.stringify({
				schema_version: "v1",
				type: "list_tools",
				tool_specs: [],  // Tu peux générer des vrais outils ici plus tard
			}), {
				headers: { "Content-Type": "application/json" }
			});
		}

		// MCP API endpoints
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		// Fallback
		return new Response("Not found", { status: 404 });
	}
};
