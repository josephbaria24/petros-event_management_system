"use client"

import React, { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Event } from "@/types/event"

const EVENT_TYPES = ["Conference", "Seminar", "Training", "Webinar"] as const

type EventType = typeof EVENT_TYPES[number]

interface EventFormData extends Omit<Event, "id" | "attendees" | "createdAt"> {}

export function EventModal({
  isOpen,
  onClose,
  onSubmit
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EventFormData) => void
}) {
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    type: "Conference",
    price: 0,
    venue: "",
    schedule: [
      {
        date: "2025-11-06", // or ""
        timeIn: "09:00",
        timeOut: "17:00",
        coveredTopics: []
      }
    ]
  })

  const [topicInput, setTopicInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.venue && formData.schedule[0].coveredTopics.length > 0) {
      onSubmit(formData)
      setFormData({
        name: "",
        type: "Conference",
        price: 0,
        venue: "",
        schedule: [
          {
            date: "2025-11-06", // or ""
            timeIn: "09:00",
            timeOut: "17:00",
            coveredTopics: []
          }
        ]
      })
      setTopicInput("")
    }
  }

  const addTopic = () => {
    if (topicInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        schedule: [
          {
            ...prev.schedule[0],
            coveredTopics: [...prev.schedule[0].coveredTopics, topicInput.trim()]
          }
        ]
      }))
      setTopicInput("")
    }
  }

  const removeTopic = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      schedule: [
        {
          ...prev.schedule[0],
          coveredTopics: prev.schedule[0].coveredTopics.filter((_, i) => i !== index)
        }
      ]
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>Fill in the details to create a new event</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div>
            <Label htmlFor="name" className="mb-2 block">Event Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter event name"
            />
          </div>

          {/* Event Type */}
          <div>
            <Label htmlFor="type" className="mb-2 block">Event Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as EventType })}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="price" className="mb-2 block">Price ($)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: parseFloat(e.target.value) || 0
                })
              }
              placeholder="0"
            />
          </div>

          {/* Venue */}
          <div>
            <Label htmlFor="venue" className="mb-2 block">Venue</Label>
            <Input
              id="venue"
              required
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="Enter venue"
            />
          </div>

{/* Schedule Section */}
<div className="space-y-4 border-t border-border pt-4">
  <h3 className="font-semibold text-foreground">Schedule</h3>

  {formData.schedule.map((sched, index) => (
    <div key={index} className="grid grid-cols-3 gap-4 items-end">
      <div>
        <Label>Date</Label>
        <Input
          type="date"
          value={sched.date}
          onChange={(e) => {
            const updated = [...formData.schedule]
            updated[index].date = e.target.value
            setFormData({ ...formData, schedule: updated })
          }}
        />
      </div>
      <div>
        <Label>Start Time</Label>
        <Input
          type="time"
          value={sched.timeIn}
          onChange={(e) => {
            const updated = [...formData.schedule]
            updated[index].timeIn = e.target.value
            setFormData({ ...formData, schedule: updated })
          }}
        />
      </div>
      <div>
        <Label>End Time</Label>
        <Input
          type="time"
          value={sched.timeOut}
          onChange={(e) => {
            const updated = [...formData.schedule]
            updated[index].timeOut = e.target.value
            setFormData({ ...formData, schedule: updated })
          }}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        className="text-red-500"
        onClick={() => {
          const updated = formData.schedule.filter((_, i) => i !== index)
          setFormData({ ...formData, schedule: updated })
        }}
        >
        Remove
      </Button>
      
    </div>
    
  ))}

          {/* Add Day Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                schedule: [
                  ...prev.schedule,
                  {
                    date: "",
                    timeIn: "",
                    timeOut: "",
                    coveredTopics: [],
                  },
                ],
              }))
            }
          >
            + Add Another Day
          </Button>
        </div>


          {/* Covered Topics */}
          <div className="space-y-4 border-t border-border pt-4">
            <h3 className="font-semibold text-foreground">Covered Topics</h3>

            <div className="flex gap-2">
            <Input
                disabled={formData.schedule.length === 0}
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
                placeholder="Enter topic and press Enter"
              />

              <Button
                type="button"
                onClick={addTopic}
                disabled={formData.schedule.length === 0}
              >
                Add
              </Button>

            </div>
            {formData.schedule.length > 0 && formData.schedule[0].coveredTopics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.schedule[0].coveredTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeTopic(index)}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-border pt-6">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
