import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongodb";
import AIInteraction from "../../../models/AIInteraction";
import User from "../../../models/User";

export async function GET(req) {
  try {
    await connectDB();


    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const month = searchParams.get("month"); // YYYY-MM

    // CASE A: Fetch logs for a specific Date
    if (date) {
      // DEBUG:
      console.log(`[API] Fetching logs for IST Date: ${date}`);

      // Manual IST -> UTC Conversion
      // 00:00 IST = previous day 18:30 UTC
      const targetDate = new Date(date); // UTC 00:00 of that day
      
      const startCurrentDay = new Date(targetDate);
      startCurrentDay.setUTCDate(targetDate.getUTCDate() - 1);
      startCurrentDay.setUTCHours(18, 30, 0, 0);

      const endCurrentDay = new Date(targetDate);
      endCurrentDay.setUTCDate(targetDate.getUTCDate());
      endCurrentDay.setUTCHours(18, 29, 59, 999);

      console.log(`[API] UTC Window: ${startCurrentDay.toISOString()} - ${endCurrentDay.toISOString()}`);

      const logs = await AIInteraction.find({
        createdAt: { $gte: startCurrentDay, $lte: endCurrentDay }
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

      // --- ENHANCEMENT: Fetch User Details ---
      const userIds = [...new Set(logs.map(log => log.metadata?.userId).filter(Boolean))];
      const users = await User.find({ firebaseUid: { $in: userIds } }, 'firebaseUid name email image').lean();
      const userMap = users.reduce((acc, user) => {
          acc[user.firebaseUid] = user;
          return acc;
      }, {});

      const logsWithUser = logs.map(log => ({
          ...log,
          user: userMap[log.metadata?.userId] || null
      }));
      // ---------------------------------------

      // --- ENHANCEMENT: Provider Stats (Full Day) ---
      const statsAgg = await AIInteraction.aggregate([
          { $match: { createdAt: { $gte: startCurrentDay, $lte: endCurrentDay } } },
          {
              $group: {
                  _id: { 
                      provider: {
                          $switch: {
                              branches: [
                                  { case: { $regexMatch: { input: "$model", regex: /gemini/i } }, then: "Gemini" },
                                  { case: { $regexMatch: { input: "$model", regex: /llama|groq|mixtral/i } }, then: "Groq" },
                                  { case: { $regexMatch: { input: "$model", regex: /huggingface|vit|resnet/i } }, then: "HuggingFace" }
                              ],
                              default: "Other"
                          }
                      },
                      status: "$status"
                  },
                  count: { $sum: 1 }
              }
          }
      ]);

      const providerStats = {
          gemini: { count: 0, success: 0, failed: 0, quota: "Unknown" },
          groq: { count: 0, success: 0, failed: 0, quota: "Unknown" },
          huggingface: { count: 0, success: 0, failed: 0, quota: "Unknown" }
      };

      statsAgg.forEach(item => {
          const provider = item._id.provider.toLowerCase().replace(/\s/g, '');
          const status = item._id.status;
          const count = item.count;

          if (providerStats[provider]) {
              providerStats[provider].count += count;
              if (status === 'Success') providerStats[provider].success += count;
              else providerStats[provider].failed += count;
          }
      });
      // ----------------------------------------------

      const successCount = await AIInteraction.countDocuments({ createdAt: { $gte: startCurrentDay, $lte: endCurrentDay }, status: "Success" });
      const failureCount = await AIInteraction.countDocuments({ createdAt: { $gte: startCurrentDay, $lte: endCurrentDay }, status: "Failed" });
      
      return NextResponse.json({ 
        logs: logsWithUser,
        stats: { success: successCount, failed: failureCount },
        providerStats
      });
    }

    // CASE B: Fetch Stats for a full Month (Calendar View)
    if (month) {
        const [year, monthNum] = month.split("-");
        
        // Construct generous range to cover all IST shifts
        // Start: 1st of month (IST) -> Last day of prev month 18:30 UTC
        const startDate = new Date(Date.UTC(year, monthNum - 1, 0, 18, 30, 0)); 
        
        // End: Last day of month (IST) -> This day 18:29 UTC
        const endDate = new Date(Date.UTC(year, monthNum, 0, 18, 29, 59));
        // Actually, just going wide (1st of month to 1st of next month + buffer) is safer for aggregation matching,
        // filtering happens inside $match.
        
        // Let's stick to standard UTC month window but grouped by IST
        const aggStart = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
        const aggEnd = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0)); // First day of NEXT month

        const interactions = await AIInteraction.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lt: aggEnd } // Use slightly wider range to be safe
                }
            },
            {
                $group: {
                    // CRITICAL: UTC -> IST (+5:30)
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } },
                    count: { $sum: 1 },
                    failed: { 
                        $sum: { $cond: [{ $eq: ["$status", "Failed"] }, 1, 0] } 
                    }
                }
            }
        ]);

        // Transform into a map for easier frontend lookup: { "2024-02-01": { count: 10, failed: 0 }, ... }
        const calendarData = {};
        interactions.forEach(item => {
            calendarData[item._id] = { count: item.count, failed: item.failed };
        });

        // Overall month stats
        const totalCalls = interactions.reduce((acc, curr) => acc + curr.count, 0);
        
        return NextResponse.json({ calendarData, totalCalls });
    }

    return NextResponse.json({ error: "Missing date or month parameter" }, { status: 400 });

  } catch (error) {
    console.error("AI Stats Error:", error);
    return NextResponse.json({ error: "Failed to fetch AI stats" }, { status: 500 });
  }
}
