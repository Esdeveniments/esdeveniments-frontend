// import axios, { AxiosResponse } from "axios";
// import { getAuthToken } from "@lib/auth";
// import { captureException } from "@sentry/nextjs";

// interface SearchAnalyticsRow {
//   clicks: number;
//   impressions: number;
//   ctr: number;
//   position: number;
//   keys: string[];
// }

// interface SearchAnalyticsResponse {
//   rows?: SearchAnalyticsRow[];
// }

// /**
//  * Fetches keyword performance data from Google Search Console.
//  *
//  * @param {string} siteUrl - The URL of the site to query.
//  * @param {string} startDate - The start date for the query in YYYY-MM-DD format.
//  * @param {string} endDate - The end date for the query in YYYY-MM-DD format.
//  * @param {Array<string>} dimensions - The dimensions to query (e.g., ["query"]).
//  * @param {number} rowLimit - The maximum number of rows to return.
//  * @returns {Promise<SearchAnalyticsRow[]>} - An array of keyword performance data.
//  */
// export async function fetchKeywordPerformance(
//   siteUrl: string,
//   startDate: string,
//   endDate: string,
//   dimensions: string[] = ["query", "page"],
//   rowLimit: number = 1000
// ): Promise<SearchAnalyticsRow[]> {
//   try {
//     const encodedSiteUrl = encodeURIComponent(siteUrl);
//     console.log(`Fetching keyword performance for site: ${siteUrl}`);

//     const accessToken = await getAuthToken("webmasters.readonly");
//     const response: AxiosResponse<SearchAnalyticsResponse> = await axios.post(
//       `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
//       {
//         startDate,
//         endDate,
//         dimensions,
//         rowLimit,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log(`API Response Status: ${response.status}`);
//     console.log(`API Response Data:`, response.data);

//     return response.data.rows || [];
//   } catch (error: any) {
//     console.error("Full error response:", error.response?.data);
//     const errorMessage = `Error fetching keyword performance data: ${
//       error.response?.data?.error?.message || error.message
//     }`;
//     captureException(new Error(errorMessage));
//     throw new Error("Failed to fetch keyword performance data.");
//   }
// }
