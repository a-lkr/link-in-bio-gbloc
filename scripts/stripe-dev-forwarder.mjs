import { spawn } from "node:child_process";
import { chmodSync, unlinkSync, writeFileSync } from "node:fs";

const secretPath = "/tmp/gbloc-stripe-cli-webhook-secret";
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error("STRIPE_SECRET_KEY is not available to the Development API environment.");
  process.exit(1);
}

try {
  unlinkSync(secretPath);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const child = spawn(
  "pnpm",
  [
    "dlx",
    "@stripe/cli@1.55.8",
    "listen",
    "--api-key",
    stripeKey,
    "--forward-to",
    "http://127.0.0.1:8080/api/billing/stripe/webhook",
    "--events",
    "checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded",
  ],
  { env: process.env, stdio: ["inherit", "pipe", "pipe"] },
);

let announcedReady = false;

function handleLine(line) {
  const signingSecret = line.match(/whsec_[A-Za-z0-9_]+/)?.[0];
  if (signingSecret) {
    writeFileSync(secretPath, signingSecret, { mode: 0o600 });
    chmodSync(secretPath, 0o600);
    if (!announcedReady) {
      announcedReady = true;
      console.log("[stripe-dev-forwarder] listener_ready; signing secret saved privately for Development.");
    }
    return;
  }

  const eventType = line.match(/-->\s*([a-z0-9_.]+)/i)?.[1];
  if (eventType) {
    console.log(`[stripe-dev-forwarder] received ${eventType}`);
    return;
  }

  const status = line.match(/<--\s*\[(\d{3})\]/)?.[1];
  if (status) {
    console.log(`[stripe-dev-forwarder] forwarded webhook HTTP ${status}`);
    return;
  }

  if (/error|fatal/i.test(line)) {
    const safeLine = line
      .replace(/whsec_[A-Za-z0-9_]+/g, "[redacted]")
      .replace(/sk_(?:test|live)_[A-Za-z0-9_]+/g, "[redacted]");
    console.error(`[stripe-dev-forwarder] ${safeLine}`);
  }
}

function consume(stream) {
  let buffered = "";
  stream.on("data", (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";
    for (const line of lines) handleLine(line);
  });
  stream.on("end", () => {
    if (buffered) handleLine(buffered);
  });
}

consume(child.stdout);
consume(child.stderr);

function removeLocalSecret() {
  try {
    unlinkSync(secretPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[stripe-dev-forwarder] could not remove temporary signing secret file");
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`[stripe-dev-forwarder] could not start CLI: ${error.message}`);
});

child.on("close", (code) => {
  removeLocalSecret();
  console.log(`[stripe-dev-forwarder] listener_stopped exit=${code ?? "unknown"}`);
  process.exitCode = code ?? 1;
});
