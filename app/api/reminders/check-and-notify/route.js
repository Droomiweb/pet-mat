// app/api/reminders/check-and-notify/route.js

// Standard imports
import connectDB from "../../../lib/mongodb";
import Pet from "../../../models/PetModel";
import User from "../../../models/User";
import { sendWhatsAppText } from "../../../lib/greenApi";
import { NextResponse } from 'next/server';

// Reminder config
const NOTIFICATION_WINDOW_DAYS = 10;

// Normalize dates
const getStartOfDay = (date) => {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// GET request handler
export async function GET(req) { 
    try {
        await connectDB();
        
        // Set current date
        const now = new Date();
        const today = getStartOfDay(now);
        
        // Fetch vaccinated pets
        const petsWithVax = await Pet.find({ 
            'vaccinationHistory': { $exists: true, $not: { $size: 0 } } 
        }).select('ownerId name vaccinationHistory').lean();

        let totalNotificationsSent = 0;

        // Process pets
        for (const pet of petsWithVax) {
            const ownerId = pet.ownerId;
            
            // Fetch owner details
            const owner = await User.findOne({ firebaseUid: ownerId }).select('phone name').lean();
            
            // Validate contact info
            if (!owner || !owner.phone) continue;

            const cleanPhone = String(owner.phone).replace(/\D/g, "");
            const fullPhoneNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`; 
            
            // Check vaccines
            for (let i = 0; i < pet.vaccinationHistory.length; i++) {
                const vax = pet.vaccinationHistory[i];
                const expiryDate = vax.expiryDate ? getStartOfDay(vax.expiryDate) : null;
                const vaxName = vax.vaccineName;
                
                // Validate date
                if (!expiryDate || isNaN(expiryDate.getTime())) continue;

                // Calculate days remaining
                const diffTime = expiryDate.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                
                // Check expiry window
                if (diffDays <= NOTIFICATION_WINDOW_DAYS && diffDays >= 0) {
                    
                    const whatsappMessage = `
                        🔔 *VACCINATION REMINDER* for ${pet.name}
                        
                        The vaccine "${vaxName}" is due to expire in *${diffDays} day${diffDays !== 1 ? 's' : ''}* on ${expiryDate.toLocaleDateString()}.
                        
                        Please visit your vet soon for revaccination.
                    `.trim();

                    // Send WhatsApp alert
                    await sendWhatsAppText(fullPhoneNumber, whatsappMessage);
                    totalNotificationsSent++;
                    
                    console.log(`[WhatsApp] Sent reminder for ${vaxName} (Pet: ${pet.name}) to ${owner.phone}`);
                }
            }
        }

        // Return success response
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