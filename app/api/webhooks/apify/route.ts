import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { storeTrustpilotReviews, TrustpilotReview } from '@/app/actions/trustpilot';
import { storeAmazonReviewsInDatabase } from '@/app/actions/amazon';
import { indexProductReviewsAction } from '@/app/actions/indexing-actions';
import crypto from 'crypto';

// Constants
const APIFY_CLIENT = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
const WEBHOOK_SECRET = process.env.APIFY_WEBHOOK_SECRET;

// Actor IDs
const ACTORS = {
  TRUSTPILOT: "l3wcDhSSC96LBRUpc",
  AMAZON: "8vhDnIX6dStLlGVr7"
} as const;

export async function POST(request: NextRequest) {
  console.log("Received Apify webhook request");

  // 1. Parse and validate the payload
  let payload: any;
  try {
    const text = await request.text();
    console.log("Raw webhook payload:", text);
    
    try {
      payload = JSON.parse(text);
      console.log("Webhook payload:", JSON.stringify(payload, null, 2));
    } catch (e) {
      console.error("Failed to parse webhook payload as JSON:", e);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    // 2. Verify webhook signature if secret is set
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-apify-webhook-signature');
      if (!signature) {
        console.error("Missing webhook signature");
        return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
      }

      const hash = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(text)
        .digest('hex');

      if (hash !== signature) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn("APIFY_WEBHOOK_SECRET not set - skipping signature verification");
    }
  } catch (error) {
    console.error("Failed to process webhook request:", error);
    return NextResponse.json({ error: 'Failed to process webhook request' }, { status: 400 });
  }

  // 3. Validate event type
  if (payload.eventType !== 'ACTOR.RUN.SUCCEEDED') {
    console.log(`Ignoring event type: ${payload.eventType}`);
    return NextResponse.json({ message: 'Event type not processed' }, { status: 200 });
  }

  // 4. Extract necessary data from payload
  // The resource contains the actual run data
  const resource = payload.resource;
  const actorId = resource?.actId;
  const datasetId = resource?.defaultDatasetId;
  const keyValueStoreId = resource?.defaultKeyValueStoreId;

  console.log("Extracted data:", { actorId, datasetId, keyValueStoreId });

  if (!actorId || !datasetId || !keyValueStoreId) {
    console.error("Missing required data:", { actorId, datasetId, keyValueStoreId });
    return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
  }

  // 5. Fetch dataset items
  console.log(`Fetching dataset ${datasetId}...`);
  let items;
  try {
    const result = await APIFY_CLIENT.dataset(datasetId).listItems();
    items = result.items;
    console.log(`Fetched ${items.length} items from dataset`);
    } catch (error) {
    console.error("Failed to fetch dataset:", error);
    return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 });
  }

  if (!items?.length) {
    console.log("No items in dataset");
    return NextResponse.json({ message: 'No items to process' }, { status: 200 });
  }

  // Import the scraping jobs functions
  const { updateScrapingJobStatus } = await import('@/app/actions/scraping-jobs');

  // 6. Process based on actor type
  try {
    let productId: string | null = null;
    
    switch (actorId) {
      case ACTORS.TRUSTPILOT: {
        // Fetch the original input with customData from key-value store
        console.log(`Fetching input from key-value store ${keyValueStoreId}...`);
        const input = await APIFY_CLIENT.keyValueStore(keyValueStoreId).getRecord('INPUT') as any;
        
        if (!input || !input.value) {
          throw new Error("Failed to fetch input from key-value store");
        }
        
        console.log("Input from key-value store:", JSON.stringify(input.value, null, 2));
        
        // Extract companyWebsite and productId from input
        const companyWebsite = input.value.customData?.companyWebsite;
        productId = input.value.customData?.productId;
        
        if (!companyWebsite) {
          throw new Error("Missing companyWebsite in input customData");
        }
        
        if (!productId) {
          throw new Error("Missing productId in input customData");
        }
        
        console.log(`Processing Trustpilot reviews for ${companyWebsite}, productId: ${productId}`);
        
        // Extract domain from URL for storage
        let domain = companyWebsite;
        try {
          domain = new URL(companyWebsite);
        } catch (error) {
          console.error("Error extracting domain from URL:", error);
        }
        
        // Store the reviews
        await storeTrustpilotReviews(items as unknown as TrustpilotReview[], domain);
        
        // Update the scraping job status to indexing
        await updateScrapingJobStatus({
          actorRunId: resource.id,
          status: 'indexing'
        });
        
        // Now trigger indexing
        console.log(`Starting RAG indexing for productId: ${productId}`);
        const indexingResult = await indexProductReviewsAction(productId);
        console.log('Indexing result:', indexingResult);
        
        // Update the job status based on indexing result
        if (indexingResult.success) {
          await updateScrapingJobStatus({
            actorRunId: resource.id,
            status: 'indexed',
            indexedAt: new Date().toISOString()
          });
        } else {
          await updateScrapingJobStatus({
            actorRunId: resource.id,
            status: 'index_failed',
            errorMessage: indexingResult.error || 'Unknown error during indexing'
          });
        }
        
        break;
      }
      
      case ACTORS.AMAZON: {
        // Fetch the original input with customData from key-value store
        console.log(`Fetching input from key-value store ${keyValueStoreId}...`);
        const input = await APIFY_CLIENT.keyValueStore(keyValueStoreId).getRecord('INPUT') as any;
        
        if (!input || !input.value) {
          throw new Error("Failed to fetch input from key-value store");
        }
        
        console.log("Input from key-value store:", JSON.stringify(input.value, null, 2));
        
        // Extract ASIN and productId from input
        let asin;
        if (input.value.customData?.asin) {
          asin = input.value.customData.asin;
        } else if (input.value.ASIN_or_URL && input.value.ASIN_or_URL.length > 0) {
          asin = input.value.ASIN_or_URL[0];
          // If it's a URL, try to extract ASIN
          if (asin.includes('/')) {
            const matches = asin.match(/\/([A-Z0-9]{10})(?:\/|\?|$)/);
            if (matches && matches[1]) {
              asin = matches[1];
            }
          }
        }
        
        productId = input.value.customData?.productId;
        
        if (!asin) {
          throw new Error("Missing ASIN in input");
        }
        
        if (!productId) {
          throw new Error("Missing productId in input customData");
        }
        
        console.log(`Processing Amazon reviews for ASIN ${asin}, productId: ${productId}`);
        
        // Store the reviews
        await storeAmazonReviewsInDatabase(items, asin);
        
        // Update the scraping job status to indexing
        await updateScrapingJobStatus({
          actorRunId: resource.id,
          status: 'indexing'
        });
        
        // Now trigger indexing
        console.log(`Starting RAG indexing for productId: ${productId}`);
        const indexingResult = await indexProductReviewsAction(productId);
        console.log('Indexing result:', indexingResult);
        
        // Update the job status based on indexing result
        if (indexingResult.success) {
          await updateScrapingJobStatus({
            actorRunId: resource.id,
            status: 'indexed',
            indexedAt: new Date().toISOString()
          });
        } else {
          await updateScrapingJobStatus({
            actorRunId: resource.id,
            status: 'index_failed',
            errorMessage: indexingResult.error || 'Unknown error during indexing'
          });
        }
        
        break;
      }

      default:
        throw new Error(`Unknown actor ID: ${actorId}`);
    }

    return NextResponse.json({
      message: 'Successfully processed webhook and indexed reviews',
      processed: items.length
    }, { status: 200 });

  } catch (error) {
    console.error("Failed to process reviews:", error);
    
    // Update the scraping job status to failed
    try {
      await updateScrapingJobStatus({
        actorRunId: resource?.id,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error processing reviews'
      });
    } catch (updateError) {
      console.error("Error updating scraping job status:", updateError);
    }
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error processing reviews'
    }, { status: 500 });
  }
}