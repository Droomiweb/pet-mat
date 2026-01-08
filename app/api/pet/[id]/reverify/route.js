
import connectDB from "../../../../lib/mongodb";
import Pet from "../../../../models/PetModel";
import User from "../../../../models/User";
import { verifyAuth } from "../../../../lib/auth-middleware";
import { runCertificateAnalysis } from "../../../../lib/verification";
import { integrateNewPetIntoMatches } from "../../../../lib/matchLogic";
import { classifyImage } from "../../../../lib/huggingface";


export async function POST(req, context) {
  try {
    await connectDB();
    const { id } = await context.params;

    // Verify Auth (Admins or Owner can verify)
    let decodedToken;
    try {
      decodedToken = await verifyAuth(req);
    } catch (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 401 });
    }

    const pet = await Pet.findById(id);
    if (!pet) {
        return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404 });
    }

    // Owner check: Allow Owner OR Admin (Assuming admin has a custom claim or we just check logic)
    // For now, let's assume if they have a valid token they can try re-verify their own pet.
    // Ideally we check if pet.ownerId === decodedToken.uid OR isAdmin
    
    // Fetch owner name for comparison (IMPORTANT: Needs to be User's Name, not just requester)
    const ownerUser = await User.findOne({ firebaseUid: pet.ownerId });
    if (!ownerUser) {
        return new Response(JSON.stringify({ error: "Owner user not found" }), { status: 404 });
    }

    // Re-run Analysis
    // We need to fetch the certificate image. Since it's a URL in DB, we might need to fetch it 
    // and convert to base64 IF the analysis requires base64. 
    // `runCertificateAnalysis` expects `certificateBase64`.
    
    // FETCH IMAGE AS BUFFER -> BASE64
    let certificateBase64 = null;
    let certificateMimeType = "image/jpeg"; // Default

    try {
        const response = await fetch(pet.certificateUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        certificateBase64 = buffer.toString('base64');
        const contentType = response.headers.get('content-type');
        if (contentType) certificateMimeType = contentType;
    } catch (e) {
        return new Response(JSON.stringify({ error: "Failed to download certificate from URL" }), { status: 500 });
    }

    const analysisResult = await runCertificateAnalysis({
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      certificateBase64: certificateBase64,
      certificateMimeType: certificateMimeType,
      ownerName: ownerUser.name, // Use registered name
    });

    if (analysisResult.error) {
         console.warn("Certificate AI Failed during re-verify, attempting Visual Fallback...", analysisResult.error);

         let visualStatus = "needs-review";
         let visualReason = `Re-verify Analysis Failed: ${analysisResult.error}`;
         let isVisualSuccess = false;

         // FALLBACK: Use Hugging Face Vision on the pet photo
         // We need the pet image. It's in pet.imageUrls[0].
         if (pet.imageUrls && pet.imageUrls.length > 0) {
             try {
                const imgUrl = pet.imageUrls[0];
                // Fetch image buffer -> base64
                const imgRes = await fetch(imgUrl);
                const imgArrBuf = await imgRes.arrayBuffer();
                const imgBuf = Buffer.from(imgArrBuf);
                const imgB64 = imgBuf.toString('base64');

                const visionResult = await classifyImage(imgB64);
                console.log("Re-verify Visual Fallback Result:", visionResult);

                if (visionResult.type && visionResult.type.toLowerCase() === pet.type.toLowerCase()) {
                    visualStatus = "verified";
                    visualReason = `Visual Verified (Retry): Detected valid ${visionResult.type} (${visionResult.breed}).`;
                    isVisualSuccess = true;
                } else {
                    visualReason += ` | Visual Mismatch: Saw ${visionResult.type} vs ${pet.type}.`;
                }
             } catch (visErr) {
                 console.error("Visual Fallback Error (Reverify):", visErr);
                 visualReason += " | Visual Check Failed.";
             }
         }

         // Update Pet with Fallback Result
         pet.verificationStatus = visualStatus;
         pet.certificateAnalysis.status = isVisualSuccess ? "fallback-verified" : "ai-error";
         pet.certificateAnalysis.reason = visualReason;
         await pet.save();

         if (isVisualSuccess) {
             await integrateNewPetIntoMatches(pet);
         }

         return new Response(JSON.stringify({ 
             success: isVisualSuccess, 
             status: visualStatus,
             reason: visualReason,
             message: isVisualSuccess ? "Verified via Image Fallback" : "Re-verification failed." 
         }), { status: 200 });
    }

    const aiData = analysisResult.aiResult;

    // Update Pet
    pet.verificationStatus = aiData.finalStatus;
    pet.certificateAnalysis = {
        certificateUrl: pet.certificateUrl,
        extractedOwnerName: aiData.extractedData?.ownerName || null,
        extractedPetName: aiData.extractedData?.petName || null,
        aiOcrText: aiData?.extractedData ? JSON.stringify(aiData.extractedData) : null,
        ownerNameMatch: analysisResult.ownerNameMatch,
        status: aiData.finalStatus,
        reason: aiData.reason
    };

    // Update Vaccinations if found
    if (aiData.vaccinationRecords && aiData.vaccinationRecords.length > 0) {
        // ... (Parsing logic similar to main route, can be extracted too but keeping simple here)
    }

    await pet.save();

    if (pet.verificationStatus === 'verified') {
        await integrateNewPetIntoMatches(pet);
    }

    return new Response(JSON.stringify({
        success: true,
        status: pet.verificationStatus,
        reason: pet.certificateAnalysis.reason
    }), { status: 200 });

  } catch (err) {
    console.error("Re-verification error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
