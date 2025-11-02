// Updated AttendeesList with Attendance per Day Toggle Feature and Edit Modal
"use client"

import { useEffect, useState } from "react"
import { Calendar, Search, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase-client"

interface Attendee {
  id: number
  name: string
  email: string
  attendance: { date: number; status: string }[]
  personal_name: string
  middle_name?: string
  last_name: string
  mobile_number?: string
  date_of_birth?: string
  address?: string
  company?: string
  position?: string
  company_address?: string
}

interface EventScheduleDate {
  date: string // ISO format e.g. "2025-11-06"
}

export function AttendeesList({ eventId, scheduleDates }: { eventId: string; scheduleDates: EventScheduleDate[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null)
  const [editForm, setEditForm] = useState<Partial<Attendee>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchAttendees = async () => {
      const { data, error } = await supabase
        .from("attendees")
        .select("*")
        .eq("event_id", parseInt(eventId))

      if (data) {
        setAttendees(
          data.map((a: any) => ({
            id: a.id,
            name: `${a.personal_name ?? ""} ${a.last_name ?? ""}`.trim(),
            email: a.email ?? "",
            attendance: a.attendance || [],
            personal_name: a.personal_name,
            middle_name: a.middle_name,
            last_name: a.last_name,
            mobile_number: a.mobile_number,
            date_of_birth: a.date_of_birth,
            address: a.address,
            company: a.company,
            position: a.position,
            company_address: a.company_address
          }))
        )
      }
    }

    fetchAttendees()
  }, [eventId])

  const toggleAttendance = async (attendeeId: number, isoDate: string) => {
    const epochDate = new Date(isoDate).getTime()
  
    const attendee = attendees.find((a) => a.id === attendeeId)
    if (!attendee) return
  
    const current = attendee.attendance.find((a) => a.date === epochDate)
    let updatedAttendance = [...attendee.attendance]
  
    if (!current) {
      updatedAttendance.push({ date: epochDate, status: "Present" })
    } else if (current.status === "Present") {
      updatedAttendance = updatedAttendance.map((a) =>
        a.date === epochDate ? { ...a, status: "Absent" } : a
      )
    } else if (current.status === "Absent") {
      updatedAttendance = updatedAttendance.filter((a) => a.date !== epochDate)
    }
  
    await supabase
      .from("attendees")
      .update({ attendance: updatedAttendance })
      .eq("id", attendeeId)
  
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === attendeeId ? { ...a, attendance: updatedAttendance } : a
      )
    )
  }

  const handleEditClick = (attendee: Attendee) => {
    setEditingAttendee(attendee)
    setEditForm({
      personal_name: attendee.personal_name,
      middle_name: attendee.middle_name,
      last_name: attendee.last_name,
      email: attendee.email,
      mobile_number: attendee.mobile_number,
      date_of_birth: attendee.date_of_birth,
      address: attendee.address,
      company: attendee.company,
      position: attendee.position,
      company_address: attendee.company_address
    })
  }

  const handleSaveEdit = async () => {
    if (!editingAttendee) return
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from("attendees")
        .update({
          personal_name: editForm.personal_name,
          middle_name: editForm.middle_name,
          last_name: editForm.last_name,
          email: editForm.email,
          mobile_number: editForm.mobile_number,
          date_of_birth: editForm.date_of_birth,
          address: editForm.address,
          company: editForm.company,
          position: editForm.position,
          company_address: editForm.company_address
        })
        .eq("id", editingAttendee.id)

      if (!error) {
        // Update local state
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === editingAttendee.id
              ? {
                  ...a,
                  ...editForm,
                  name: `${editForm.personal_name} ${editForm.last_name}`.trim()
                }
              : a
          )
        )
        setEditingAttendee(null)
        alert("✅ Attendee updated successfully!")
      } else {
        alert("❌ Failed to update attendee")
      }
    } catch (error) {
      console.error("Error updating attendee:", error)
      alert("❌ Failed to update attendee")
    } finally {
      setSaving(false)
    }
  }
  
  const filteredAttendees = attendees
    .filter((attendee) => {
      const name = attendee.name ?? ""
      const email = attendee.email ?? ""
      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
    .sort((a, b) => a.id - b.id)

  const getStatusDisplay = (attendee: Attendee, date: string) => {
    const epochDate = new Date(date).getTime()
    const record = attendee.attendance.find((a) => a.date === epochDate)
    return record?.status ?? "Pending"
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Attendance Details</CardTitle>
          <div className="flex items-center gap-4">
            <CardDescription>
              Showing: {filteredAttendees.length} Results
            </CardDescription>
            <Input
              type="text"
              placeholder="Search by attendee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto border rounded-lg">
            <table className="min-w-full text-sm relative">
              <thead className="sticky top-0 bg-background z-10 border-b">
                <tr>
                  <th className="text-left py-3 px-3 font-semibold sticky left-0 bg-background">Attendee</th>
                  <th className="text-center py-3 px-3 font-semibold bg-background">Actions</th>
                  {scheduleDates.map((d) => (
                    <th key={d.date} className="text-left py-3 px-3 font-semibold bg-background">
                      {new Date(d.date).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((attendee) => (
                  <tr key={attendee.id} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-3 font-medium sticky left-0 bg-background">
                      {attendee.name}
                    </td>
                    <td className="px-3 py-3 text-center bg-background">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(attendee)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                    {scheduleDates.map((d) => (
                      <td key={d.date} className="px-3 py-3">
                        <Button
                          variant="ghost"
                          onClick={() => toggleAttendance(attendee.id, d.date)}
                          className={`rounded-full px-3 py-1 border text-xs cursor-pointer ${
                            getStatusDisplay(attendee, d.date) === "Present"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : getStatusDisplay(attendee, d.date) === "Absent"
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {getStatusDisplay(attendee, d.date)} <Calendar className="ml-1 h-3 w-3" />
                        </Button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Attendee Modal */}
      <Dialog open={!!editingAttendee} onOpenChange={() => setEditingAttendee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Attendee Information</DialogTitle>
            <DialogDescription>
              Update the attendee's personal and contact information
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Personal Information */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="personal_name">First Name *</Label>
                <Input
                  id="personal_name"
                  value={editForm.personal_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, personal_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  value={editForm.middle_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <Input
                  id="mobile_number"
                  value={editForm.mobile_number || ""}
                  onChange={(e) => setEditForm({ ...editForm, mobile_number: e.target.value })}
                />
              </div>
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={editForm.date_of_birth || ""}
                  onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={editForm.address || ""}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
            </div>

            {/* Company Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={editForm.company || ""}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={editForm.position || ""}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="company_address">Company Address</Label>
              <Input
                id="company_address"
                value={editForm.company_address || ""}
                onChange={(e) => setEditForm({ ...editForm, company_address: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingAttendee(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}