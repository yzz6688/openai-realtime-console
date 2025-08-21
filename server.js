import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { HttpsProxyAgent } from "https-proxy-agent";
import { request, ProxyAgent } from "undici";

// Check proxy environment variables
const proxyConfig = {
  HTTP_PROXY: process.env.HTTP_PROXY,
  HTTPS_PROXY: process.env.HTTPS_PROXY,
  NO_PROXY: process.env.NO_PROXY,
  ALL_PROXY: process.env.ALL_PROXY
};
console.log("Proxy configuration:", proxyConfig);

// Undici-based request function with proper proxy support
const makeProxyRequest = async (url, options = {}) => {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  
  if (proxy) {
    console.log("Making request through proxy:", proxy);
    // Configure undici with proxy
    const dispatcher = new ProxyAgent(proxy);
    
    const response = await request(url, {
      ...options,
      dispatcher,
    });
    
    const body = await response.body.text();
    return {
      status: response.statusCode,
      statusText: response.statusCode.toString(),
      headers: new Map(Object.entries(response.headers)),
      json: async () => JSON.parse(body),
      text: async () => body
    };
  } else {
    console.log("Making direct request (no proxy)");
    const response = await request(url, options);
    const body = await response.body.text();
    return {
      status: response.statusCode,
      statusText: response.statusCode.toString(),
      headers: new Map(Object.entries(response.headers)),
      json: async () => JSON.parse(body),
      text: async () => body
    };
  }
};

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Add JSON parsing middleware
app.use(express.json());

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

// Read prompt content from file
const getPromptInstructions = () => {
  try {
    return fs.readFileSync("./prompt.md", "utf-8");
  } catch (error) {
    console.warn("Could not read prompt.md, using default instructions:", error);
    return "You are a helpful assistant that can answer questions and help with tasks.";
  }
};

// Test route to check outbound IP
app.get("/check-ip", async (req, res) => {
  try {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
    console.log("Checking IP with proxy:", proxyUrl || "none");
    
    const response = await makeProxyRequest("https://httpbin.org/ip", {
      method: "GET"
    });
    
    const data = await response.json();
    console.log("Server outbound IP:", data.origin);
    console.log("Response status:", response.status);
    
    res.json({ 
      serverIP: data.origin,
      timestamp: new Date().toISOString(),
      usingProxy: !!proxyUrl,
      proxyUrl: proxyUrl || null,
      responseStatus: response.status
    });
  } catch (error) {
    console.error("IP check error:", error);
    res.status(500).json({ error: "Failed to check IP", details: error.message });
  }
});

// Test route to set proxy manually (for testing)
app.post("/set-proxy", (req, res) => {
  const { proxyUrl } = req.body;
  if (proxyUrl) {
    process.env.HTTPS_PROXY = proxyUrl;
    console.log("Proxy set to:", proxyUrl);
    res.json({ message: "Proxy updated", proxy: proxyUrl });
  } else {
    delete process.env.HTTPS_PROXY;
    console.log("Proxy removed");
    res.json({ message: "Proxy removed" });
  }
});

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const instructions = getPromptInstructions();
    
    console.log("Making request to OpenAI API...");
    const startTime = Date.now();
    
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
    console.log("OpenAI API request proxy:", proxyUrl || "none");
    
    const response = await makeProxyRequest("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
          // alloy, ash, ballad, coral, echo, sage, shimmer, and verse
          voice: "shimmer",
          instructions: instructions,
          turn_detection: {
            type: "server_vad",
            threshold: 0.8,
            prefix_padding_ms: 500,
            silence_duration_ms: 800,
            create_response: true,
            interrupt_response: true,
          },
        }),
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // console.log(`OpenAI API Response: ${response.status} ${response.statusText}`);
    // console.log(`Response time: ${responseTime}ms`);
    // console.log(`Response headers:`, Object.fromEntries(response.headers || new Map()));
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
