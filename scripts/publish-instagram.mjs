const REQUIRED_ENV = [
  "IG_GRAPH_VERSION",
  "IG_USER_ID",
  "IG_ACCESS_TOKEN",
  "IG_CREATE_PARAMS_JSON",
];

const getEnvOrThrow = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const parseJsonEnv = (key, required) => {
  const raw = process.env[key];
  if (!raw) {
    if (required) {
      throw new Error(`Missing required env var: ${key}`);
    }
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${key} must be a JSON object`);
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON for ${key}: ${message}`);
  }
};

const toFormBody = (params) => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    body.set(key, String(value));
  }
  return body;
};

const requestJson = async (url, options = {}) => {
  const timeoutMs = Number(process.env.IG_REQUEST_TIMEOUT_MS ?? "10000");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response from ${url}`);
      }
    }
    if (!response.ok) {
      const message =
        (data && data.error && data.error.message) ||
        `Request failed with status ${response.status}`;
      throw new Error(message);
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
};

const waitForContainerReady = async (baseUrl, creationId) => {
  const pollMs = Number(process.env.IG_STATUS_POLL_MS ?? "5000");
  const timeoutMs = Number(process.env.IG_STATUS_TIMEOUT_MS ?? "120000");
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await requestJson(
      `${baseUrl}/${creationId}?fields=status_code`
    );
    const statusCode = status?.status_code;
    if (statusCode === "FINISHED") return;
    if (statusCode === "ERROR") {
      throw new Error("Media container failed with status ERROR");
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error("Timed out waiting for media container readiness");
};

const main = async () => {
  REQUIRED_ENV.forEach(getEnvOrThrow);

  const graphVersion = getEnvOrThrow("IG_GRAPH_VERSION");
  const igUserId = getEnvOrThrow("IG_USER_ID");
  const accessToken = getEnvOrThrow("IG_ACCESS_TOKEN");
  const createParams = parseJsonEnv("IG_CREATE_PARAMS_JSON", true);
  const publishParams = parseJsonEnv("IG_PUBLISH_PARAMS_JSON", false);

  const baseUrl = `https://graph.facebook.com/${graphVersion}`;
  const createUrl = `${baseUrl}/${igUserId}/media`;

  const createResponse = await requestJson(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: toFormBody({ ...createParams, access_token: accessToken }),
  });

  const creationId = createResponse?.id;
  if (!creationId) {
    throw new Error("Missing creation_id from /media response");
  }

  await waitForContainerReady(baseUrl, creationId);

  const publishUrl = `${baseUrl}/${igUserId}/media_publish`;
  const publishResponse = await requestJson(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: toFormBody({
      creation_id: creationId,
      access_token: accessToken,
      ...(publishParams ?? {}),
    }),
  });

  process.stdout.write(
    `Published media ID: ${publishResponse?.id ?? "unknown"}\n`
  );
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Publish failed: ${message}\n`);
  process.exit(1);
});
