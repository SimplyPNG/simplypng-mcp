# simplypng-mcp

MCP server for [SimplyPNG](https://simplypng.app) background removal APIs.

Exposes SimplyPNG's background removal capabilities as [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), letting AI agents (Claude, GPT, etc.) process images programmatically without UI interaction.

## Tools

| Tool | Description |
|------|-------------|
| `estimate_credits` | Check credit cost before processing |
| `remove_background` | Remove background from a single image |
| `batch_remove_background` | Remove backgrounds from up to 50 images |
| `get_job_status` | Poll status of a single job or batch |
| `download_results` | Get signed download URL for a completed job |

## Requirements

- Node.js 18+
- A SimplyPNG API key — get one at https://simplypng.app/dashboard/api-keys

## Quickstart (Local / Claude Desktop)

```bash
git clone https://github.com/SimplyPNG/simplypng-mcp.git
cd simplypng-mcp
npm install
npm run build
```

Add to your Claude Desktop config (`%AppData%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "simplypng": {
      "command": "node",
      "args": ["C:\\path\\to\\simplypng-mcp\\build\\index.js"],
      "env": {
        "SIMPLYPNG_API_KEY": "sp_live_your_key_here"
      }
    }
  }
}
```

## Quickstart (HTTP / Remote)

```bash
SIMPLYPNG_API_KEY=sp_live_your_key_here npm run serve
# MCP endpoint: POST http://localhost:3000/mcp
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SIMPLYPNG_API_KEY` | Yes | — | Your SimplyPNG API key |
| `SIMPLYPNG_API_URL` | No | `https://simplypng.app` | Override for staging |
| `PORT` | No | `3000` | HTTP server port (HTTP transport only) |

Copy `.env.example` to `.env` and fill in your key.

## Development

```bash
npm run dev        # stdio mode via tsx (no build step)
npm run serve      # HTTP mode via tsx
npm run type-check # TypeScript check without build
npm run build      # Compile to build/
```

## Authentication

This server is a thin adapter — your API key is passed via `SIMPLYPNG_API_KEY` and forwarded as `Authorization: Bearer` to the SimplyPNG API. The server stores no credentials itself.

API keys: `sp_live_xxx` (production) or `sp_test_xxx` (testing).

## Credit Usage

| Mode | Credits per image |
|------|-------------------|
| Fast (default) | 1 credit (2500px max) |
| HD (`hdMode: true`) | 2 credits (4096px max) |

Use `estimate_credits` before processing to verify you have sufficient balance.

## License

MIT — see [LICENSE](LICENSE)
