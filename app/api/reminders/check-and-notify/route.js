// app/api/reminders/check-and-notify/route.js

// 1. IMPORTS
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import { sendWhatsAppText } from "../../../lib/greenApi";
import { NextResponse } from 'next/server';

// 2. CONFIGURATION
// How many days in advance should we warn the user?
const NOTIFICATION_WINDOW_DAYS = 10;

// 3. HELPER: UTC Normalization
// This strips the time component (hours/mins/secs) from a date.
// It effectively sets the clock to 00:00:00 UTC.
// This is vital for accurate day-difference calculations.
const getStartOfDay = (date) => {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// 4. ROUTE HANDLER
// We use GET here so you can easily test it by visiting the URL in your browser.
// In strict production, you might change this to POST and require an API key header.
export async function GET(req) { 
    try {
        await connectDB();
        
        // Current Time Setup
        const now = new Date();
        const today = getStartOfDay(now);
        
        // 5. FETCH RELEVANT PETS
        // Efficiency: Only find pets that actually HAVE a history array that isn't empty.
        // We utilize .select() to fetch only the fields we need (Owner ID, Name, Vax History).
        const petsWithVax = await Pet.find({ 
            'vaccinationHistory': { $exists: true, $not: { $size: 0 } } 
        }).select('ownerId name vaccinationHistory').lean();

        let totalNotificationsSent = 0;

        // 6. PROCESS EACH PET
        for (const pet of petsWithVax) {
            const ownerId = pet.ownerId;
            
            // Fetch owner contact info
            // Optimization: If you have 10,000 pets, fetching this one-by-one inside a loop 
            // isn't the most efficient (O(N)), but for a scheduled job it's acceptable.
            const owner = await User.findOne({ firebaseUid: ownerId }).select('phone name').lean();
            
            // Skip if owner not found or has no phone number
            if (!owner || !owner.phone) continue;

            const fullPhoneNumber = `91${owner.phone}`; // Assuming India prefix
            
            // 7. CHECK VACCINES
            for (let i = 0; i < pet.vaccinationHistory.length; i++) {
                const vax = pet.vaccinationHistory[i];
                const expiryDate = vax.expiryDate ? getStartOfDay(vax.expiryDate) : null;
                const vaxName = vax.vaccineName;
                
                // Skip invalid dates
                if (!expiryDate || isNaN(expiryDate.getTime())) continue;

                // Calculate the difference in milliseconds, then convert to days
                const diffTime = expiryDate.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                
                // 8. SEND ALERT LOGIC
                // Logic: Is it expiring soon (<= 10 days) AND is it not already expired (>= 0)?
                if (diffDays <= NOTIFICATION_WINDOW_DAYS && diffDays >= 0) {
                    
                    const whatsappMessage = `
                        🔔 *VACCINATION REMINDER* for ${pet.name}
                        
                        The vaccine "${vaxName}" is due to expire in *${diffDays} day${diffDays !== 1 ? 's' : ''}* on ${expiryDate.toLocaleDateString()}.
                        
                        Please visit your vet soon for revaccination.
                    `.trim();

                    // Send the message via Green API
                    await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
                    totalNotificationsSent++;
                    
                    console.log(`[WhatsApp] Sent reminder for ${vaxName} (Pet: ${pet.name}) to ${owner.phone}`);
                }
            }
        }

        // 9. SUCCESS RESPONSE
        return NextResponse.json({ 
            success: true, 
            message: `Reminder check complete. ${totalNotificationsSent} notifications triggered.`,
            note: "In production, this API should be called by a secure daily cron job."
        });

    } catch (err) {
        console.error("Error checking reminders:", err);
        return NextResponse.json({ error: "Server error during reminder check", details: err.message }, { status: 500 });
    }
}