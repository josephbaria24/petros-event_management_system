export type Event = {
  id: string
  name: string
  type: string
  price: number
  venue: string
  schedule: DaySchedule[]
  attendees: number
  createdAt: string
  magic_link?: string   // ✅ Add this line
  start_date?: string   // optional, matches DB
  end_date?: string     // optional, matches DB
}

export interface DaySchedule {
  date: string // change from "day" to "date"
  timeIn: string
  timeOut: string
  coveredTopics: string[]
}
