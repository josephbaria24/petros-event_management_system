// Base Event type
export type Event = {
  id: string
  name: string
  description?: string
  teams_join_url?: string
  teams_meeting_id?: string
  type: string
  topics?: string[]
  price: number
  venue: string
  schedule: DaySchedule[]
  attendees: number // This can be a single number for backwards compatibility
  createdAt: string
  magic_link?: string
  start_date?: string
  end_date?: string
}

// Extended Event type with detailed attendee stats
export type EventWithStats = Omit<Event, "attendees"> & {
  attendees: {
    registered: number
    attended: number
    paid: number
  }
}

export interface DaySchedule {
  date: string
  timeIn: string
  timeOut: string
  coveredTopics: string[]
}