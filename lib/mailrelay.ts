const API_BASE = process.env.MAILRELAY_API_URL;
const API_KEY = process.env.MAILRELAY_API_KEY;

if (!API_BASE || !API_KEY) {
  console.warn("Mailrelay configuration missing.");
}

const headers = {
  "X-AUTH-TOKEN": API_KEY || "",
  "Content-Type": "application/json",
  Accept: "application/json",
};

type MailrelayListResponse<T> = T[] | { data?: T[] } | { items?: T[] };

// Generic fetch wrapper for Mailrelay API v1
async function fetchMR(endpoint: string, options: RequestInit = {}) {
  if (!API_BASE) {
    throw new Error("MAILRELAY_API_URL is not configured");
  }

  const url = `${API_BASE}/api/v1${endpoint}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mailrelay API Error ${res.status}: ${text}`);
  }
  return res.json();
}

function extractList<T>(response: MailrelayListResponse<T>): T[] {
  if (Array.isArray(response)) return response;
  if (response && "data" in response && Array.isArray(response.data)) {
    return response.data;
  }
  if (response && "items" in response && Array.isArray(response.items)) {
    return response.items;
  }
  return [];
}

// 1. Get or Create Group
export async function getOrCreateGroup(
  name: string,
  description: string
): Promise<number> {
  try {
    // Try a direct lookup by name (best effort; server may ignore filters)
    const groupsResponse = await fetchMR(
      `/groups?name=${encodeURIComponent(name)}`
    ).catch(() => null);
    const groups = groupsResponse ? extractList(groupsResponse) : [];
    const existing = groups.find(
      (group: { name?: string }) =>
        typeof group?.name === "string" &&
        group.name.toLowerCase() === name.toLowerCase()
    );
    if (existing && (existing as { id?: number }).id != null) {
      return (existing as { id: number }).id;
    }

    // Create group
    const newGroup = await fetchMR("/groups", {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        enabled: true,
      }),
    });
    return newGroup.id;
  } catch (e) {
    console.error("Error in getOrCreateGroup:", e);
    throw e;
  }
}

// 2. Get Valid Sender
async function getSenderId(): Promise<number> {
  if (process.env.MAILRELAY_SENDER_ID) {
    return parseInt(process.env.MAILRELAY_SENDER_ID, 10);
  }
  const sendersResponse = await fetchMR("/senders");
  const senders = extractList<{
    id: number;
    enabled?: boolean;
    status?: string;
  }>(sendersResponse);
  const activeSender =
    senders.find((sender) => sender.enabled !== false) ?? senders[0];
  if (!activeSender) {
    throw new Error("No active senders found.");
  }
  return activeSender.id;
}

// 3. Ensure RSS Campaign Exists
// This is the key: If we create a group for "Barcelona - Today", we MUST ensure there's a campaign sending to it.
export async function ensureRSSCampaign(
  groupId: number,
  groupName: string,
  rssUrl: string
) {
  const campaignSubject = `Agenda: ${groupName}`;

  try {
    // Check for existing campaign by subject (best effort)
    const campaignsResponse = await fetchMR(
      `/rss_campaigns?subject=${encodeURIComponent(campaignSubject)}`
    ).catch(() => null);
    const campaigns = campaignsResponse
      ? extractList<{ id?: number; subject?: string }>(campaignsResponse)
      : [];
    const existing = campaigns.find(
      (campaign) =>
        typeof campaign?.subject === "string" &&
        campaign.subject.toLowerCase() === campaignSubject.toLowerCase()
    );
    if (existing) return; // Already exists

    const senderId = await getSenderId();

    // Basic Template
    const htmlBody = `
      <html>
        <body>
          <h2>${groupName}</h2>
          <p>Aquí tens els esdeveniments destacats:</p>
          <hr />
          {% rss_loop %}
            <h3><a href="{{ rss_entry.url }}">{{ rss_entry.title }}</a></h3>
            <p>{{ rss_entry.description }}</p>
            <p><strong>Data:</strong> {{ rss_entry.date }}</p>
            <br/>
          {% endrss_loop %}
          <hr />
          <p><small><a href="{{ unsubscribe_url }}">Donar-se de baixa</a></small></p>
        </body>
      </html>
    `;

    await fetchMR("/rss_campaigns", {
      method: "POST",
      body: JSON.stringify({
        subject: campaignSubject,
        sender_id: senderId,
        groups: [groupId],
        url: rssUrl,
        html: htmlBody,
        frequency: "daily", // Default to daily checks
        status: "active",
      }),
    });
    console.log(`Auto-created RSS campaign for: ${groupName}`);
  } catch (e) {
    console.error(`Failed to create RSS Campaign for ${groupName}`, e);
    // Don't crash the subscription request if automation fails
  }
}

// 4. Add/Update Subscriber (via official sync endpoint)
export async function addSubscriber(email: string, groupId: number) {
  try {
    await fetchMR("/subscribers/sync", {
      method: "POST",
      body: JSON.stringify({
        email,
        status: "active",
        groups: [groupId],
      }),
    });
    return { success: true };
  } catch (e) {
    console.error("Error adding subscriber:", e);
    return { success: false, error: e };
  }
}
