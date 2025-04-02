'use server'

import { createClient } from "@/app/utils/supabase/server";
import { 
  scrapingJobs, 
  scrapingJobStatusEnum, 
  scrapingSourceEnum 
} from "@/schema/scraping_jobs";
import { eq, and } from "drizzle-orm";

/**
 * Creates a new scraping job in the database
 */
export async function createScrapingJob({
  productId,
  source,
  sourceIdentifier,
  actorRunId,
}: {
  productId: string;
  source: 'amazon' | 'trustpilot';
  sourceIdentifier: string;
  actorRunId?: string;
}) {
  try {
    const supabase = createClient();
    
    // Check if there's already a running/queued job for this source and sourceIdentifier
    const { data: existingJobs, error: queryError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('source', source)
      .eq('source_identifier', sourceIdentifier)
      .eq('status', 'running');

    if (queryError) {
      console.error("Error checking existing scraping jobs:", queryError);
      return { 
        success: false, 
        error: queryError.message 
      };
    }

    if (existingJobs && existingJobs.length > 0) {
      console.log(`Already have a running job for ${source} with identifier ${sourceIdentifier}`);
      return {
        success: false,
        error: `A scraping job for this ${source} source is already running`,
        jobId: existingJobs[0].id
      };
    }

    // Create new job
    const { data: job, error } = await supabase
      .from('scraping_jobs')
      .insert({
        product_id: productId,
        source,
        status: 'running',
        source_identifier: sourceIdentifier,
        actor_run_id: actorRunId,
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating scraping job:", error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    return { 
      success: true, 
      jobId: job?.id 
    };
  } catch (error) {
    console.error("Error in createScrapingJob:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Updates the status of a scraping job
 */
export async function updateScrapingJobStatus({
  actorRunId,
  status,
  errorMessage,
  indexedAt,
}: {
  actorRunId: string;
  status: 'completed' | 'failed' | 'indexing' | 'indexed' | 'index_failed';
  errorMessage?: string;
  indexedAt?: string;
}) {
  try {
    const supabase = createClient();
    
    // Create the update object based on status
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    // Add specific fields based on status
    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    if (status === 'indexed' || status === 'index_failed') {
      updateData.indexed_at = indexedAt || new Date().toISOString();
    }
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    const { data, error } = await supabase
      .from('scraping_jobs')
      .update(updateData)
      .eq('actor_run_id', actorRunId)
      .select()
      .single();

    if (error) {
      console.error("Error updating scraping job:", error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    return { 
      success: true, 
      jobId: data.id 
    };
  } catch (error) {
    console.error("Error in updateScrapingJobStatus:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Finds scraping jobs for a product
 */
export async function getScrapingJobsForProduct(productId: string) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching scraping jobs:", error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    return { 
      success: true, 
      jobs: data 
    };
  } catch (error) {
    console.error("Error in getScrapingJobsForProduct:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      jobs: [] 
    };
  }
}

/**
 * Gets scraping job status for a specific source and identifier
 */
export async function getScrapingJobStatus({
  source,
  sourceIdentifier,
}: {
  source: 'amazon' | 'trustpilot';
  sourceIdentifier: string;
}) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('source', source)
      .eq('source_identifier', sourceIdentifier)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching scraping job status:", error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    if (!data || data.length === 0) {
      return { 
        success: true, 
        isRunning: false,
        status: null,
        job: null
      };
    }

    return { 
      success: true, 
      isRunning: data[0].status === 'running' || data[0].status === 'queued',
      status: data[0].status,
      job: data[0]
    };
  } catch (error) {
    console.error("Error in getScrapingJobStatus:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      isRunning: false,
      status: null,
      job: null
    };
  }
} 