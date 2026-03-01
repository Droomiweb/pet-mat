# Pet-Mat: Project & AI Architecture Overview

This document provides an A-Z overview of the Pet-Mat platform and a detailed
breakdown of how the AI modules work under the hood.

---

## Part 1: A-Z Project Overview

Pet-Mat is a comprehensive, full-stack Next.js application designed to serve as
a complete ecosystem for pet owners. It combines social networking, healthcare,
matchmaking, and e-commerce into a single platform.

### Core Modules & Features

1. **User & Authentication (`app/Login`, `app/Signup`)**
   - Secure user onboarding and login system.
   - User profiles tracking ownership and activity (`models/User.js`).

2. **Pet Management (`app/pet`, `app/Profile`, `models/PetModel.js`)**
   - Extensive pet profiles including basic info (breed, age), medical history,
     vaccination records, lineage (sire/dam), and temperament.
   - Support for generating pet certificates.

3. **Matchmaking & Mating (`app/lib/matchLogic.js`)**
   - Intelligent AI-driven compatibility scoring between pets for mating
     purposes.
   - Strict filtering (preventing pregnant or banned pets from matching).

4. **Pregnancy & Care (`app/pregnancy-tracker`, `app/pregnancy-support`)**
   - Dedicated tools for tracking a pet's pregnancy timeline and receiving
     guided advice.

5. **AI Advisor / Dr. Paws (`app/api/ai-advisor`, `app/AiDoc`)**
   - A virtual veterinary assistant that uses the pet's actual medical history
     and vaccination records to provide highly contextualized advice.

6. **Community & Forum (`app/community`, `models/ForumPost.js`)**
   - A social space for pet owners to ask questions, share updates, and
     interact.

7. **Marketplace (`app/marketplace`, `models/ProductModel.js`)**
   - An e-commerce layer for buying pet supplies, food, and accessories.

8. **Adoption (`app/adoption`)**
   - A dedicated section for pets looking for their forever homes.

9. **Services & Utilities (`app/vet-locator`, `app/reminders`)**
   - Tools to find nearby veterinarians and set health/vaccine reminders.

10. **Admin Panel (`app/admin`)**
    - A comprehensive dashboard for moderation, managing users/pets/products,
      and viewing system health (including AI logs).

---

## Part 2: How the AI Modules Work

The AI in Pet-Mat is not just a simple API call; it is a highly resilient,
multi-tiered "Hybrid Engine" designed to guarantee uptime and reduce costs.

### 1. The Trigger Phase

An AI call typically starts in one of two places:

- **Matchmaking:** When a user looks for a mate for their pet, `matchLogic.js`
  takes the user's pet profile and a batch of compatible candidates (filtered by
  species, breed, and gender).
- **AI Advisor (Dr. Paws):** When a user asks a medical or behavioral question
  in the chat interface.

### 2. Context Aggregation & Prompt Engineering

Before touching any external API, the backend (Node.js/Next.js API route)
gathers all relevant data from MongoDB (`PetModel`).

- _For matches:_ It compiles the AI profiles, energy levels, and ages into a
  structured JSON prompt asking the AI to return scores from 0-100.
- _For Dr. Paws:_ It compiles a massive context block containing the pet's
  **Medical History Log**, **Vaccination Status**, **Weight**, **Pregnancy/Mated
  Status**, and **Lineage**. This forces the AI to answer based on _real data_,
  acting as a true virtual vet.

### 3. The Hybrid Request Engine (`app/lib/gemini.js`)

This is the heart of the AI system. When `executeHybridRequest` is called, it
processes the request through a sophisticated fallback chain:

1. **Tier 1: Google Gemini (Primary)**
   - The system uses `gemini-flast-latest`.
   - It pulls from an array of API keys (`INITIAL_SEED_KEYS`). It actively
     rotates/shuffles these keys to distribute API loads and bypass single-key
     rate limits.
   - If Gemini succeeds, the response is returned. If Gemini throws a `400/429`
     (Rate limit or invalid key), it catches the error and moves to Tier 2.

2. **Tier 2: Groq (Llama 3.3) - Free Fallback**
   - If Gemini is down, the system instantly reformats the Gemini-style message
     history into OpenAI standard format.
   - It sends the payload to Groq's API utilizing the ultra-fast
     `llama-3.3-70b-versatile` open-source model.
   - _Note:_ The system can also be forced to prefer Groq via a
     `preferModel='groq'` flag to save Gemini quota.

3. **Tier 3: Hugging Face (Mistral v0.3) - Final Shield**
   - If both Gemini and Groq fail (e.g., bad API keys or server outages), it
     triggers the "Final Shield".
   - It formats the prompt into `[INST] prompt [/INST]` format.
   - It queries Hugging Face's Serverless Inference API using the
     `mistralai/Mistral-7B-Instruct-v0.3` model to provide a fundamental
     baseline response.

### 4. Logging & Analytics

Regardless of success or failure, every single AI interaction is immediately
logged asynchronously to the `AIInteraction` MongoDB collection.

- It logs the prompt, the output, the exact model used (e.g., "Gemini", "Groq
  (Llama 3.3)", "Hugging Face"), latency, and success status.
- This allows the Admin Panel to display detailed AI usage statistics and catch
  failing keys.

### 5. Post-Processing & Output Generation

Once the AI returns a text response:

- **For Chat:** The text is passed directly back to the frontend API and
  streamed/displayed to the user in the chat UI.
- **For Matchmaking:** The system strips out markdown code blocks (`json ...`),
  parses the raw text into a strict JavaScript array of objects, and maps those
  scores back to the potential DB matches.
- **Caching:** To save high AI API costs, match results are saved into the pet's
  Mongo document (`cachedMatches`). If the user views matches again within 24
  hours, the system serves the cached AI scores instantly without hitting
  external APIs.
