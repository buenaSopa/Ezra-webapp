# **AI Chatbot Tech Scope**

## **Tech Stack Overview**

### **Frontend:**
- **Next.js (v14)** – React framework for SSR/ISR
- **React 18** 
- **TailwindCSS** – Utility-first CSS framework
- **ShadCN/UI** – Component library for design consistency
- **Lucide-react** – Icon library

### **Backend:**
- **Next.js API Routes/ server action** – Backend logic within Next.js
- **Supabase** – Database for storing user sessions and AI outputs
- **Drizzle ORM** – TypeScript ORM for PostgreSQL
- **Drizzle Kit** – Migrations and schema management
- **Next Auth Authentication (DB Strategy)** – Store in the database for session management
- **Apify casper11515/trustpilot-reviews-scraper** for scraping trustpilot review

### **AI & LLM Integration:**
- **LlamaIndex.ts** – Data indexing for LLM-powered search
- **Qdrant** – Vector database for embeddings and context retention
---

## **Project Scope & Workflow**

### **Objective:**
Develop a tool for creative strategists to streamline research, ideation, and ad script creation using AI-powered analysis and concept generation.

### **User Workflow:**

#### **Step 1: Upload & Contextualization**
- User provides a **review link** and **product link**
- System extracts data from:
  - Customer reviews (via scraping/CSV input)
  - Product descriptions
  - Metadata (e.g., price, ratings, key features)
- AI processes and **primes the model** with relevant context
- **Output:** A detailed product and sentiment analysis

#### **Step 2: Concept & Angle Generation**
- AI suggests **marketing angles** ranked by success probability
- User can regenerate angles until satisfied
- **Context retention** ensures angles align with extracted insights

#### **Step 3: Ad Script Generation**
- User selects a concept to create an **ad script session**
- Redirects to **Ezra's Ad Script Section**
- Users can:
  - Choose a template (e.g., Hook, Problem Amplification, Solution, CTA)
  - Get AI-generated script suggestions
  - Refine the script via GPT-based iteration
- **Final Output:** A structured, polished ad script ready for production


### **Pages:**
1. **Dashboard** – Displays all products
2. **Product Page** – Lists all uploaded sources and analysis per product
3. **Chat Interface** – Manages multiple chat sessions per product
4. **Ad Script Editor** – Provides editing tools for refining AI-generated scripts

### **High-Level Schema:**
- **User** → Has many **Products**
- **Product** → Has its own **Vector DB Index**
- **Product** → Has many **Chat Sessions**
- **Chat Session** → Has many **Ad Scripts**


