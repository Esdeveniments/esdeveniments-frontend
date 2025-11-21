import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateGroup, ensureRSSCampaign, addSubscriber } from "@lib/mailrelay";
import { siteUrl } from "@config/index";

const SubscribeSchema = z.object({
  email: z.string().email(),
  place: z.string().optional().default(""), // slug: barcelona
  placeLabel: z.string().optional().default("Catalunya"), // label: Barcelona
  category: z.string().optional().default(""), // slug: teatre
  categoryLabel: z.string().optional().default(""), // label: Teatre
  byDate: z.string().optional().default(""), // slug: avui
  byDateLabel: z.string().optional().default(""), // label: Avui
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      place,
      placeLabel,
      category,
      categoryLabel,
      byDate,
      byDateLabel,
    } = SubscribeSchema.parse(body);

    // 1. Build descriptive Group Name
    // Example: "Esdeveniments - Barcelona - Avui - Teatre"
    const parts = ["Esdeveniments", placeLabel, byDateLabel, categoryLabel].filter(
      Boolean
    );

    const groupName = parts.join(" - ");
    const groupDesc = `Auto: place=${place}, date=${byDate}, cat=${category}`;

    // 2. Build RSS URL
    const rssUrl = new URL(`${siteUrl}/rss.xml`);
    if (place) rssUrl.searchParams.set("town", place); // Assuming town parameter for simplicity, adapt if region needed
    if (category) rssUrl.searchParams.set("category", category);
    if (byDate) rssUrl.searchParams.set("byDate", byDate);

    // 3. Infrastructure Automation
    const groupId = await getOrCreateGroup(groupName, groupDesc);
    await ensureRSSCampaign(groupId, groupName, rssUrl.toString());

    // 4. Subscribe User
    const result = await addSubscriber(email, groupId);

    if (!result.success) {
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
