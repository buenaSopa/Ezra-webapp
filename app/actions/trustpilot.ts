'use server'

import { ApifyClient } from 'apify-client';
import { createClient } from '@/app/utils/supabase/server';
import { parseReviewDate } from '@/lib/utils';

export interface TrustpilotReview {
	companyPageUrl: string;
	reviewId: string;
	companyName: string;
	businessUnitId: string;
	reviewUrl: string;
	reviewDate: string;
	reviewDateOfExperience: string;
	reviewLabel: string;
	isReviewVerified: boolean;
	reviewer: string;
	reviewTitle: string;
	reviewDescription: string;
	reviewRatingScore: number;
	reviewersCountry: string;
	reviewLanguage: string;
	reviewCompanyResponse: string;
	scrapedDateTime: string;
	scrapedAtReviewPageNumber: number;
}

/**
 * Server action to initiate Trustpilot review scraping via Apify
 * @param companyWebsite The website of the company to fetch reviews for
 * @param productId The ID of the product associated with the review scraping
 * @returns Object containing success status and run information
 */
export async function startTrustpilotReviewScraping(companyWebsite: string, productId: string) {
	try {
		// Initialize the ApifyClient
		const client = new ApifyClient({
			token: process.env.APIFY_API_TOKEN,
			maxRetries: 0,
			timeoutSecs: 600
		});

		// Extract domain from URL for product_source
		let domain = companyWebsite;
		try {
			const url = new URL(domain);
			domain = url.hostname;
		} catch (error) {
			console.warn("Failed to parse URL for domain extraction:", error);
		}

		// Create a scraping job record
		const { createScrapingJob } = await import('./scraping-jobs');
		const jobResult = await createScrapingJob({
			productId,
			source: 'trustpilot',
			sourceIdentifier: domain,
		});

		// If there's already a running job, return early
		if (!jobResult.success) {
			return {
				success: false,
				error: jobResult.error,
				message: "Could not start Trustpilot scraping job",
				...(jobResult.jobId && { jobId: jobResult.jobId })
			};
		}

		// Prepare Actor input
		const input = {
			"companyWebsite": companyWebsite,
			"onlyExtractCompanyInformation": "false",
			"sortBy": "recency",
			"filterByStarRating": "",
			"filterByLanguage": "all",
			"filterByVerified": false,
			"filterByCountryOfReviewers": "",
			"startFromPageNumber": 1,
			"endAtPageNumber": 20,
			"customData": {
				"companyWebsite": domain,
				"productId": productId
			},
			"Proxy configuration": {
				"useApifyProxy": false
			}
		};

		// Start the Apify actor run
		const runInfo = await client.actor("l3wcDhSSC96LBRUpc").start(input);

		// Update the scraping job with the actor run ID
		const supabase = createClient();
		await supabase
			.from('scraping_jobs')
			.update({
				actor_run_id: runInfo.id,
				updated_at: new Date().toISOString()
			})
			.eq('id', jobResult.jobId);

		console.log(`Started Trustpilot review scrape for URL ${companyWebsite}. Run ID: ${runInfo.id}`);

		return {
			success: true,
			message: `Trustpilot review scraping initiated for URL ${companyWebsite}.`,
			runId: runInfo.id,
			jobId: jobResult.jobId
		};
	} catch (error) {
		console.error('Error starting Trustpilot review scrape:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred starting scrape'
		};
	}
}

/**
 * Stores Trustpilot reviews in the database using the new schema
 * @param reviews The raw Trustpilot reviews from Apify
 * @param companyDomain The domain of the company (used as product_source)
 */
export async function storeTrustpilotReviews(reviews: TrustpilotReview[], companyDomain: string) {
	try {
		const supabase = createClient();
		
		// First, delete all existing reviews for this source
		await supabase
			.from('review_sources')
			.delete()
			.match({ 
				product_source: companyDomain,
				source: 'trustpilot'
			});
		
		// Log a sample review for debugging
		if (reviews.length > 0) {
			console.log('Sample Trustpilot review:', JSON.stringify(reviews[0], null, 2));
		}
		
		// Normalize and prepare the reviews for insertion
		const normalizedReviews = reviews.map(review => {
			const parsedDate = parseReviewDate(review.reviewDate, 'trustpilot');
			
			return {
				product_source: companyDomain,
				source: 'trustpilot',
				source_id: review.reviewId,
				review_text: review.reviewDescription || '',
				review_title: review.reviewTitle || '',
				rating: review.reviewRatingScore,
				review_date: parsedDate ? parsedDate.toISOString().split('T')[0] : null,
				reviewer_name: review.reviewer || '',
				verified: review.isReviewVerified || false,
				source_data: review
			};
		});
		
		// Insert the normalized reviews
		const { error } = await supabase
			.from('review_sources')
			.insert(normalizedReviews);
			
		if (error) {
			console.error('Error storing Trustpilot reviews in database:', error);
			throw error;
		}
		
		console.log(`Successfully stored ${normalizedReviews.length} Trustpilot reviews for domain ${companyDomain}`);
		
	} catch (error) {
		console.error('Error in storeTrustpilotReviews:', error);
		throw error;
	}
} 
