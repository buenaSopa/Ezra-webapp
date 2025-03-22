'use server';

import { ApifyClient } from 'apify-client';
import { createClient } from '@/app/utils/supabase/server';

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
		// Initialize the ApifyClient with your API token from environment variable
		const client = new ApifyClient({
			token: process.env.APIFY_API_TOKEN,
		});

		const input = {
			"ASIN_or_URL": [
				asin
			],
			"filter_by_ratings": [
				"all_stars"
			],
			"max_reviews": 10,
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
			"filter_by_keywords": []
		}

		// Run the Actor with the correct Actor ID for the new scraper
		const run = await client.actor("8vhDnIX6dStLlGVr7").call(input);

		// Fetch Actor results from the run's dataset
		const { items } = await client.dataset(run.defaultDatasetId).listItems();

		console.log(`Fetched ${items.length} Amazon reviews for ASIN: ${asin}`);

		// Store reviews in database if productId is provided
		if (productId) {
			await storeAmazonReviewsInDatabase(items, productId);
		}

		return {
			success: true,
			data: items,
			fromCache: false,
			datasetUrl: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}`
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
 * @param productId The ID of the product to associate reviews with
 */
async function storeAmazonReviewsInDatabase(reviews: any[], productId: string) {
	try {
		const supabase = createClient();

		// First, delete all existing reviews for this product from Amazon
		await supabase
			.from('review_sources')
			.delete()
			.match({
				product_id: productId,
				source: 'amazon'
			});

		// Log a sample review for debugging
		if (reviews.length > 0) {
			console.log('Sample Amazon review:', JSON.stringify(reviews[0], null, 2));
		}

		// Normalize and prepare the reviews for insertion based on the new output format
		const normalizedReviews = reviews.map(review => ({
			product_id: productId,
			source: 'amazon',
			source_id: review.ParentId || `amazon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			review_text: review.ReviewContent || '',
			review_title: review.ReviewTitle || '',
			rating: parseFloat(review.ReviewScore) || 0,
			review_date: review.ReviewDate || '',
			reviewer_name: review.Reviewer || 'Anonymous',
			verified: (review.Verified === 'True') || false,
			source_data: {
				...review,
				// Extract URLs from the new format for easier access
				productUrl: review.ProductLink,
				asin: review.ASIN,
				productTitle: review.ProductTitle,
				brand: review.Brand,
				images: review.Images || [],
				variant: review.Variant || [],
				helpfulCount: review.HelpfulCounts
			}
		}));

		// Insert the normalized reviews
		if (normalizedReviews.length > 0) {
			const { error } = await supabase
				.from('review_sources')
				.insert(normalizedReviews);

			if (error) {
				console.error('Error storing Amazon reviews in database:', error);
				throw error;
			}

			console.log(`Successfully stored ${normalizedReviews.length} Amazon reviews for product ${productId}`);
		} else {
			console.log('No Amazon reviews found to store');
		}

	} catch (error) {
		console.error('Error in storeAmazonReviewsInDatabase:', error);
		throw error;
	}
} 
