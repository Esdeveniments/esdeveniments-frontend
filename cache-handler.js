const { createClient } = require("redis");

const CACHE_PREFIX = "next:cache:";
const TAG_PREFIX = "next:tag:";

function getRedisUrl() {
  const directUrl = process.env.REDIS_URL;
  if (directUrl && directUrl.trim().length > 0) {
    return directUrl;
  }

  const host = process.env.REDIS_HOST;
  if (!host) {
    return null;
  }

  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USERNAME;
  const auth = password
    ? `${username ? encodeURIComponent(username) : ""}:${encodeURIComponent(
        password
      )}@`
    : username
    ? `${encodeURIComponent(username)}@`
    : "";

  return `redis://${auth}${host}:${port}`;
}

let client;
let clientPromise;

async function getClient() {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    return null;
  }

  if (client) {
    return client;
  }

  if (!clientPromise) {
    const newClient = createClient({ url: redisUrl });
    newClient.on("error", (error) => {
      console.error("[cache-handler] Redis error:", error);
    });

    clientPromise = newClient.connect().then(() => {
      client = newClient;
      return client;
    }).catch((error) => {
      console.error("[cache-handler] Redis connection failed:", error);
      clientPromise = null;
      return null;
    });
  }

  return clientPromise;
}

function buildCacheKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

function buildTagKey(tag) {
  return `${TAG_PREFIX}${tag}`;
}

function serializeCacheValue(data) {
  if (data && Buffer.isBuffer(data.buffer)) {
    return JSON.stringify({
      ...data,
      buffer: {
        __type: "Buffer",
        data: data.buffer.toString("base64"),
      },
    });
  }

  return JSON.stringify(data);
}

function deserializeCacheValue(value) {
  if (!value) {
    return null;
  }

  const parsed = JSON.parse(value);
  if (parsed?.buffer?.__type === "Buffer") {
    parsed.buffer = Buffer.from(parsed.buffer.data, "base64");
  }

  return parsed;
}

module.exports = {
  async get(key) {
    try {
      const redisClient = await getClient();
      if (!redisClient) {
        return null;
      }
      const value = await redisClient.get(buildCacheKey(key));
      return deserializeCacheValue(value);
    } catch (error) {
      console.error("[cache-handler] get failed:", error);
      return null;
    }
  },

  async set(key, data, ctx) {
    try {
      const redisClient = await getClient();
      if (!redisClient) {
        return;
      }

      const cacheKey = buildCacheKey(key);
      const payload = serializeCacheValue(data);
      const revalidate =
        typeof data?.revalidate === "number" && Number.isFinite(data.revalidate)
          ? data.revalidate
          : null;

      // revalidate: 0 means "do not cache" in Next.js
      if (revalidate === 0) {
        return;
      }

      if (typeof revalidate === "number" && revalidate > 0) {
        const ttl = Math.max(1, Math.floor(revalidate));
        await redisClient.set(cacheKey, payload, { EX: ttl });
      } else {
        await redisClient.set(cacheKey, payload);
      }

      const tags = Array.isArray(ctx?.tags) ? ctx.tags : [];
      if (tags.length > 0) {
        const multi = redisClient.multi();
        for (const tag of tags) {
          multi.sAdd(buildTagKey(tag), cacheKey);
        }
        await multi.exec();
      }
    } catch (error) {
      console.error("[cache-handler] set failed:", error);
    }
  },

  async revalidateTag(tag) {
    try {
      const redisClient = await getClient();
      if (!redisClient) {
        return;
      }

      const tags = Array.isArray(tag) ? tag : [tag];
      if (tags.length === 0) {
        return;
      }

      // Fetch all tag members in parallel first, then build transaction atomically
      const tagKeys = tags.map((entry) => buildTagKey(entry));
      const allMembers = await Promise.all(
        tagKeys.map((key) => redisClient.sMembers(key))
      );

      const multi = redisClient.multi();
      allMembers.forEach((members, index) => {
        members.forEach((member) => multi.del(member));
        multi.del(tagKeys[index]);
      });

      await multi.exec();
    } catch (error) {
      console.error("[cache-handler] revalidateTag failed:", error);
    }
  },

  resetRequestCache() {},
};
