'use server';

import { ApifyClient } from 'apify-client';
import { createClient } from '@/app/utils/supabase/server';
import { parseReviewDate } from '@/lib/utils';

// Define Amazon marketplace domains and their corresponding country names
const AMAZON_MARKETPLACES = [
	{ domain: 'amazon.com', country: 'United States' },
	{ domain: 'amazon.co.uk', country: 'United Kingdom' },
	{ domain: 'amazon.ca', country: 'Canada' },
	{ domain: 'amazon.fr', country: 'France' },
	{ domain: 'amazon.de', country: 'Germany (Deutschland)' },
	{ domain: 'amazon.it', country: 'Italy (Italia)' }
];

/**
 * Checks which Amazon marketplace an ASIN is available in
 * @param asin The Amazon ASIN to check
 * @returns The marketplace country where the ASIN is available, or null if not found
 */
async function checkAsinAvailability(asin: string) {
	try {
		// Create an array of promises for GET requests to each marketplace
		const checkPromises = AMAZON_MARKETPLACES.map(async (marketplace) => {
			const url = `https://www.${marketplace.domain}/dp/${asin}`;
			
			try {
				// Use fetch with GET method to check URL availability
				const response = await fetch(url, { 
					method: 'GET',
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
						'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
						'Accept-Language': 'en-US,en;q=0.9',
						'Cache-Control': 'no-cache',
						'Pragma': 'no-cache'
					},
				});
				
				console.log(`Response status for ${marketplace.domain}: ${response.status} ${response.statusText}`);

				// Check if status is 200 (OK) or 301/302 (redirected to product)
				if (response.ok || response.status === 301 || response.status === 302) {
					// For more accurate detection, we could check the response body for product-specific content
					// But for now, a successful status code is sufficient
					console.log(`ASIN ${asin} is available on ${marketplace.domain}`);
					return marketplace.country;
				}
			} catch (error) {
				console.log(`Error checking ${marketplace.domain} for ASIN ${asin}:`, error);
			}
			
			return null;
		});
		
		// Run all checks in parallel and get the first successful result
		const results = await Promise.all(checkPromises);
		const availableCountry = results.find(result => result !== null);
		
		if (availableCountry) {
			console.log(`ASIN ${asin} is available in ${availableCountry}`);
			return availableCountry;
		}
		
		console.log(`ASIN ${asin} not found in any checked marketplace`);
		return 'United States'; // Default to US if no match found
	} catch (error) {
		console.error('Error checking ASIN availability:', error);
		return 'United States'; // Default to US on error
	}
}

/**
 * Server action to fetch Amazon reviews for a product
 * @param asin The Amazon ASIN of the product to fetch reviews for
 * @param productId The ID of the product to associate reviews with
 * @param maxReviews Maximum number of reviews to fetch (default 100)
 * @returns The scraped Amazon reviews
 */
export async function getAmazonReviews(
	asin: string,
	productId: string,
	maxReviews: number = 400
) {
	try {
		// Trim the ASIN to handle spaces before or after
		const trimmedAsin = asin.trim();
		
		// Initialize the ApifyClient with your API token from environment variable
		const client = new ApifyClient({
			token: process.env.APIFY_API_TOKEN,
			maxRetries: 0,
			timeoutSecs: 480
		});

		// Create a scraping job record
		const { createScrapingJob } = await import('./scraping-jobs');
		const jobResult = await createScrapingJob({
			productId,
			source: 'amazon',
			sourceIdentifier: trimmedAsin,
		});

		// If there's already a running job, return early
		if (!jobResult.success) {
			return {
				success: false,
				error: jobResult.error,
				message: "Could not start Amazon scraping job",
				...(jobResult.jobId && { jobId: jobResult.jobId })
			};
		}

		// Check which marketplace the ASIN is available in
		const country = await checkAsinAvailability(trimmedAsin);
		console.log(`Using country ${country} for ASIN ${trimmedAsin}`);

		// Prepare the input for the scraping task
		const input = {
			"ASIN_or_URL": [trimmedAsin],
			"max_reviews": maxReviews,
    		"End_date": "1990-01-01",
			"sort_reviews_by": ["helpful","recent"],
			"filter_by_verified_purchase_only": ["all_reviews"],
			"customData": {
				"asin": trimmedAsin,
				"productId": productId
			},
			"filter_by_ratings": [
				"five_star",
				"four_star",
				"three_star",
				"two_star",
				"one_star"
			],
			"country": country,
			"Proxy configuration": {
				"useApifyProxy": false
			}
		};


		// Run the Actor asynchronously with webhook
		const runInfo = await client.actor("8vhDnIX6dStLlGVr7").start(input);

		// Update the scraping job with the actor run ID
		const supabase = createClient();
		await supabase
			.from('scraping_jobs')
			.update({
				actor_run_id: runInfo.id,
				updated_at: new Date().toISOString()
			})
			.eq('id', jobResult.jobId);

		console.log(`Started Amazon review scrape for ASIN: ${trimmedAsin} in ${country}. Run ID: ${runInfo.id}`);

		return {
			success: true,
			message: `Amazon review scraping initiated for ASIN ${trimmedAsin} in ${country}.`,
			runId: runInfo.id,
			jobId: jobResult.jobId
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
		const normalizedReviews = reviews.map(review => {
			// Generate a source_id if ParentId is missing
			// Try to use different fields to create a unique ID
			let sourceId = review.ParentId;
			
			if (!sourceId) {
				// Use a combination of fields to create a unique ID if ParentId is missing
				const reviewer = review.Reviewer || 'anonymous';
				const reviewDate = review.ReviewDate || new Date().toISOString();
				const reviewTitle = review.ReviewTitle || '';
				sourceId = `amazon-${asin}-${reviewer}-${reviewDate}-${reviewTitle}`.replace(/\s+/g, '-');
			}
			
			// Parse the review date for consistent formatting
			let reviewDate = null;
			if (review.ReviewDate) {
				try {
					// Try to parse various date formats
					const date = new Date(review.ReviewDate);
					if (!isNaN(date.getTime())) {
						reviewDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
					}
				} catch (error) {
					console.warn(`Failed to parse review date: ${review.ReviewDate}`);
				}
			}
			
			return {
				product_source: asin,
				source: 'amazon',
				source_id: sourceId,
				review_text: review.ReviewContent || '',
				review_title: review.ReviewTitle || '',
				rating: parseFloat(review.ReviewScore) || 0,
				review_date: reviewDate,
				reviewer_name: review.Reviewer || '',
				verified: review.Verified === 'True',
				source_data: review
			};
		});
		
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
