# Pet-Mat: Algorithmic Breakdown & AI Mechanics

This document provides a deep, step-by-step explanation of the core algorithms
driving Pet-Mat and the internal mechanics of how the AI systems (Gemini, Groq,
and Hugging Face) process inputs to deliver results.

---

## 1. The Core Algorithms

Pet-Mat relies on three main algorithms to power its complex features: **Data
Filtering**, **Matchmaking Scoring**, and **Contextual Injection (RAG-lite)**.

### A. The Candidate Filtering Algorithm (Pre-Processing)

Running Large Language Models (LLMs) on an entire database of pets is extremely
slow and expensive. To solve this, Pet-Mat uses a strict horizontal filtering
algorithm to narrow down candidates _before_ the AI is ever involved.

**Steps:**

1. **Self-Exclusion:** The query starts by removing the user's pet
   (`_id: { $ne: myPet._id }`).
2. **Species Matching:** A dog cannot match with a cat. The system filters
   strictly by `type: myPet.type`.
3. **Gender Pairing:** For mating, the algorithm flips the gender constraint
   (`gender: myPet.gender === 'Male' ? 'Female' : 'Male'`).
4. **Breed Compatibility Matrix:** Instead of forcing exact matches ("Golden
   Retriever" to "Golden Retriever"), the algorithm uses `getCompatibleBreeds`
   to expand the net. For example, it might allow a "Labrador" to appear for a
   "Golden Retriever."
5. **Safety & Status Rules:** The final sweep removes banned users
   (`isBanned: false`), unverified pets (`verificationStatus`), and crucially,
   pets that are currently pregnant (`isPregnant: { $ne: true }`).

_Result: A pool of 1000 pets is reduced to 5-10 highly viable candidates
instantly._

### B. The Scoring & Sorting Algorithm (AI Post-Processing)

Once the database yields a pool of valid candidates, the system takes a limited
subset (the top 6) and feeds them into the AI array evaluation algorithm.

**Steps:**

1. **AI Parallel Evaluation:** The AI scans the subset and compares their JSON
   profiles (Age, Energy, Temperament) against the user's pet profile. It
   assigns a score from 0-100 for each candidate.
2. **Vector Realignment:** The AI responds with a JSON array. The backend maps
   this new array of scores to the original database objects using a `Map` array
   to pair `petId` to the generated `compatibilityScore`.
3. **Sorting:** The combined data array is run through
   `(a, b) => b.compatibilityScore - a.compatibilityScore`, ordering the feed so
   the absolute best matches sit at the top of the UI.
4. **Caching Layer:** To eliminate redundant AI calls, the final array of IDs
   and scores is saved directly into the user's pet document (`cachedMatches`).
   If the user refreshes, the app bypasses the AI completely and serves the
   cache.

### C. Incremental Candidate Injection (The Reverse Match)

When a _new_ pet registers, the system cannot afford to run AI updates on every
existing pet in the system. It uses an asynchronous "Reverse Match" heuristic:

**Steps:**

1. The database queries for existing pets whose filters _would_ encompass this
   new pet.
2. It runs a single, batched AI prompt to calculate the compatibility of the New
   Pet across all these candidates.
3. If the score is high (e.g., >60%), it silently pushes the New Pet's ID into
   the `cachedMatches.data` array of those older pets.
4. It re-sorts and mathematically trims the array (`slice(0, 20)`) to maintain
   performance limits.

---

## 2. Inside the AI: How the Output is Generated

When an AI call is triggered (e.g., asking Dr. Paws a question, or running the
Matchmaking), a highly orchestrated step-by-step sequence fires in the backend
(`app/lib/gemini.js`).

### Step 1: Context Assembly & Prompt Architecture (The Setup)

Before the AI receives a signal, the Next.js server acts as an intelligence
gatherer. For example, if a user asks the AI "Does my dog need a shot?", the
system grabs the target pet from the database and statically builds this RAG
pattern (Retrieval-Augmented Generation):

```text
You are Dr. Paws, a warm, enthusiastic Veterinarian...
PET B DETAILED HEALTH RECORDS:
- Vaccination Status: Rabies (Expires: 10/2026), Parvovirus (Expires: 12/2026)
- Status: PREGNANT
- Weight: 12 kg
- Age: 3 years
...
User Question: "Does my dog need a shot?"
```

By forcing real, structured data from the MongoDB database directly into the
"System Instructions," the LLM behaves as if it naturally _remembers_ the pet,
allowing it to answer with incredible precision.

### Step 2: The Hybrid Execution Engine (The Network Call)

Pet-Mat utilizes a "Hybrid Engine" to prevent downtime and manage API quotas.
Once the prompt is built, it calls `executeHybridRequest`, cascading through
three tiers of models:

#### Tier 1: Google Gemini (Primary API)

- **Model:** `gemini-flast-latest`
- **Action:** The server makes a serialized HTTP request to Google's neural
  networks.
- **Failover:** The system uses key rotation. If `Key A` hits a rate limit
  (429), it instantly switches to `Key B`. If all Google keys fail, it trips the
  circuit to Tier 2.

#### Tier 2: Groq Fallback (The Free LPU Engine)

- **Model:** `llama-3.3-70b-versatile`
- **Action:** If Gemini fails, the backend translates the chat history exactly
  into OpenAI's native JSON schema (`{"role": "user", "content": "..."}`).
- **Execution:** It routes the query to Groq, which processes the massively
  powerful 70-billion parameter Llama model on specialized hardware (Language
  Processing Units) capable of rendering responses in milliseconds.

#### Tier 3: Hugging Face (The Final Shield)

- **Model:** `mistralai/Mistral-7B-Instruct-v0.3`
- **Action:** If Groq goes down or its key expires, the system catches the
  secondary 401/404 errors. It then formats the text into Mistral's required
  format (`[INST] prompt [/INST]`).
- **Execution:** It sends a final free-tier request to Hugging Face's serverless
  endpoints to guarantee the user never sees a blank screen or a "500 Server
  Error".

### Step 3: Parsing & Sanitation (Regex/JSON Mapping)

LLMs are chatty. If the system asks for JSON, the AI often responds with:

> _"Here are the matching scores you requested:_ \`\`\`json [{"petId": "123",
> "compatibilityScore": 90}] \`\`\`"

The application code cannot process conversational text strings as data arrays.
Inside the logic blocks, the system runs a strict parsing gauntlet:

1. It uses Regular Expressions (`Regex`) to violently strip markdown wrappers
   like `` ```json `` and `` ``` ``.
2. It uses memory substring slicing (`indexOf('[')` and `lastIndexOf(']')`) to
   cut away any conversational padding text.
3. It pushes the string through `JSON.parse(text)` to convert the block back
   into a functional JavaScript Object.

### Step 4: Database Finalization & Delivery

The parsed AI scores (e.g., `90`) are looped together with the database
documents. The system commits a final database save to record the interaction
log in the `AIInteraction` model for admin tracking, and the resulting JSON map
is streamed over HTTP to the React frontend to map out the beautiful user UI!
