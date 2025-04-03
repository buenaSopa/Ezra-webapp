import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default async function HelpPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-4">Help Center</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Find answers to common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I add a new product?</AccordionTrigger>
                <AccordionContent>
                  You can add a new product by clicking the "+" button next to Products in the sidebar, 
                  or by clicking the "Add Product" button on the Products page. Enter the product name 
                  and optionally add a description, URL, and Amazon ASIN.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger>How do I scrape reviews for my product?</AccordionTrigger>
                <AccordionContent>
                  After adding a product with a URL or Amazon ASIN, navigate to the product page and 
                  click the "Refresh Reviews" button. The system will automatically scrape reviews 
                  from Trustpilot and/or Amazon based on the information you provided.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger>How do I start a new chat about my product?</AccordionTrigger>
                <AccordionContent>
                  Navigate to your product page and click the "Chat" tab. From there you can start a new 
                  conversation. You can also use the chat feature to analyze reviews, generate marketing angles, 
                  and create ad copy.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4">
                <AccordionTrigger>What should I do if review scraping fails?</AccordionTrigger>
                <AccordionContent>
                  If review scraping fails, first check that you've entered the correct URL or Amazon ASIN. 
                  For Trustpilot, ensure the company has a Trustpilot page. For Amazon, make sure the ASIN 
                  is valid. If issues persist, contact our support team for assistance.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>Our support team is here for you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you couldn't find an answer to your question, or if you're experiencing technical 
              issues, please reach out to our support team.
            </p>
            
            <Button className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
              Response time: Within 24 hours<br />
              Business hours: Monday-Friday, 9AM-5PM PST
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Video Tutorials</CardTitle>
          <CardDescription>Learn how to use Ezra with step-by-step video guides</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-10 text-muted-foreground">
            Video tutorials coming soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 