"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface SendEvaluationsModalProps {
  eventId: number
  open: boolean
  onClose: () => void
  supabase: any // Pass supabase client as prop
}

interface SendResult {
  successful: Array<{ id: number; name: string; email: string }>
  failed: Array<{ id: number; name: string; email: string; error: string }>
}

export default function SendEvaluationsModal({ eventId, open, onClose, supabase }: SendEvaluationsModalProps) {
  const [attendees, setAttendees] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [result, setResult] = useState<SendResult | null>(null)

  // Fetch attendees
  useEffect(() => {
    if (!open) return
    const fetchAttendees = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("attendees")
        .select("id, personal_name, last_name, email, hassentevaluation")
        .eq("event_id", eventId)
      if (!error && data) setAttendees(data)
      setLoading(false)
    }
    fetchAttendees()
    // Reset states when modal opens
    setResult(null)
  }, [eventId, open, supabase])

  // Filter attendees based on search
  const filteredAttendees = attendees.filter(a => {
    const fullName = `${a.last_name || ''}, ${a.personal_name || ''}`.toLowerCase()
    const email = (a.email || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  // Select all toggle (filtered)
  const toggleSelectAll = () => {
    const filteredIds = filteredAttendees.map(a => a.id)
    if (filteredIds.every(id => selectedIds.includes(id))) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filteredIds])])
    }
  }

  // Individual checkbox toggle
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  // Send emails
  const sendEmails = async () => {
    if (!selectedIds.length) {
      alert("Please select at least one attendee.")
      return
    }

    setSending(true)
    setResult(null)

    const res = await fetch("/api/send-evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, attendeeIds: selectedIds }),
    })

    const data = await res.json()
    setSending(false)

    if (res.ok) {
      setResult(data.result)
    } else {
      alert(`❌ Error: ${data.error || "Failed to send emails."}`)
    }
  }

  const handleClose = () => {
    setSelectedIds([])
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col rounded-xl">
        <DialogHeader>
          <DialogTitle>Send Evaluations</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p>Loading attendees...</p>
        ) : result ? (
          // Show results
          <div className="flex flex-col gap-4 overflow-auto">
            <div className="space-y-3">
              {/* Success section */}
              {result.successful.length > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="font-semibold text-green-800 mb-2">
                      Successfully sent to {result.successful.length} attendee(s)
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.successful.map((item) => (
                        <div key={item.id} className="text-sm text-green-700">
                          • {item.name} ({item.email})
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Failed section */}
              {result.failed.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <div className="font-semibold text-red-800 mb-2">
                      ❌ Failed to send to {result.failed.length} attendee(s)
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {result.failed.map((item) => (
                        <div key={item.id} className="text-sm">
                          <div className="font-medium text-red-700">
                            • {item.name} ({item.email})
                          </div>
                          <div className="text-red-600 ml-3 text-xs">
                            Reason: {item.error}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0">
            {/* Search bar */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                disabled={sending}
              />
            </div>

            {/* Select all */}
            <div className="flex items-center gap-2 border-b pb-3 mb-2">
              <input
                type="checkbox"
                checked={
                  filteredAttendees.length > 0 &&
                  filteredAttendees.every(a => selectedIds.includes(a.id))
                }
                onChange={toggleSelectAll}
                disabled={sending}
              />
              <span className="font-medium">Select All</span>
              <span className="text-sm text-gray-500 ml-auto">
                {selectedIds.length} selected
              </span>
            </div>

            {/* Progress indicator */}
            {sending && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">
                    Sending emails to {selectedIds.length} attendee(s)... Please wait.
                  </span>
                </div>
              </div>
            )}

            {/* Scrollable attendee list */}
            <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0">
              {filteredAttendees.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No attendees found
                </div>
              ) : (
                filteredAttendees.map((a, i) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        disabled={sending}
                      />
                      <span className="font-medium">
                        {i + 1}. {a.last_name}, {a.personal_name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600 truncate max-w-[220px]">
                      {a.email || <span className="text-red-500 italic">No email</span>}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={sendEmails} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  "Send Evaluations"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}