import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TikTokPostForm from "@components/ui/tiktok/TikTokPostForm";
import type { TikTokCreatorInfo } from "types/tiktok";

const creatorInfo: TikTokCreatorInfo = {
  creator_avatar_url: "https://example.com/a.png",
  creator_username: "user",
  creator_nickname: "User",
  privacy_level_options: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
  comment_disabled: false,
  duet_disabled: false,
  stitch_disabled: false,
  max_video_post_duration_sec: 60,
};

const checkbox = (name: RegExp) => screen.getByRole("checkbox", { name });

function renderForm() {
  render(
    <TikTokPostForm creatorInfo={creatorInfo} accessToken="t" onPublished={vi.fn()} onError={vi.fn()} />
  );
  return screen.getByRole("combobox") as HTMLSelectElement;
}

describe("TikTokPostForm", () => {
  it("turns off interactions when the video is made private", () => {
    const privacy = renderForm();
    fireEvent.change(privacy, { target: { value: "PUBLIC_TO_EVERYONE" } });
    fireEvent.click(checkbox(/allow comments/i));
    fireEvent.click(checkbox(/allow duet/i));
    fireEvent.click(checkbox(/allow stitch/i));
    expect(checkbox(/allow comments/i)).toBeChecked();

    fireEvent.change(privacy, { target: { value: "SELF_ONLY" } });
    expect(checkbox(/allow comments/i)).not.toBeChecked();
    expect(checkbox(/allow duet/i)).not.toBeChecked();
    expect(checkbox(/allow stitch/i)).not.toBeChecked();
  });

  it("clears brand options when commercial content is turned off", () => {
    renderForm();
    fireEvent.click(checkbox(/commercial content/i));
    fireEvent.click(checkbox(/your brand/i));
    fireEvent.click(checkbox(/branded content/i));
    expect(checkbox(/your brand/i)).toBeChecked();

    fireEvent.click(checkbox(/commercial content/i));
    fireEvent.click(checkbox(/commercial content/i));
    expect(checkbox(/your brand/i)).not.toBeChecked();
    expect(checkbox(/branded content/i)).not.toBeChecked();
  });
});
