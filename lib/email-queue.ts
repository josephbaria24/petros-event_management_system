// lib/email-queue.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limits per day
const RATE_LIMITS = {
  evaluation: 40, // 40 evaluations per day (reserves 40 for auto-certificates)
  certificate: 80, // 80 direct certificates per day
  total: 100, // Total daily limit
};

interface QueueItem {
  id: number; 
  attendee_id: number;
  email: string;
  type: "evaluation" | "certificate";
  payload: any;
  status: "pending" | "sent" | "failed";
  scheduled_date: string;
  priority: number;
}

export class EmailQueueManager {
  /**
   * Add emails to queue with smart scheduling
   */
  static async addToQueue(
    items: Array<{
      attendee_id: number;
      email: string;
      type: "evaluation" | "certificate";
      payload: any;
    }>
  ): Promise<{
    immediate: number;
    queued: number;
    scheduledDates: string[];
  }> {
    const today = new Date().toISOString().split("T")[0];
    
    // Get today's email count
    const todayCount = await this.getTodayEmailCount();
    
    // Calculate available slots for this type
    const typeLimit = items[0].type === "evaluation" 
      ? RATE_LIMITS.evaluation 
      : RATE_LIMITS.certificate;
    
    const availableSlots = Math.min(
      typeLimit - todayCount[items[0].type],
      RATE_LIMITS.total - todayCount.total
    );

    // Split into immediate and queued
    const immediateItems = items.slice(0, Math.max(0, availableSlots));
    const queuedItems = items.slice(Math.max(0, availableSlots));

    // Schedule queued items across future days
    const scheduledDates = new Set<string>();
    const queueInserts: any[] = [];

    let currentDate = new Date(today);
    let dailyCount = { evaluation: 0, certificate: 0 };
    const dailyLimit = items[0].type === "evaluation" 
      ? RATE_LIMITS.evaluation 
      : RATE_LIMITS.certificate;

    for (let i = 0; i < queuedItems.length; i++) {
      // Move to next day if limit reached
      if (dailyCount[items[0].type] >= dailyLimit) {
        currentDate.setDate(currentDate.getDate() + 1);
        dailyCount = { evaluation: 0, certificate: 0 };
      }

      const scheduledDate = currentDate.toISOString().split("T")[0];
      scheduledDates.add(scheduledDate);

      queueInserts.push({
        attendee_id: queuedItems[i].attendee_id,
        email: queuedItems[i].email,
        type: queuedItems[i].type,
        payload: queuedItems[i].payload,
        status: "pending",
        scheduled_date: scheduledDate,
        priority: i,
      });

      dailyCount[items[0].type]++;
    }

    // Insert queued items
    if (queueInserts.length > 0) {
      const { error } = await supabase
        .from("email_queue")
        .insert(queueInserts);

      if (error) {
        console.error("Error adding to queue:", error);
        throw new Error("Failed to add emails to queue");
      }
    }

    return {
      immediate: immediateItems.length,
      queued: queuedItems.length,
      scheduledDates: Array.from(scheduledDates).sort(),
    };
  }
/**
 * Get today's email count by type
 */
static async getTodayEmailCount(): Promise<{
    evaluation: number;
    certificate: number;
    total: number;
  }> {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
  
    // Count from email_queue (sent today)
    const { data: queueData } = await supabase
      .from("email_queue")
      .select("type")
      .eq("status", "sent")
      .gte("last_attempt_at", today)
      .lt("last_attempt_at", tomorrowStr);
  
    const counts = {
      evaluation: 0,
      certificate: 0,
      total: 0,
    };
  
    if (queueData) {
      queueData.forEach((item: any) => {
        const itemType = item.type as string;
        if (itemType === "evaluation" || itemType === "certificate") {
          counts[itemType]++;
          counts.total++;
        }
      });
    }
  
    return counts;
  }

  /**
   * Get pending queue items for today
   */
  static async getTodaysPendingQueue(): Promise<QueueItem[]> {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .order("priority", { ascending: true });

    if (error) {
      console.error("Error fetching queue:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark queue item as sent
   */
  static async markAsSent(queueId: number) {
    const { error } = await supabase
      .from("email_queue")
      .update({
        status: "sent",
        last_attempt_at: new Date().toISOString(),
      })
      .eq("id", queueId);

    if (error) {
      console.error("Error marking as sent:", error);
    }
  }

  /**
   * Mark queue item as failed
   */
  static async markAsFailed(queueId: number) {
    const { error } = await supabase
      .from("email_queue")
      .update({
        status: "failed",
        last_attempt_at: new Date().toISOString(),
        attempt: supabase.rpc("increment", { row_id: queueId }),
      })
      .eq("id", queueId);

    if (error) {
      console.error("Error marking as failed:", error);
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    pending: number;
    pendingByDate: Record<string, number>;
    todayLimit: { used: number; limit: number };
  }> {
    const { data: pending } = await supabase
      .from("email_queue")
      .select("scheduled_date")
      .eq("status", "pending");

    const pendingByDate: Record<string, number> = {};
    (pending || []).forEach((item: any) => {
      const date = item.scheduled_date;
      pendingByDate[date] = (pendingByDate[date] || 0) + 1;
    });

    const todayCount = await this.getTodayEmailCount();

    return {
      pending: pending?.length || 0,
      pendingByDate,
      todayLimit: {
        used: todayCount.total,
        limit: RATE_LIMITS.total,
      },
    };
  }
}

// Utility function to check if we can send more emails today
export async function canSendEmailsToday(
  type: "evaluation" | "certificate",
  count: number
): Promise<{
  canSend: boolean;
  available: number;
  message: string;
}> {
  const todayCount = await EmailQueueManager.getTodayEmailCount();
  
  const typeLimit = type === "evaluation" 
    ? RATE_LIMITS.evaluation 
    : RATE_LIMITS.certificate;
  
  const available = Math.min(
    typeLimit - todayCount[type],
    RATE_LIMITS.total - todayCount.total
  );

  const canSend = available >= count;

  let message = "";
  if (!canSend) {
    message = `Rate limit reached. Can only send ${available} more ${type} emails today (${todayCount.total}/${RATE_LIMITS.total} total used). Remaining ${count - available} will be queued for tomorrow.`;
  } else {
    message = `Can send all ${count} emails. ${available - count} slots remaining today.`;
  }

  return { canSend, available, message };
}