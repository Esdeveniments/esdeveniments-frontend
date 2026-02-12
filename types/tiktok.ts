/**
 * TikTok Content Posting API types.
 * Used by the "Share to TikTok" page for the Direct Post audit.
 *
 * API Reference:
 * - Creator Info: https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info/
 * - Direct Post: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post/
 */

/** Privacy level options returned by TikTok API */
export type TikTokPrivacyLevel =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

/** Display labels for privacy levels */
export const TIKTOK_PRIVACY_LABELS: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

/** Creator info from /v2/post/publish/creator_info/query/ */
export interface TikTokCreatorInfo {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: TikTokPrivacyLevel[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

/** TikTok API error shape */
export interface TikTokApiError {
  code: string;
  message: string;
  log_id?: string;
}

/** Publish init response data */
export interface TikTokPublishData {
  publish_id: string;
  upload_url?: string;
}

/** Possible publish statuses from /v2/post/publish/status/fetch/ */
export type TikTokPublishStatus =
  | "PROCESSING_UPLOAD"
  | "PROCESSING_DOWNLOAD"
  | "SEND_TO_USER_INBOX"
  | "PUBLISH_COMPLETE"
  | "FAILED";

/** Publish status response data */
export interface TikTokPublishStatusData {
  status: TikTokPublishStatus;
  fail_reason?: string;
  /** Note: TikTok's API has this typo ("publicaly") */
  publicaly_available_post_id?: string[];
}

/* -- Component prop types for the Share to TikTok page -- */

/** State machine for the ShareTikTok orchestrator */
export type ShareTikTokState =
  | "idle"
  | "authenticated"
  | "publishing"
  | "done"
  | "error";

/** Props for TikTokPostForm */
export interface TikTokPostFormProps {
  creatorInfo: TikTokCreatorInfo;
  accessToken: string;
  onPublished: (result: { publish_id: string }) => void;
  onError: (message: string) => void;
}

/** Props for TikTokStatusCheck */
export interface TikTokStatusCheckProps {
  accessToken: string;
  publishId: string;
}
