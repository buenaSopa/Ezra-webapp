'use server'

import { ApifyClient } from 'apify-client';

/**
 * Server action to fetch Trustpilot reviews for a company
 * @param companyWebsite The website of the company to fetch reviews for
 * @param filterByVerified Whether to filter reviews by verified status
 * @returns The scraped Trustpilot reviews
 */
export async function getTrustpilotReviews(
	companyWebsite: string,
	filterByVerified: boolean = true
) {
	try {
		// Initialize the ApifyClient with your API token from environment variable
		const client = new ApifyClient({
			token: process.env.APIFY_API_TOKEN,
		});

		// Prepare Actor input
		const input = {
			"companyWebsite": companyWebsite,
			"onlyExtractCompanyInformation": "false",
			"sortBy": "recency",
			"filterByStarRating": "",
			"filterByLanguage": "all",
			"filterByVerified": filterByVerified,
			"filterByCountryOfReviewers": "",
			"startFromPageNumber": 1,
			"endAtPageNumber": 1,
			"Proxy configuration": {
				"useApifyProxy": false
			}
		};

		// Run the Actor and wait for it to finish
		const run = await client.actor("l3wcDhSSC96LBRUpc").call(input);

		// Fetch Actor results from the run's dataset
		const { items } = await client.dataset(run.defaultDatasetId).listItems();

		return {
			success: true,
			data: items,
			datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
		};
	} catch (error) {
		console.error('Error fetching Trustpilot reviews:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
} 
