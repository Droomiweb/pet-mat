// app/api/reminders/check-and-notify/route.js
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import { sendWhatsAppText } from "../../../lib/greenApi";
import { NextResponse } from 'next/server';

const NOTIFICATION_WINDOW_DAYS = 10;

// Helper for UTC-safe date comparison
const getStartOfDay = (date) => {
    // This is vital for consistent checks across different time zones/servers.
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export async function GET(req) { // Use POST for actual cron job, GET for local testing ease
    try {
        await connectDB();
        const now = new Date();
        const today = getStartOfDay(now);
        
        // Find all pets that have any vaccination history
        const petsWithVax = await Pet.find({ 
            'vaccinationHistory': { $exists: true, $not: { $size: 0 } } 
        }).select('ownerId name vaccinationHistory').lean();

        let totalNotificationsSent = 0;

        for (const pet of petsWithVax) {
            const ownerId = pet.ownerId;
            
            // Fetch owner details only once per pet
            const owner = await User.findOne({ firebaseUid: ownerId }).select('phone name').lean();
            if (!owner || !owner.phone) continue;

            const fullPhoneNumber = `91${owner.phone}`;
            
            for (let i = 0; i < pet.vaccinationHistory.length; i++) {
                const vax = pet.vaccinationHistory[i];
                const expiryDate = vax.expiryDate ? getStartOfDay(vax.expiryDate) : null;
                const vaxName = vax.vaccineName;
                
                if (!expiryDate || isNaN(expiryDate.getTime())) continue;

                // Calculate difference in days (Expiry - Today)
                const diffTime = expiryDate.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                
                // --- REMINDER LOGIC: Between 10 days out and today (i.e., days left >= 0) ---
                if (diffDays <= NOTIFICATION_WINDOW_DAYS && diffDays >= 0) {
                    
                    const whatsappMessage = `
                        🔔 VACCINATION REMINDER for ${pet.name}!
                        
                        The vaccine "${vaxName}" is due to expire in **${diffDays} day${diffDays !== 1 ? 's' : ''}** on ${expiryDate.toLocaleDateString()}.
                        
                        Please visit your vet soon for revaccination.
                    `.trim();

                    await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
                    totalNotificationsSent++;
                    console.log(`[WhatsApp] Sent reminder for ${vaxName} to ${owner.phone}`);
                }
            }
        }

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