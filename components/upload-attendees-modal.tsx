// components/upload-attendees-modal.tsx
"use client"

import { useState } from "react"
import { X, Upload, AlertCircle, CheckCircle2, FileSpreadsheet, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-client"
import * as XLSX from "xlsx"

interface UploadAttendeesModalProps {
  eventId: number
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface AttendeeRow {
  personal_name: string
  middle_name?: string
  last_name: string
  email?: string
  mobile_number?: string
  date_of_birth?: string
  address?: string
  company?: string
  position?: string
  company_address?: string
  status?: string
  payment_status?: string
}

export default function UploadAttendeesModal({ eventId, open, onClose, onSuccess }: UploadAttendeesModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [preview, setPreview] = useState<AttendeeRow[]>([])

  const requiredHeaders = [
    { field: "personal_name", required: true, description: "First Name" },
    { field: "last_name", required: true, description: "Last Name" },
    { field: "email", description: "Email Address" },
  ]

  const optionalHeaders = [
    { field: "middle_name", description: "Middle Name" },
    
    { field: "mobile_number", description: "Mobile Number" },
    { field: "date_of_birth", description: "Date of Birth (YYYY-MM-DD)" },
    { field: "address", description: "Address" },
    { field: "company", description: "Company" },
    { field: "position", description: "Position" },
    { field: "company_address", description: "Company Address" },
    { field: "status", description: "Status (default: Pending)" },
    { field: "payment_status", description: "Payment Status (default: Pending)" },
  ]

  const downloadTemplate = () => {
    const headers = [
      "personal_name",
      "middle_name",
      "last_name",
      "email",
      "mobile_number",
      "date_of_birth",
      "address",
      "company",
      "position",
      "company_address",
      "status",
      "payment_status"
    ]

    const sampleData = [
      [
        "Juan",
        "Dela",
        "Cruz",
        "juan.delacruz@email.com",
        "+639123456789",
        "1990-01-15",
        "123 Main St, Manila",
        "ABC Corp",
        "Manager",
        "456 Business Ave, Makati",
        "Confirmed",
        "Paid"
      ]
    ]

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Attendees Template")
    XLSX.writeFile(wb, "attendees_template.xlsx")
  }

  const parseFile = async (file: File): Promise<AttendeeRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "binary" })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[]

          // Normalize headers (convert to lowercase and replace spaces with underscores)
          const normalized = jsonData.map((row) => {
            const normalizedRow: any = {}
            Object.keys(row).forEach((key) => {
              const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_")
              normalizedRow[normalizedKey] = row[key]
            })
            return normalizedRow
          })

          resolve(normalized)
        } catch (err) {
          reject(new Error("Failed to parse file. Please ensure it's a valid CSV or Excel file."))
        }
      }

      reader.onerror = () => reject(new Error("Failed to read file"))

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file)
      } else {
        reader.readAsBinaryString(file)
      }
    })
  }

  const validateRows = (rows: AttendeeRow[]): string | null => {
    if (rows.length === 0) {
      return "File is empty. Please add at least one attendee."
    }

    // Check for required fields
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.personal_name || !row.last_name) {
        return `Row ${i + 2}: Missing required fields (personal_name or last_name)`
      }

      // Validate date format if provided
      if (row.date_of_birth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(row.date_of_birth)) {
          return `Row ${i + 2}: Invalid date format for date_of_birth. Use YYYY-MM-DD`
        }
      }

      // Validate email format if provided
      if (row.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(row.email)) {
          return `Row ${i + 2}: Invalid email format`
        }
      }
    }

    return null
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError(null)
    setSuccess(null)
    setPreview([])

    // Validate file type
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
    
    if (!validTypes.includes(selectedFile.type) && 
        !selectedFile.name.endsWith(".csv") && 
        !selectedFile.name.endsWith(".xlsx") && 
        !selectedFile.name.endsWith(".xls")) {
      setError("Invalid file type. Please upload a CSV or Excel file.")
      return
    }

    setFile(selectedFile)

    try {
      const rows = await parseFile(selectedFile)
      const validationError = validateRows(rows)
      
      if (validationError) {
        setError(validationError)
        setFile(null)
        return
      }

      setPreview(rows.slice(0, 5)) // Show first 5 rows as preview
    } catch (err: any) {
      setError(err.message)
      setFile(null)
    }
  }

  const generateReferenceId = () => {
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 7)
    return `${timestamp}-${randomStr}`.toUpperCase()
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const rows = await parseFile(file)
      const validationError = validateRows(rows)
      
      if (validationError) {
        setError(validationError)
        setUploading(false)
        return
      }

      // Prepare attendees data with auto-generated reference_id
      const attendees = rows.map((row) => ({
        event_id: eventId,
        personal_name: row.personal_name.trim(),
        middle_name: row.middle_name?.trim() || null,
        last_name: row.last_name.trim(),
        email: row.email?.trim() || null,
        mobile_number: row.mobile_number?.trim() || null,
        date_of_birth: row.date_of_birth || null,
        address: row.address?.trim() || null,
        company: row.company?.trim() || null,
        position: row.position?.trim() || null,
        company_address: row.company_address?.trim() || null,
        status: row.status?.trim() || "Pending",
        payment_status: row.payment_status?.trim() || "Pending",
        reference_id: generateReferenceId(), // Auto-generate unique reference ID
        attendance: [],
        payments: [],
        hasevaluation: false,
        hassentevaluation: false,
        roles: []
      }))

      // Insert into database
      const { data, error: insertError } = await supabase
        .from("attendees")
        .insert(attendees)
        .select()

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`)
      }

      setSuccess(`Successfully uploaded ${data.length} attendees!`)
      setFile(null)
      setPreview([])
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 2000)

    } catch (err: any) {
      setError(err.message || "Failed to upload attendees")
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setError(null)
    setSuccess(null)
    setPreview([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Attendees
          </DialogTitle>
          <DialogDescription>
            Import attendees from a CSV or Excel file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3 mt-2">
                <p className="font-semibold">File Format Requirements:</p>
                
                <div>
                  <p className="text-sm font-medium mb-1">Required Columns:</p>
                  <ul className="text-sm space-y-1 ml-4">
                    {requiredHeaders.map((header) => (
                      <li key={header.field} className="list-disc">
                        <code className="bg-muted px-1 py-0.5 rounded">{header.field}</code> - {header.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Optional Columns:</p>
                  <ul className="text-sm space-y-1 ml-4">
                    {optionalHeaders.map((header) => (
                      <li key={header.field} className="list-disc">
                        <code className="bg-muted px-1 py-0.5 rounded">{header.field}</code> - {header.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                cursor-pointer"
              disabled={uploading}
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Preview (first 5 rows):</p>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">First Name</th>
                      <th className="px-3 py-2 text-left">Last Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{row.personal_name}</td>
                        <td className="px-3 py-2">{row.last_name}</td>
                        <td className="px-3 py-2">{row.email || "-"}</td>
                        <td className="px-3 py-2">{row.company || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Attendees
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}