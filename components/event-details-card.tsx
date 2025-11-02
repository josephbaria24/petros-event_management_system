"use client"

import { useState } from "react"
import { Edit2, MoreVertical, FileUp, Award, Download, BarChart3, Upload, UserPlus, Mail, Palette, Users, CheckCircle2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import type { Event } from "@/types/event"
import SendEvaluationsModal from "@/components/send-evaluation-modal"
import CertificateTemplateModal from "@/components/certificate-template-modal"
import ExportAttendeesModal from "@/components/export-attendees-modal"
import { supabase } from "@/lib/supabase-client"

// Extended Event type with stats
type EventWithStats = Omit<Event, "attendees"> & {
  attendees: {
    registered: number
    attended: number
    paid: number
  }
}

export function EventDetailsCard({ event }: { event: EventWithStats }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedEvent, setEditedEvent] = useState(event)
  const [topicInput, setTopicInput] = useState("")
  
  const handleSave = async () => {
    const { error } = await supabase
      .from('events')
      .update({ 
        name: editedEvent.name,
        venue: editedEvent.venue,
        price: editedEvent.price,
        description: editedEvent.description
      })
      .eq('id', event.id)
    
    if (error) {
      console.error('Error updating event:', error)
      alert('Failed to save changes')
    } else {
      setIsEditing(false)
    }
  }
  
  const [showSendEvaluationsModal, setShowSendEvaluationsModal] = useState(false)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  const actions = [
    { label: "Open Registration", icon: UserPlus },
    { label: "Edit Certificate Template", icon: Palette },
    { label: "Send Evaluations", icon: Mail },
    { label: "Export Attendees", icon: Download },
    { label: "Download Certificates", icon: Award },
    { label: "Download Badges", icon: FileUp },
    { label: "Show Evaluation Results", icon: BarChart3 },
    { label: "Upload Attendees", icon: Upload },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Manage event information</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsEditing(!isEditing)} className="rounded-lg">
            <Edit2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-lg bg-transparent">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <DropdownMenuItem
                    key={action.label}
                    className="cursor-pointer"
                    onClick={async () => {
                      if (action.label === "Open Registration") {
                        if (!event.magic_link) {
                          alert("⚠️ This event doesn't have a registration link yet.")
                          return
                        }
                        window.open(`/register?ref=${event.magic_link}`, "_blank")
                      }
                      if (action.label === "Edit Certificate Template") {
                        setShowTemplateEditor(true)
                      }
                      if (action.label === "Send Evaluations") {
                        setShowSendEvaluationsModal(true)
                      }
                      if (action.label === "Export Attendees") {
                        setShowExportModal(true)
                      }
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4 hover:text-white" />
                    <span>{action.label}</span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Event Name</label>
                <input
                  type="text"
                  value={editedEvent.name}
                  onChange={(e) => setEditedEvent({ ...editedEvent, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <Textarea
                  value={editedEvent.description || ""}
                  onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                  placeholder="Enter event description..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Venue</label>
                <input
                  type="text"
                  value={editedEvent.venue}
                  onChange={(e) => setEditedEvent({ ...editedEvent, venue: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Price</label>
                <input
                  type="number"
                  value={editedEvent.price}
                  onChange={(e) => setEditedEvent({ ...editedEvent, price: Number.parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditedEvent(event)
                    setIsEditing(false)
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex-1 bg-primary text-primary-foreground hover:bg-accent">
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Event Name</p>
                <p className="text-lg font-semibold text-foreground">{editedEvent.name}</p>
              </div>

              {editedEvent.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-foreground whitespace-pre-wrap">{editedEvent.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="font-semibold text-foreground">{editedEvent.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <p className="font-semibold text-foreground">₱{editedEvent.price.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Venue</p>
                <p className="font-semibold text-foreground">{editedEvent.venue}</p>
              </div>

              {editedEvent.schedule && editedEvent.schedule.length > 0 ? (
                <div className="space-y-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Schedule</p>
                  {editedEvent.schedule.map((sched, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Date</label>
                        <input
                          type="date"
                          value={sched.date}
                          onChange={(e) => {
                            const updated = [...editedEvent.schedule]
                            updated[index].date = e.target.value
                            setEditedEvent({ ...editedEvent, schedule: updated })
                          }}
                          className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Time-In</label>
                        <input
                          type="time"
                          value={sched.timeIn}
                          onChange={(e) => {
                            const updated = [...editedEvent.schedule]
                            updated[index].timeIn = e.target.value
                            setEditedEvent({ ...editedEvent, schedule: updated })
                          }}
                          className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Time-Out</label>
                        <input
                          type="time"
                          value={sched.timeOut}
                          onChange={(e) => {
                            const updated = [...editedEvent.schedule]
                            updated[index].timeOut = e.target.value
                            setEditedEvent({ ...editedEvent, schedule: updated })
                          }}
                          className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditedEvent({
                        ...editedEvent,
                        schedule: [
                          ...editedEvent.schedule,
                          {
                            date: "",
                            timeIn: "",
                            timeOut: "",
                            coveredTopics: [],
                          },
                        ],
                      })
                    }
                  >
                    + Add Another Day
                  </Button>
                </div>
              ) : (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">No schedule available</p>
                </div>
              )}

              <div className="space-y-2 border-t border-border pt-4">
                <label className="text-sm font-medium text-muted-foreground">Covered Topics</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a topic"
                    className="flex-1 rounded border border-input px-2 py-1 text-sm"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        if (editedEvent.schedule.length === 0) return
                        const newSchedule = [...editedEvent.schedule]
                        newSchedule[0].coveredTopics.push(topicInput.trim())
                        setEditedEvent({ ...editedEvent, schedule: newSchedule })
                        setTopicInput("")
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                      if (editedEvent.schedule.length === 0) return
                      const newSchedule = [...editedEvent.schedule]
                      newSchedule[0].coveredTopics.push(topicInput.trim())
                      setEditedEvent({ ...editedEvent, schedule: newSchedule })
                      setTopicInput("")
                    }}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {editedEvent.schedule.length > 0 && editedEvent.schedule[0].coveredTopics?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editedEvent.schedule[0].coveredTopics.map((topic, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                        >
                          {topic}
                          <button
                            type="button"
                            onClick={() => {
                              const newSchedule = [...editedEvent.schedule]
                              newSchedule[0].coveredTopics = newSchedule[0].coveredTopics.filter((_, i) => i !== index)
                              setEditedEvent({ ...editedEvent, schedule: newSchedule })
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 📊 Attendee Stats Section */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-3">Attendee Statistics</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <Users className="h-5 w-5 mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{event.attendees.registered}</p>
                    <p className="text-xs text-muted-foreground">Registered</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{event.attendees.attended}</p>
                    <p className="text-xs text-muted-foreground">Attended</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <CreditCard className="h-5 w-5 mx-auto text-amber-600 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{event.attendees.paid}</p>
                    <p className="text-xs text-muted-foreground">Paid</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <SendEvaluationsModal
        eventId={Number(event.id)}
        open={showSendEvaluationsModal}
        onClose={() => setShowSendEvaluationsModal(false)}
        supabase={supabase} 
      />

      <CertificateTemplateModal
        eventId={Number(event.id)}
        open={showTemplateEditor}
        onClose={() => setShowTemplateEditor(false)}
      />

      <ExportAttendeesModal
        eventId={Number(event.id)}
        eventName={event.name}
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </Card>
  )
}