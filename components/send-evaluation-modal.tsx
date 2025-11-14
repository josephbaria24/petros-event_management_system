"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2, Clock, TrendingUp, Users, Filter } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SendEvaluationsModalProps {
  eventId: number
  open: boolean
  onClose: () => void
  supabase: any
}

interface SendResult {
  successful: Array<{ id: number; name: string; email: string }>
  failed: Array<{ id: number; name: string; email: string; error: string }>
}

interface Attendee {
  id: number
  personal_name: string
  last_name: string
  email: string
  hassentevaluation: boolean
  hasevaluation: boolean
  payment_status?: string
  roles?: string[]
  attendance?: Record<string, boolean> | null
}

export default function SendEvaluationsModal({
  eventId,
  open,
  onClose,
  supabase,
}: SendEvaluationsModalProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [result, setResult] = useState<SendResult | null>(null)
  const [showOnlyAttendees, setShowOnlyAttendees] = useState(false)
  const [hideAlreadySent, setHideAlreadySent] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(false)

  // Fetch attendees
  useEffect(() => {
    if (!open) return
    const fetchAttendees = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("attendees")
        .select(
          "id, personal_name, last_name, email, hassentevaluation, hasevaluation, payment_status, roles, attendance"
        )
        .eq("event_id", eventId)
      if (!error && data) setAttendees(data)
      setLoading(false)
    }
    fetchAttendees()
    setResult(null)
  }, [eventId, open, supabase])

  // Helper for days present
  const countDaysPresent = (attendance: Record<string, boolean> | null | undefined) => {
    if (!attendance) return 0
    return Object.values(attendance).filter(Boolean).length
  }

  // Filter logic
  const filteredAttendees = attendees
    .filter(a => {
      const fullName = `${a.last_name || ""}, ${a.personal_name || ""}`.toLowerCase()
      const email = (a.email || "").toLowerCase()
      const query = searchQuery.toLowerCase()
      return fullName.includes(query) || email.includes(query)
    })
    .filter(a => {
      if (!showOnlyAttendees) return true
      const days = countDaysPresent(a.attendance)
      const roles = a.roles || []
      const isAttendee = roles.some(r => r.toLowerCase() === "attendee")
      return isAttendee && days > 0
    })
    .filter(a => {
      if (hideAlreadySent && a.hassentevaluation) return false
      return true
    })
    .filter(a => {
      if (hideCompleted && a.hasevaluation) return false
      return true
    })

  // Select toggles
  const toggleSelectAll = () => {
    const filteredIds = filteredAttendees.map(a => a.id)
    if (filteredIds.every(id => selectedIds.includes(id))) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filteredIds])])
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Handle row click - toggle selection
  const handleRowClick = (id: number, e: React.MouseEvent) => {
    // Prevent toggle if clicking on the checkbox itself
    const target = e.target as HTMLInputElement
    if (target.type === 'checkbox') return
    
    toggleSelect(id)
  }

  // Email sending
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

    if (res.ok) setResult(data.result)
    else alert(`❌ Error: ${data.error || "Failed to send emails."}`)
  }

  const handleClose = () => {
    setSelectedIds([])
    setResult(null)
    onClose()
  }

  // Badge helper
  const getPaymentStatusBadge = (status?: string) => {
    const statusValue = status || "Pending"
    switch (statusValue) {
      case "Fully Paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </span>
        )
      case "Partially Paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
            <TrendingUp className="h-3 w-3" />
            Partial
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] flex flex-col rounded-xl bg-card shadow-lg" showCloseButton={false}>
        <DialogHeader className=" pb-2 ">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-bold ">
              Send Evaluations
            </DialogTitle>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`flex items-center gap-2 ${
                    (showOnlyAttendees || hideAlreadySent || hideCompleted)
                      ? "bg-primary/10 border-primary"
                      : ""
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {(showOnlyAttendees || hideAlreadySent || hideCompleted) && (
                    <span className="ml-1 px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
                      {[showOnlyAttendees, hideAlreadySent, hideCompleted].filter(Boolean).length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showOnlyAttendees}
                  onCheckedChange={setShowOnlyAttendees}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Hide Non-Attendees
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={hideAlreadySent}
                  onCheckedChange={setHideAlreadySent}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Hide Already Sent
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={hideCompleted}
                  onCheckedChange={setHideCompleted}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" />
                  Hide Completed
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-center py-6 text-gray-500">Loading attendees...</p>
        ) : result ? (
          // ✅ Results View
          <div className="flex flex-col gap-4 overflow-auto bg-card">
            <div className="space-y-3">
              {result.successful.length > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="font-semibold text-green-800 mb-2">
                      Successfully sent to {result.successful.length} attendee(s)
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.successful.map(item => (
                        <div key={item.id} className="text-sm text-green-700">
                          • {item.name} ({item.email})
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              {result.failed.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <div className="font-semibold text-red-800 mb-2">
                      ❌ Failed to send to {result.failed.length} attendee(s)
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {result.failed.map(item => (
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
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          // ✅ Main Table View
          <div className="flex flex-col h-full min-h-0 bg-card">
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full"
                disabled={sending}
              />
            </div>

            <div className="flex items-center gap-2  pb-3 mb-2">
              <input
                type="checkbox"
                checked={
                  filteredAttendees.length > 0 &&
                  filteredAttendees.every(a => selectedIds.includes(a.id))
                }
                onChange={toggleSelectAll}
                disabled={sending}
                className="accent-[#1e1b4b]"
              />
              <span className="font-medium ">Select All</span>
              <span className="text-sm ml-auto">
                {selectedIds.length} selected
              </span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto border border-gray-400 rounded-lg min-h-0">
              <div className="sticky top-0 bg-card border-b border-gray-200 font-semibold text-sm ">
                <div className="grid grid-cols-[auto_minmax(200px,2fr)_minmax(200px,300px)_minmax(120px,150px)_60px_60px_90px] gap-3 px-4 py-3">
                  <div className="flex items-center">#</div>
                  <div className="flex items-center">Name</div>
                  <div className="flex items-center">Email</div>
                  <div className="flex items-center justify-center">Role(s)</div>
                  <div className="flex items-center justify-center">Days</div>
                  <div className="flex items-center justify-center">Sent</div>
                  <div className="flex items-center justify-center">Completed</div>
                </div>
              </div>

              {filteredAttendees.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No attendees found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAttendees.map((a, i) => (
                    <div
                      key={a.id}
                      onClick={(e) => !sending && handleRowClick(a.id, e)}
                      className={`grid grid-cols-[auto_minmax(160px,2fr)_minmax(180px,280px)_minmax(120px,150px)_60px_60px_90px] gap-3 px-4 py-3 items-center transition cursor-pointer ${
                        selectedIds.includes(a.id)
                          ? 'bg-primary/10 '
                          : 'hover:bg-secondary'
                      } ${sending ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          disabled={sending}
                          className="pointer-events-none accent-primary"
                        />
                        <span className="text-sm text-gray-500">{i + 1}</span>
                      </div>

                      <div className="font-medium truncate">
                        {a.last_name}, {a.personal_name}
                      </div>

                      <div className="text-sm truncate" title={a.email || "No email"}>
                        {a.email || <span className="text-red-500 italic">No email</span>}
                      </div>

                      <div className="text-center truncate">
                        {a.roles && a.roles.length > 0 ? (
                          <span className="text-xs">{a.roles.join(", ")}</span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </div>

                      <div className="flex justify-center text-sm">
                        {countDaysPresent(a.attendance)}
                      </div>

                      <div className="flex justify-center">
                        {a.hassentevaluation ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>

                      <div className="flex justify-center">
                        {a.hasevaluation ? (
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={sendEmails}
                disabled={sending}
                className="bg-primary text-white hover:bg-[#2c2970]"
              >
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