"use client"

import { useEffect, useState } from "react"
import { UserPlus, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-client"

interface AddAttendeeModalProps {
  eventId: number
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const emptyForm = {
  personal_name: "",
  middle_name: "",
  last_name: "",
  name_extension: "",
  email: "",
  mobile_number: "",
  date_of_birth: "",
  address: "",
  company: "",
  position: "",
  company_address: "",
  status: "Pending",
  payment_status: "Pending",
}

function generateReferenceId() {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 7)
  return `${timestamp}-${randomStr}`.toUpperCase()
}

export default function AddAttendeeModal({ eventId, open, onClose, onSuccess }: AddAttendeeModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(emptyForm)
      setError(null)
    }
  }, [open])

  const handleClose = () => {
    setForm(emptyForm)
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.personal_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.")
      return
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: insertError } = await supabase.from("attendees").insert({
        event_id: eventId,
        personal_name: form.personal_name.trim(),
        middle_name: form.middle_name.trim() || null,
        last_name: form.last_name.trim(),
        name_extension: form.name_extension.trim() || null,
        email: form.email.trim() || null,
        mobile_number: form.mobile_number.trim() || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address.trim() || null,
        company: form.company.trim() || null,
        position: form.position.trim() || null,
        company_address: form.company_address.trim() || null,
        status: form.status,
        payment_status: form.payment_status,
        reference_id: generateReferenceId(),
        attendance: [],
        payments: [],
        hasevaluation: false,
        hassentevaluation: false,
        roles: [],
      })

      if (insertError) {
        throw new Error(insertError.message)
      }

      onSuccess?.()
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add attendee")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Attendee
          </DialogTitle>
          <DialogDescription>
            Enter the attendee&apos;s details. First name and last name are required.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="add_personal_name">First Name *</Label>
              <Input
                id="add_personal_name"
                value={form.personal_name}
                onChange={(e) => setForm({ ...form, personal_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add_middle_name">Middle Name</Label>
              <Input
                id="add_middle_name"
                value={form.middle_name}
                onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add_last_name">Last Name *</Label>
              <Input
                id="add_last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add_name_extension">Name Extension</Label>
              <Input
                id="add_name_extension"
                placeholder="Jr., Sr., III"
                value={form.name_extension}
                onChange={(e) => setForm({ ...form, name_extension: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add_email">Email</Label>
              <Input
                id="add_email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add_mobile_number">Mobile Number</Label>
              <Input
                id="add_mobile_number"
                value={form.mobile_number}
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add_date_of_birth">Date of Birth</Label>
              <Input
                id="add_date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add_address">Address</Label>
              <Input
                id="add_address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add_company">Company</Label>
              <Input
                id="add_company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add_position">Position</Label>
              <Input
                id="add_position"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="add_company_address">Company Address</Label>
            <Input
              id="add_company_address"
              value={form.company_address}
              onChange={(e) => setForm({ ...form, company_address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Registration Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select
                value={form.payment_status}
                onValueChange={(value) => setForm({ ...form, payment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Fully Paid">Fully Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Adding..." : "Add Attendee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
