'use server';

import { ApifyClient } from 'apify-client';
import { createClient } from '@/app/utils/supabase/server';
import { parseReviewDate } from '@/lib/utils';

/**
 * Server action to fetch Amazon reviews for a product
 * @param asin The Amazon ASIN of the product to fetch reviews for
 * @param productId The ID of the product to associate reviews with
 * @param maxReviews Maximum number of reviews to fetch (default 100)
 * @returns The scraped Amazon reviews
 */
export async function getAmazonReviews(
	asin: string,
	productId?: string,
	maxReviews: number = 10
) {
	try {
		// Trim the ASIN to handle spaces before or after
		const trimmedAsin = asin.trim();
		
		// Initialize the ApifyClient with your API token from environment variable
		const client = new ApifyClient({
			token: process.env.APIFY_API_TOKEN,
		});

		const input = {
			"ASIN_or_URL": [
				trimmedAsin
			],
			"filter_by_ratings": [
				"all_stars"
			],
			"max_reviews": maxReviews,
			"unique_only": false,
			"country": "United States",
			"End_date": "1990-01-01",
			"sort_reviews_by": [
				"helpful",
				"recent"
			],
			"filter_by_verified_purchase_only": [
				"all_reviews",
				"avp_only_reviews"
			],
			"filter_by_mediaType": [
				"all_contents",
				"media_reviews_only"
			],
			"filter_by_keywords": [],
			"customData": {
				"asin": trimmedAsin,
				"productId": productId
			}
		};

		// Set up the webhook for when the run succeeds
		const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/apify`;
		console.log(`Setting up webhook to: ${webhookUrl}`);

		// Run the Actor asynchronously with webhook
		const runInfo = await client.actor("8vhDnIX6dStLlGVr7").start(input, {
			webhooks: [{
				eventTypes: ["ACTOR.RUN.SUCCEEDED"],
				requestUrl: webhookUrl
			}]
		});

		console.log(`Started Amazon review scrape for ASIN: ${trimmedAsin}. Run ID: ${runInfo.id}`);

		return {
			success: true,
			message: `Amazon review scraping initiated for ASIN ${trimmedAsin}.`,
			runId: runInfo.id
		};
	} catch (error) {
		console.error('Error fetching Amazon reviews:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
			fromCache: false
		};
	}
}

/**
 * Normalizes and stores Amazon reviews in the database
 * @param reviews The raw Amazon reviews from Apify
 * @param asin The Amazon ASIN (productSource)
 * @param productId Optional product ID for updating last_reviews_scraped_at
 */
export async function storeAmazonReviewsInDatabase(reviews: any[], asin: string, productId?: string) {
	try {
		const supabase = createClient();
		
		// First, delete all existing reviews for this source
		await supabase
			.from('review_sources')
			.delete()
			.match({ 
				product_source: asin,
				source: 'amazon'
			});
		
		// Log a sample review for debugging
		if (reviews.length > 0) {
			console.log('Sample Amazon review:', JSON.stringify(reviews[0], null, 2));
		}
		
		// Normalize and prepare the reviews for insertion
		const normalizedReviews = reviews.map(review => ({
			product_source: asin,
			source: 'amazon',
			source_id: review.ReviewId,
			review_text: review.ReviewText || '',
			review_title: review.ReviewTitle || '',
			rating: review.Rating,
			review_date: review.ReviewDate,
			reviewer_name: review.Reviewer || '',
			verified: review.Verified === 'True',
			source_data: review
		}));
		
		// Insert the normalized reviews
		const { error } = await supabase
			.from('review_sources')
			.insert(normalizedReviews);
			
		if (error) {
			console.error('Error storing Amazon reviews in database:', error);
			throw error;
		}
		
		console.log(`Successfully stored ${normalizedReviews.length} Amazon reviews for ASIN ${asin}`);
		
		// If a product ID was provided, update its last_reviews_scraped_at
		if (productId) {
			await supabase
				.from('products')
				.update({ last_reviews_scraped_at: new Date().toISOString() })
				.eq('id', productId);
		}
		
	} catch (error) {
		console.error('Error in storeAmazonReviewsInDatabase:', error);
		throw error;
	}
} 
