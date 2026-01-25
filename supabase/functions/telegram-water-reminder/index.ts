import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { username?: string };
    text?: string;
  };
}

// Send a Telegram message
async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram API error:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
}

// Get chat ID from username (user must have started the bot first)
async function getChatIdByUsername(username: string): Promise<string | null> {
  // Note: Telegram Bot API doesn't directly support getting chat_id from username
  // The user must first message the bot to establish a chat
  // This will be stored when they interact with the bot
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Handle Telegram webhook (incoming messages from users)
    if (req.method === "POST" && !action) {
      const update: TelegramUpdate = await req.json();
      console.log("Received Telegram update:", JSON.stringify(update));

      if (update.message) {
        const chatId = update.message.chat.id;
        const username = update.message.from?.username;
        const text = update.message.text?.toLowerCase().trim();

        // User is starting the bot - save their chat_id (handle /start or /start <param>)
        if (text === "/start" || text?.startsWith("/start ")) {
          if (username) {
            // Update the user's config with their chat_id
            const { error: err1 } = await supabase
              .from("water_reminder_configs")
              .update({ telegram_chat_id: chatId.toString() })
              .eq("telegram_username", `@${username}`);

            const { error: err2 } = await supabase
              .from("water_reminder_configs")
              .update({ telegram_chat_id: chatId.toString() })
              .eq("telegram_username", username);
            
            console.log("Updated chat_id for username:", username, "errors:", err1, err2);
          }

          await sendTelegramMessage(
            chatId,
            "💧 <b>Welcome to Water Reminder Bot!</b>\n\n" +
            "I'll remind you to drink water throughout the day.\n\n" +
            "When you receive a reminder, reply with:\n" +
            "• <b>done</b> or <b>✓</b> - to confirm you drank water\n" +
            "• <b>skip</b> - to skip this reminder\n\n" +
            "Stay hydrated! 🚰"
          );

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // User is confirming they drank water
        if (text === "done" || text === "✓" || text === "yes" || text === "drank") {
          // First, try to find the user config by chat_id
          const { data: config } = await supabase
            .from("water_reminder_configs")
            .select("user_id")
            .eq("telegram_chat_id", chatId.toString())
            .single();

          if (!config) {
            await sendTelegramMessage(
              chatId,
              "❓ I don't recognize this chat. Please use /start first."
            );
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Find pending reminder for this user
          const { data: pendingLog } = await supabase
            .from("water_reminder_logs")
            .select("id")
            .eq("user_id", config.user_id)
            .eq("status", "pending")
            .order("sent_at", { ascending: false })
            .limit(1)
            .single();

          if (pendingLog) {
            // Mark as confirmed
            await supabase
              .from("water_reminder_logs")
              .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
              .eq("id", pendingLog.id);
          }

          // Always log water intake when user says done
          await supabase.from("water_logs").insert({
            user_id: config.user_id,
            amount: 0.25,
            method: "telegram",
          });

          await sendTelegramMessage(
            chatId,
            pendingLog 
              ? "✅ <b>Great job!</b> 250ml water logged.\n\nKeep it up! 💪"
              : "👍 250ml water logged!"
          );

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Weight logging: "weight 75.5" or "w 75.5"
        if (text?.startsWith("weight ") || text?.startsWith("w ")) {
          const weightStr = text.replace(/^(weight|w)\s+/, "").trim();
          const weight = parseFloat(weightStr);

          if (isNaN(weight) || weight < 20 || weight > 300) {
            await sendTelegramMessage(chatId, "❌ Invalid weight. Use: <code>weight 75.5</code>");
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const { data: config } = await supabase
            .from("water_reminder_configs")
            .select("user_id")
            .eq("telegram_chat_id", chatId.toString())
            .single();

          if (!config) {
            await sendTelegramMessage(chatId, "❓ Please use /start first.");
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const today = new Date().toISOString().split("T")[0];

          // Check for existing morning checkin
          const { data: existing } = await supabase
            .from("morning_checkins")
            .select("id")
            .eq("user_id", config.user_id)
            .eq("date", today)
            .single();

          if (existing) {
            await supabase
              .from("morning_checkins")
              .update({ bodyweight: weight, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await supabase.from("morning_checkins").insert({
              user_id: config.user_id,
              date: today,
              bodyweight: weight,
            });
          }

          await sendTelegramMessage(chatId, `⚖️ Weight logged: <b>${weight}kg</b>`);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Meal logging: "meal pizza 500" or "m pizza 500"
        if (text?.startsWith("meal ") || text?.startsWith("m ")) {
          const mealStr = text.replace(/^(meal|m)\s+/, "").trim();
          const parts = mealStr.split(/\s+/);
          
          // Try to extract calories from the last part
          const lastPart = parts[parts.length - 1];
          const calories = parseInt(lastPart);
          
          let foodName: string;
          let cals: number | null = null;
          
          if (!isNaN(calories) && calories > 0 && calories < 5000) {
            foodName = parts.slice(0, -1).join(" ");
            cals = calories;
          } else {
            foodName = parts.join(" ");
          }

          if (!foodName) {
            await sendTelegramMessage(chatId, "❌ Use: <code>meal pizza 500</code> or <code>meal pizza</code>");
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const { data: config } = await supabase
            .from("water_reminder_configs")
            .select("user_id")
            .eq("telegram_chat_id", chatId.toString())
            .single();

          if (!config) {
            await sendTelegramMessage(chatId, "❓ Please use /start first.");
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Determine meal type by time
          const hour = new Date().getHours();
          let mealType = "snack";
          if (hour >= 5 && hour < 11) mealType = "breakfast";
          else if (hour >= 11 && hour < 15) mealType = "lunch";
          else if (hour >= 15 && hour < 20) mealType = "dinner";

          const today = new Date().toISOString().split("T")[0];

          await supabase.from("meals").insert({
            user_id: config.user_id,
            date: today,
            meal_type: mealType,
            food_name: foodName,
            calories: cals,
            is_confirmed: true,
          });

          const calStr = cals ? ` (${cals} cal)` : "";
          await sendTelegramMessage(
            chatId,
            `🍽️ <b>${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</b> logged: ${foodName}${calStr}`
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Water amount: "water 500" for 500ml
        if (text?.startsWith("water ") || text?.match(/^\d+\s*ml$/i)) {
          let amount = 0;
          if (text.startsWith("water ")) {
            amount = parseInt(text.replace("water ", ""));
          } else {
            amount = parseInt(text);
          }

          if (isNaN(amount) || amount < 50 || amount > 2000) {
            await sendTelegramMessage(chatId, "❌ Invalid amount. Use: <code>water 500</code> (in ml)");
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const { data: config } = await supabase
            .from("water_reminder_configs")
            .select("user_id")
            .eq("telegram_chat_id", chatId.toString())
            .single();

          if (!config) {
            await sendTelegramMessage(chatId, "❓ Please use /start first.");
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          await supabase.from("water_logs").insert({
            user_id: config.user_id,
            amount: amount / 1000, // Convert to liters
            method: "telegram",
          });

          await sendTelegramMessage(chatId, `💧 ${amount}ml water logged!`);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // User is skipping
        if (text === "skip" || text === "later") {
          const { data: pendingLog } = await supabase
            .from("water_reminder_logs")
            .select("id")
            .eq("status", "pending")
            .order("sent_at", { ascending: false })
            .limit(1)
            .single();

          if (pendingLog) {
            await supabase
              .from("water_reminder_logs")
              .update({ status: "expired" })
              .eq("id", pendingLog.id);
          }

          await sendTelegramMessage(
            chatId,
            "⏭️ Skipped. I'll remind you again later!"
          );

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Help command
        if (text === "/help" || text === "help") {
          await sendTelegramMessage(
            chatId,
            "📋 <b>Commands:</b>\n\n" +
            "💧 <b>Water</b>\n" +
            "• <code>done</code> - Log 250ml\n" +
            "• <code>water 500</code> - Log specific ml\n\n" +
            "🍽️ <b>Meals</b>\n" +
            "• <code>meal pizza 500</code> - Log meal + calories\n" +
            "• <code>meal salad</code> - Log meal (no calories)\n\n" +
            "⚖️ <b>Weight</b>\n" +
            "• <code>weight 75.5</code> - Log weight in kg"
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Send reminder to a specific user
    if (action === "send-reminder") {
      const { userId, attempt = 1 } = await req.json();

      const { data: config } = await supabase
        .from("water_reminder_configs")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!config || !config.telegram_chat_id) {
        return new Response(
          JSON.stringify({ error: "No active config or chat_id not set" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const attemptMessages = [
        "💧 <b>Time to hydrate!</b>\n\nDrink a glass of water (250ml) now.\n\nReply <b>done</b> when finished!",
        "💧 <b>Reminder #2</b>\n\nDon't forget to drink water!\n\nReply <b>done</b> to confirm.",
        "💧 <b>Final reminder!</b>\n\nPlease drink some water now. Stay healthy!\n\nReply <b>done</b> when done.",
      ];

      const message = attemptMessages[Math.min(attempt - 1, 2)];
      const success = await sendTelegramMessage(config.telegram_chat_id, message);

      if (success) {
        // Log the reminder
        await supabase.from("water_reminder_logs").insert({
          user_id: userId,
          attempt_number: attempt,
          status: "pending",
        });
      }

      return new Response(JSON.stringify({ success }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Process follow-up reminders (called by cron or scheduler)
    if (action === "process-followups") {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Find pending reminders that need follow-up
      const { data: pendingLogs } = await supabase
        .from("water_reminder_logs")
        .select("*, water_reminder_configs!inner(user_id, telegram_chat_id, is_active)")
        .eq("status", "pending")
        .lt("sent_at", fiveMinutesAgo)
        .lt("attempt_number", 3);

      if (pendingLogs && pendingLogs.length > 0) {
        for (const log of pendingLogs) {
          if (!log.water_reminder_configs.is_active) continue;

          const nextAttempt = log.attempt_number + 1;

          // Mark old as expired
          await supabase
            .from("water_reminder_logs")
            .update({ status: "expired" })
            .eq("id", log.id);

          // Send next attempt
          const attemptMessages = [
            "",
            "💧 <b>Reminder #2</b>\n\nDon't forget to drink water!\n\nReply <b>done</b> to confirm.",
            "💧 <b>Final reminder!</b>\n\nPlease drink some water now. Stay healthy!\n\nReply <b>done</b> when done.",
          ];

          const success = await sendTelegramMessage(
            log.water_reminder_configs.telegram_chat_id,
            attemptMessages[nextAttempt - 1]
          );

          if (success) {
            await supabase.from("water_reminder_logs").insert({
              user_id: log.water_reminder_configs.user_id,
              attempt_number: nextAttempt,
              status: "pending",
            });
          }
        }
      }

      return new Response(JSON.stringify({ processed: pendingLogs?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Send scheduled reminders (called by cron)
    if (action === "send-scheduled") {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      // Get all active configs within active hours
      const { data: configs } = await supabase
        .from("water_reminder_configs")
        .select("*")
        .eq("is_active", true)
        .not("telegram_chat_id", "is", null);

      if (!configs) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sent = 0;

      for (const config of configs) {
        // Check if within active hours
        if (currentTime < config.start_time || currentTime > config.end_time) {
          continue;
        }

        // Check if enough time has passed since last reminder
        const { data: lastLog } = await supabase
          .from("water_reminder_logs")
          .select("sent_at")
          .eq("user_id", config.user_id)
          .order("sent_at", { ascending: false })
          .limit(1)
          .single();

        const minsSinceLastReminder = lastLog
          ? (Date.now() - new Date(lastLog.sent_at).getTime()) / (1000 * 60)
          : Infinity;

        if (minsSinceLastReminder >= config.frequency_minutes) {
          const success = await sendTelegramMessage(
            config.telegram_chat_id,
            "💧 <b>Time to hydrate!</b>\n\nDrink a glass of water (250ml) now.\n\nReply <b>done</b> when finished!"
          );

          if (success) {
            await supabase.from("water_reminder_logs").insert({
              user_id: config.user_id,
              attempt_number: 1,
              status: "pending",
            });
            sent++;
          }
        }
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Test the bot connection
    if (action === "test") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: config } = await supabase
        .from("water_reminder_configs")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!config || !config.telegram_chat_id) {
        return new Response(
          JSON.stringify({ error: "No chat ID found. Please message @FitTrackWaterBot first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const success = await sendTelegramMessage(
        config.telegram_chat_id,
        "🔔 <b>Test message from FitTrack!</b>\n\nYour Telegram connection is working correctly. 🎉"
      );

      return new Response(JSON.stringify({ success }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Setup webhook automatically
    if (action === "setup-webhook") {
      if (!TELEGRAM_BOT_TOKEN) {
        return new Response(
          JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-water-reminder`;
      
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: webhookUrl }),
          }
        );

        const data = await response.json();
        console.log("Webhook setup response:", data);

        if (data.ok) {
          return new Response(
            JSON.stringify({ success: true, message: "Webhook configured successfully!", webhook_url: webhookUrl }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: data.description || "Failed to set webhook" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error) {
        console.error("Webhook setup error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to configure webhook" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Action: Send weekly progress report
    if (action === "send-weekly-report") {
      const { userId } = await req.json().catch(() => ({}));

      // If userId specified, send to that user; otherwise send to all active users
      let configs;
      if (userId) {
        const { data } = await supabase
          .from("water_reminder_configs")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .not("telegram_chat_id", "is", null);
        configs = data;
      } else {
        const { data } = await supabase
          .from("water_reminder_configs")
          .select("*")
          .eq("is_active", true)
          .not("telegram_chat_id", "is", null);
        configs = data;
      }

      if (!configs || configs.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sent = 0;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      for (const config of configs) {
        // Get water logs for the past week
        const { data: waterLogs } = await supabase
          .from("water_logs")
          .select("amount, timestamp")
          .eq("user_id", config.user_id)
          .gte("timestamp", oneWeekAgo);

        // Get workouts for the past week
        const { data: workouts } = await supabase
          .from("workouts")
          .select("id, day_name, date")
          .eq("user_id", config.user_id)
          .gte("date", oneWeekAgo.split('T')[0]);

        // Get habits data
        const workoutIds = workouts?.map(w => w.id) || [];
        let habits: any[] = [];
        if (workoutIds.length > 0) {
          const { data: habitsData } = await supabase
            .from("habits")
            .select("pullups, water_intake, sleep_hours, energy_level")
            .in("workout_id", workoutIds);
          habits = habitsData || [];
        }

        // Calculate stats
        const totalWaterL = (waterLogs || []).reduce((sum, log) => sum + Number(log.amount || 0), 0);
        const avgDailyWater = totalWaterL / 7;
        const workoutCount = workouts?.length || 0;
        const totalPullups = habits.reduce((sum, h) => sum + (h.pullups || 0), 0);
        const avgSleep = habits.length > 0 
          ? habits.reduce((sum, h) => sum + Number(h.sleep_hours || 0), 0) / habits.length 
          : 0;
        const avgEnergy = habits.length > 0
          ? habits.reduce((sum, h) => sum + (h.energy_level || 0), 0) / habits.length
          : 0;

        // Build report message
        let report = "📊 <b>WEEKLY PROGRESS REPORT</b>\n\n";
        
        // Hydration
        report += "💧 <b>Hydration</b>\n";
        report += `• Total: ${totalWaterL.toFixed(1)}L\n`;
        report += `• Daily avg: ${avgDailyWater.toFixed(2)}L\n`;
        const waterGoal = 3; // 3L daily goal
        const hydrationScore = Math.min(100, (avgDailyWater / waterGoal) * 100);
        report += `• Goal progress: ${hydrationScore.toFixed(0)}%\n\n`;

        // Workouts
        report += "🏋️ <b>Training</b>\n";
        report += `• Sessions: ${workoutCount}/6\n`;
        if (workouts && workouts.length > 0) {
          const dayNames = workouts.map(w => w.day_name).join(", ");
          report += `• Completed: ${dayNames}\n`;
        }
        report += `• Pull-ups: ${totalPullups}\n\n`;

        // Recovery
        if (habits.length > 0) {
          report += "😴 <b>Recovery</b>\n";
          report += `• Avg sleep: ${avgSleep.toFixed(1)}h\n`;
          report += `• Avg energy: ${avgEnergy.toFixed(1)}/10\n\n`;
        }

        // Insight
        report += "💡 <b>Insight:</b> ";
        if (workoutCount >= 5) {
          report += "Excellent consistency! Keep pushing.";
        } else if (workoutCount >= 3) {
          report += "Good effort! Aim for 1-2 more sessions next week.";
        } else if (workoutCount > 0) {
          report += "Room for improvement. Try to hit at least 4 sessions.";
        } else {
          report += "No workouts logged. Let's get back on track!";
        }

        if (avgDailyWater < 2) {
          report += " 🚰 Drink more water!";
        }

        const success = await sendTelegramMessage(config.telegram_chat_id, report);
        if (success) sent++;
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in telegram-water-reminder:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
