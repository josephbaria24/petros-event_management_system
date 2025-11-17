// components/event-details-card.tsx
"use client"

import { useState } from "react"
import { Edit2, MoreVertical, FileUp, Award, Download, BarChart3, Upload, UserPlus, Mail, Palette, Users, CheckCircle2, CreditCard, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import type { Event } from "@/types/event"
import SendEvaluationsModal from "@/components/send-evaluation-modal"
import CertificateTemplateModal from "@/components/certificate-template-modal"
import ExportAttendeesModal from "@/components/export-attendees-modal"
import DownloadCertificatesModal from "@/components/download-certificates-modal"
import SendDirectCertificateModal from "@/components/send-direct-certificate-modal"
import UploadAttendeesModal from "@/components/upload-attendees-modal"
import EvaluationResultsModal from "@/components/evaluation-results-modal"
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
  
  // Get topics from the first schedule item's coveredTopics
  const currentTopics = editedEvent.schedule?.[0]?.coveredTopics || []
  
  const handleSave = async () => {
    // Extract topics from the first schedule item
    const topics = editedEvent.schedule?.[0]?.coveredTopics || []
    
    // Prepare schedules for saving
    const schedulesToSave = editedEvent.schedule.map(s => ({
      day: s.date,
      timeIn: s.timeIn,
      timeOut: s.timeOut
    }))
    
    const { error } = await supabase
      .from('events')
      .update({ 
        name: editedEvent.name,
        venue: editedEvent.venue,
        price: editedEvent.price,
        description: editedEvent.description,
        topics: topics, // Save topics to the database
        schedules: schedulesToSave // Save schedules
      })
      .eq('id', event.id)
    
    if (error) {
      console.error('Error updating event:', error)
      alert('Failed to save changes')
    } else {
      setIsEditing(false)
      alert('Event updated successfully!')
    }
  }
  
  const [showSendEvaluationsModal, setShowSendEvaluationsModal] = useState(false)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showDownloadCertificatesModal, setShowDownloadCertificatesModal] = useState(false)
  const [showSendDirectCertificateModal, setShowSendDirectCertificateModal] = useState(false)
  const [showUploadAttendeesModal, setShowUploadAttendeesModal] = useState(false)
  const [showEvaluationResultsModal, setShowEvaluationResultsModal] = useState(false)

  const actions = [
    { label: "Open Registration", icon: UserPlus },
    { label: "Edit Certificate Template", icon: Palette },
    { label: "Send Evaluations", icon: Mail },
    { label: "Send Direct Certificate", icon: Award },
    { label: "Export Attendees", icon: Download },
    { label: "Download Certificates", icon: Award },
    // { label: "Download Badges", icon: FileUp },
    { label: "Show Evaluation Results", icon: BarChart3 },
    { label: "Upload Attendees", icon: Upload },
    // { label: "Sync Teams Attendance", icon: Users }
  ]

  async function syncTeamsAttendance(eventId: string, meetingId?: string | null) {
    if (!meetingId) {
      alert("This event has no Microsoft Teams Meeting ID.");
      return;
    }
  
    try {
      const res = await fetch(`/api/teams-sync?eventId=${eventId}&meetingId=${meetingId}`);
      const result = await res.json();
  
      if (!res.ok) throw new Error(result.error);
  
      alert(`Attendance synced successfully! Updated: ${result.updatedCount} attendees.`);
  
    } catch (err: any) {
      console.error("Sync error:", err);
      alert("Failed to sync attendance. Check console.");
    }
  }

  const handleAddTopic = () => {
    if (!topicInput.trim()) return
    
    // Ensure we have at least one schedule item
    if (editedEvent.schedule.length === 0) {
      setEditedEvent({
        ...editedEvent,
        schedule: [{
          date: "",
          timeIn: "",
          timeOut: "",
          coveredTopics: [topicInput.trim()]
        }]
      })
    } else {
      const newSchedule = [...editedEvent.schedule]
      newSchedule[0] = {
        ...newSchedule[0],
        coveredTopics: [...(newSchedule[0].coveredTopics || []), topicInput.trim()]
      }
      setEditedEvent({ ...editedEvent, schedule: newSchedule })
    }
    setTopicInput("")
  }

  const handleRemoveTopic = (index: number) => {
    if (editedEvent.schedule.length === 0) return
    
    const newSchedule = [...editedEvent.schedule]
    newSchedule[0] = {
      ...newSchedule[0],
      coveredTopics: newSchedule[0].coveredTopics.filter((_, i) => i !== index)
    }
    setEditedEvent({ ...editedEvent, schedule: newSchedule })
  }

  const handleRemoveSchedule = (index: number) => {
    const newSchedule = editedEvent.schedule.filter((_, i) => i !== index)
    setEditedEvent({ ...editedEvent, schedule: newSchedule })
  }

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
                      if (action.label === "Download Certificates") {
                        setShowDownloadCertificatesModal(true)
                      }
                      if (action.label === "Send Direct Certificate") {
                        setShowSendDirectCertificateModal(true)
                      }
                      if (action.label === "Upload Attendees") {
                        setShowUploadAttendeesModal(true)
                      }
                      if (action.label === "Show Evaluation Results") {
                        setShowEvaluationResultsModal(true)
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Event Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEvent.name}
                  onChange={(e) => setEditedEvent({ ...editedEvent, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <p className="text-lg font-semibold text-foreground">{editedEvent.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              {isEditing ? (
                <Textarea
                  value={editedEvent.description || ""}
                  onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                  placeholder="Enter event description..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]"
                />
              ) : (
                editedEvent.description && (
                  <p className="text-foreground whitespace-pre-wrap">{editedEvent.description}</p>
                )
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                <p className="font-semibold text-foreground">{editedEvent.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Price</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedEvent.price}
                    onChange={(e) => setEditedEvent({ ...editedEvent, price: Number.parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : (
                  <p className="font-semibold text-foreground">₱{editedEvent.price.toLocaleString()}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Venue</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedEvent.venue}
                  onChange={(e) => setEditedEvent({ ...editedEvent, venue: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <p className="font-semibold text-foreground">{editedEvent.venue}</p>
              )}
            </div>

            {/* Schedule Section */}
            <div className="space-y-4 border-t border-border pt-4">
              <label className="text-sm font-medium text-foreground">Schedule</label>
              
              {editedEvent.schedule && editedEvent.schedule.length > 0 ? (
                <div className="space-y-3">
                  {editedEvent.schedule.map((sched, index) => (
                    <div key={index} className="space-y-2">
                      <div className="grid grid-cols-3 gap-4 items-end">
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
                            disabled={!isEditing}
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
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
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
                              disabled={!isEditing}
                            />
                          </div>
                          {isEditing && editedEvent.schedule.length > 1 && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8 mt-4"
                              onClick={() => handleRemoveSchedule(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isEditing && (
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
                              coveredTopics: currentTopics, // Share the same topics
                            },
                          ],
                        })
                      }
                    >
                      + Add Another Day
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No schedule available</p>
              )}
            </div>

            {/* Covered Topics Section */}
            <div className="space-y-2 border-t border-border pt-4">
              <label className="text-sm font-medium text-foreground">Covered Topics</label>
              
              {isEditing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a topic"
                    className="flex-1 rounded border text-blue-500 border-input bg-background px-2 py-1 text-sm"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddTopic()
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleAddTopic}
                  >
                    Add
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {currentTopics.length > 0 ? (
                  currentTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm dark:text-blue-400 text-blue-500"
                    >
                      {topic}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(index)}
                          className="ml-1 hover:text-primary/70"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No topics added yet</p>
                )}
              </div>
            </div>

            {/* 📊 Attendee Stats Section */}
            {!isEditing && (
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
            )}

            {/* Action Buttons */}
            {isEditing && (
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
            )}
          </div>
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

      <DownloadCertificatesModal
        eventId={Number(event.id)}
        eventName={event.name}
        open={showDownloadCertificatesModal}
        onClose={() => setShowDownloadCertificatesModal(false)}
      />

      <SendDirectCertificateModal
        eventId={Number(event.id)}
        eventName={event.name}
        scheduleDates={editedEvent.schedule || []}
        open={showSendDirectCertificateModal}
        onClose={() => setShowSendDirectCertificateModal(false)}
      />

      <UploadAttendeesModal
        eventId={Number(event.id)}
        open={showUploadAttendeesModal}
        onClose={() => setShowUploadAttendeesModal(false)}
        onSuccess={() => {
          // Optionally refresh the page or update attendee stats
          window.location.reload()
        }}
      />

      <EvaluationResultsModal
        eventId={Number(event.id)}
        eventName={event.name}
        open={showEvaluationResultsModal}
        onClose={() => setShowEvaluationResultsModal(false)}
      />
    </Card>
  )
}