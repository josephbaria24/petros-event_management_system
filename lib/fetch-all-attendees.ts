// lib/fetch-all-attendees.ts
import { supabase } from "@/lib/supabase-client"

/**
 * Fetches all attendees from Supabase without the 1000 row limit
 * Uses pagination to handle large datasets
 */
export async function fetchAllAttendees(eventId?: number) {
  const PAGE_SIZE = 1000
  let allAttendees: any[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("attendees")
      .select("event_id, attendance, payment_status")
      .range(from, to)

    // If eventId is provided, filter by it
    if (eventId !== undefined) {
      query = query.eq("event_id", eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching attendees:", error)
      throw error
    }

    if (data && data.length > 0) {
      allAttendees = [...allAttendees, ...data]
      
      // If we got less than PAGE_SIZE, we've reached the end
      if (data.length < PAGE_SIZE) {
        hasMore = false
      } else {
        page++
      }
    } else {
      hasMore = false
    }
  }

  return allAttendees
}

/**
 * Alternative: Use Supabase's streaming/pagination with proper count
 * Best for extremely large datasets (10,000+ rows)
 */
export async function fetchAllAttendeesStream(eventId?: number) {
  // First, get the total count
  let countQuery = supabase
    .from("attendees")
    .select("*", { count: "exact", head: true })

  if (eventId !== undefined) {
    countQuery = countQuery.eq("event_id", eventId)
  }

  const { count, error: countError } = await countQuery

  if (countError) {
    console.error("Error counting attendees:", countError)
    throw countError
  }

  if (!count || count === 0) {
    return []
  }

  // Now fetch all data in batches
  const PAGE_SIZE = 1000
  const totalPages = Math.ceil(count / PAGE_SIZE)
  const allAttendees: any[] = []

  for (let page = 0; page < totalPages; page++) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from("attendees")
      .select("event_id, attendance, payment_status")
      .range(from, to)

    if (eventId !== undefined) {
      query = query.eq("event_id", eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching attendees batch:", error)
      throw error
    }

    if (data) {
      allAttendees.push(...data)
    }
  }

  return allAttendees
}