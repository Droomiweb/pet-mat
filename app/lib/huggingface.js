// app/lib/huggingface.js

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL_ID = "google/vit-base-patch16-224";

/**
 * Classifies an image using Hugging Face Inference API.
 * @param {string} base64Data - The base64 encoded image data (without prefix).
 * @returns {Promise<Object>} - The formatted analysis result { isHuman, type, breed }.
 */
export async function classifyImage(base64Data) {
  if (!HF_API_KEY) {
    console.warn("⚠️ HUGGINGFACE_API_KEY is missing. Using mock response.");
    // Fail gracefully if key is missing (dev mode fallback)
    return { isHuman: false, type: "Other", breed: "Unknown (Missing API Key)" };
  }

  try {
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${MODEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: base64Data, // HF Inference API accepts base64 string directly in 'inputs' for image models
        }),
      }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HF API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("HF Raw Response:", result);

    return mapClassificationToResult(result);

  } catch (error) {
    console.error("❌ Hugging Face Classification Failed:", error);
    // Fallback on error
    return { isHuman: false, type: "Other", breed: "Unknown" };
  }
}

/**
 * Maps the raw classification labels to our simplified schema.
 * @param {Array} labels - Array of { label: string, score: number }
 * @returns {Object} - { isHuman, type, breed }
 */
function mapClassificationToResult(labels) {
    if (!Array.isArray(labels) || labels.length === 0) {
        return { isHuman: false, type: "Other", breed: "Unknown" };
    }

    // Get the top prediction
    const topMatch = labels[0];
    const topLabel = topMatch.label.toLowerCase();

    // 1. Human Detection Heuristics
    // ViT on ImageNet has classes like 'groom', 'scuba diver', etc. 
    // This is a basic check; real person detection usually needs an Object Detection model (DETR/YOLO).
    const humanKeywords = [
        "groom", "scuba diver", "ballplayer", "sunglass", "mask", "wig", 
        "suit", "tie", "jersey", "uniform", "doctor", "nurse", "police", 
        "soldier", "pilot", "astronaut", "diver", "surfer", "skier", 
        "player", "coach", "hair", "face", "person", "man", "woman", 
        "boy", "girl", "child", "baby", "human", "body", "people",
        "clothing", "shirt", "pants", "dress", "jacket", "coat",
        "hat", "cap", "helmet", "goggles", "costume", "pajama", "kimono"
    ]; 
    // Note: This is very weak for general "selfie" detection but fits the resource constraints.
    
    // Check if the top label matches any human keyword
    let isHuman = false;
    if (humanKeywords.some(keyword => topLabel.includes(keyword))) {
        isHuman = true;
    }
    
    // 2. Identify Type & Breed
    let type = "Other";
    let breed = topMatch.label; // Default breed to the label properly capitalized

    // Extended Keyword matching for Type
    // ViT returns specific breeds (e.g. "Samoyed", "tabby cat"). We need to map them to high-level types.
    
    // DOG KEYWORDS
    const dogKeywords = [
        "dog", "terrier", "retriever", "hound", "spaniel", "bull", "shepherd", "collie", 
        "corgi", "poodle", "pug", "beagle", "husky", "dalmatian", "boxer", "rottweiler", 
        "chihuahua", "shi-tzu", "schnauzer", "dachshund", "dane", "mastiff", "akita", 
        "malamute", "samoyed", "shiba", "newfoundland", "bernese", "labrador", "pointer",
        "setter", "pinscher", "cocker", "whippet", "maltese", "pomeranian", "vizsla",
        "weimaraner", "malinois", "sheepdog", "griffon", "papillon", "spitz"
    ];

    // CAT KEYWORDS
    const catKeywords = [
        "cat", "tabby", "tiger", "kitten", "siamese", "persian", "sphynx", "ragdoll", 
        "mainecoon", "bengal", "birman", "bombay", "burmese", "mau", "chartreux", 
        "himalayan", "manx", "rex", "angora", "bobtail", "forest", "short", "long"
    ];

    // Check Dog Matches
    if (dogKeywords.some(keyword => topLabel.includes(keyword))) {
        type = "Dog";
        // Override isHuman if it's clearly a dog (sometimes 'hair' or 'coat' might trigger)
        isHuman = false; 
    } 
    // Check Cat Matches
    else if (catKeywords.some(keyword => topLabel.includes(keyword))) {
        type = "Cat";
        isHuman = false;
    }
    // Check Rabbit
    else if (topLabel.includes("rabbit") || topLabel.includes("hare") || topLabel.includes("bunny")) {
        type = "Rabbit";
        isHuman = false;
    } 
    // Check Bird
    else if (topLabel.includes("bird") || topLabel.includes("eagle") || topLabel.includes("parrot") || 
             topLabel.includes("sparrow") || topLabel.includes("owl") || topLabel.includes("hawk") || 
             topLabel.includes("macaw") || topLabel.includes("cockatoo")) {
        type = "Bird";
        isHuman = false;
    }

    // Special Case: If it looks like a person and NOT an animal
    // This is tricky with classification. 
    // For now, we assume if it detected an animal breed, it's a pet.
    // If the top label is significantly non-animal (like 'sunglass'), we *could* say isHuman=true.
    
    // NOTE: User asked to replicate "Selfie" logic. 
    // ViT is not great for "Selfie" vs "Person holding dog". 
    // We will assume isHuman=false unless we are very sure.
    
    return {
        isHuman: isHuman,
        type: type,
        breed: breed
    };
}
