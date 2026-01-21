## Remotion marketing videos (CI render + S3/CDN)

This folder contains Remotion compositions for:
- Weekly highlights (top events)
- City spotlight (events for one town/city)

### Setup
1. Install dependencies in this folder:
   - `yarn install`
2. Start the Remotion Studio:
   - `yarn studio`

### Rendering
Sample data lives in `remotion/data/`.

Commands:
- `yarn render:weekly`
- `yarn render:city`

Outputs go to `remotion/out/`.

### Assets
`imageUrl` can be:
- A remote URL (`https://...`) with CORS enabled
- A local file path under `remotion/public/` (e.g. `imageUrl: "covers/01.jpg"`)

Local assets are resolved using `staticFile()` in the compositions.

### CI flow (S3/CDN)
Typical CI steps:
1. Update JSON input for the week or city.
2. Run the render command.
3. Upload the MP4 to S3/CDN (example: `aws s3 cp remotion/out/weekly-highlights.mp4 s3://YOUR_BUCKET/...`).

### Instagram Graph API publishing
Publishing is automated via `scripts/publish-instagram.mjs` (root `scripts/`).
This script is intentionally generic and expects explicit inputs from the official docs:
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing/
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish/

Required environment variables:
- `IG_GRAPH_VERSION` (e.g. `v20.0`)
- `IG_USER_ID`
- `IG_ACCESS_TOKEN`
- `IG_CREATE_PARAMS_JSON` (JSON string with fields required by `/media` per docs)

Optional environment variables:
- `IG_PUBLISH_PARAMS_JSON` (JSON string for extra publish fields)
- `IG_STATUS_POLL_MS` and `IG_STATUS_TIMEOUT_MS`
