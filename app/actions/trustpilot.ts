'use server'

import { ApifyClient } from 'apify-client';
import { createClient } from '@/app/utils/supabase/server';
import { reviewSources } from '@/schema/review_sources';
import { products } from '@/schema/products';
import { parseReviewDate } from '@/lib/utils';

/**
 * Server action to fetch Trustpilot reviews for a company
 * @param companyWebsite The website of the company to fetch reviews for
 * @param productId The ID of the product to associate reviews with
 * @param filterByVerified Whether to filter reviews by verified status
 * @param forceRefresh Force a fresh scrape regardless of cache status
 * @returns The scraped Trustpilot reviews
 */
export async function getTrustpilotReviews(
	companyWebsite: string,
	productId?: string,
	filterByVerified: boolean = true,
	forceRefresh: boolean = false
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

		// Store reviews in database if productId is provided
		if (productId) {
			await storeReviewsInDatabase(items, productId);
		}

		return {
			success: true,
			data: items,
			fromCache: false,
			datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
		};
	} catch (error) {
		console.error('Error fetching Trustpilot reviews:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
			fromCache: false
		};
	}
}

/**
 * Normalizes and stores Trustpilot reviews in the database
 * @param reviews The raw Trustpilot reviews from Apify
 * @param productId The ID of the product to associate reviews with
 */
async function storeReviewsInDatabase(reviews: any[], productId: string) {
	try {
		const supabase = createClient();
		
		// First, delete all existing reviews for this product from Trustpilot
		// This implements the "delete and replace" approach we agreed on
		await supabase
			.from('review_sources')
			.delete()
			.match({ 
				product_id: productId,
				source: 'trustpilot'
			});
		
		// Log a sample review date for debugging
		if (reviews.length > 0) {
			console.log('Sample review date format:', reviews[0].reviewDate);
			console.log('Sample review object:', JSON.stringify(reviews[0], null, 2));
		}
		
		// Normalize and prepare the reviews for insertion
		const normalizedReviews = reviews.map(review => {
			// Parse the date string into a proper Date object
			const parsedDate = parseReviewDate(review.reviewDate, 'trustpilot');
			
			return {
				productId: productId, // Use TypeScript camelCase property names
				source: 'trustpilot',
				sourceId: review.reviewId,
				reviewText: review.reviewDescription || '',
				reviewTitle: review.reviewTitle || '',
				rating: review.reviewRatingScore,
				// Store as a standardized date
				reviewDate: parsedDate ? parsedDate.toISOString().split('T')[0] : null, // YYYY-MM-DD format
				reviewerName: review.reviewer || '',
				verified: review.isReviewVerified || false,
				sourceData: review
			};
		});
		
		// However, with direct Supabase queries, we need to use the database column names
		const { error } = await supabase
			.from('review_sources')
			.insert(normalizedReviews.map(review => ({
				product_id: review.productId,
				source: review.source,
				source_id: review.sourceId,
				review_text: review.reviewText,
				review_title: review.reviewTitle,
				rating: review.rating,
				review_date: review.reviewDate,
				reviewer_name: review.reviewerName,
				verified: review.verified,
				source_data: review.sourceData
			})));
			
		if (error) {
			console.error('Error storing reviews in database:', error);
			throw error;
		}
		
		console.log(`Successfully stored ${normalizedReviews.length} Trustpilot reviews for product ${productId}`);
		
	} catch (error) {
		console.error('Error in storeReviewsInDatabase:', error);
		throw error;
	}
} 
