//components/certificate-template-modal.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, X, Plus, Trash2, Save, Eye, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { supabase } from "@/lib/supabase-client"

interface TextField {
  id: string
  label: string
  value: string
  x: number
  y: number
  fontSize: number
  fontWeight: "normal" | "bold"
  color: string
  align: "left" | "center" | "right"
}

interface CertificateTemplateModalProps {
  eventId: number
  open: boolean
  onClose: () => void
}

export default function CertificateTemplateModal({ eventId, open, onClose }: CertificateTemplateModalProps) {
  const [templateImage, setTemplateImage] = useState<string | null>(null)
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [textFields, setTextFields] = useState<TextField[]>([
    {
      id: "name",
      label: "Attendee Name",
      value: "{{attendee_name}}",
      x: 421,
      y: 335,
      fontSize: 36,
      fontWeight: "bold",
      color: "#2C3E50",
      align: "center"
    },
    {
      id: "event",
      label: "Event Name",
      value: "{{event_name}}",
      x: 421,
      y: 275,
      fontSize: 14,
      fontWeight: "normal",
      color: "#34495E",
      align: "center"
    },
    {
      id: "date",
      label: "Event Date",
      value: "{{event_date}}",
      x: 421,
      y: 250,
      fontSize: 14,
      fontWeight: "normal",
      color: "#34495E",
      align: "center"
    }
  ])

  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Load template from database
  useEffect(() => {
    if (open && eventId) {
      loadTemplate()
    }
  }, [open, eventId])

  const loadTemplate = async () => {
    try {
      const response = await fetch(`/api/certificate-template?eventId=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.template) {
          setTemplateImage(data.template.image_url)
          if (data.template.fields) {
            setTextFields(data.template.fields)
          }
        }
      }
    } catch (error) {
      console.error("Error loading template:", error)
    }
  }

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${eventId}-${Date.now()}.${fileExt}`
      const filePath = `certificate-templates/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('certificates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("❌ Failed to upload image")
      return null
    } finally {
      setUploading(false)
    }
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Show preview immediately
      const reader = new FileReader()
      reader.onload = (event) => {
        setTemplateImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Store file for later upload
      setTemplateFile(file)
    }
  }

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !templateImage) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = 842
      canvas.height = 595
      ctx.drawImage(img, 0, 0, 842, 595)

      textFields.forEach((field) => {
        ctx.font = `${field.fontWeight === "bold" ? "bold " : ""}${field.fontSize}px Arial`
        ctx.fillStyle = field.color
        ctx.textAlign = field.align

        let x = field.x
        if (field.align === "center") {
          x = field.x
        } else if (field.align === "right") {
          x = field.x
        }

        let displayText = field.value
        if (previewMode) {
          displayText = displayText
            .replace("{{attendee_name}}", "Juan Dela Cruz")
            .replace("{{event_name}}", "Sample Conference 2024")
            .replace("{{event_date}}", "October 16-18, 2024")
            .replace("{{event_venue}}", "Manila, Philippines")
        }

        ctx.fillText(displayText, x, field.y)

        if (selectedField === field.id && !previewMode) {
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          const metrics = ctx.measureText(displayText)
          const textWidth = metrics.width
          const textHeight = field.fontSize
          
          let boxX = x
          if (field.align === "center") {
            boxX = x - textWidth / 2
          } else if (field.align === "right") {
            boxX = x - textWidth
          }

          ctx.strokeRect(boxX - 5, field.y - textHeight, textWidth + 10, textHeight + 5)
        }
      })
    }
    img.src = templateImage
  }, [templateImage, textFields, selectedField, previewMode])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMode) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    for (const field of textFields) {
      ctx.font = `${field.fontWeight === "bold" ? "bold " : ""}${field.fontSize}px Arial`
      const metrics = ctx.measureText(field.value)
      const textWidth = metrics.width
      const textHeight = field.fontSize

      let boxX = field.x
      if (field.align === "center") {
        boxX = field.x - textWidth / 2
      } else if (field.align === "right") {
        boxX = field.x - textWidth
      }

      if (
        x >= boxX - 5 &&
        x <= boxX + textWidth + 5 &&
        y >= field.y - textHeight &&
        y <= field.y + 5
      ) {
        setSelectedField(field.id)
        setDragOffset({
          x: x - field.x,
          y: y - field.y
        })
        return
      }
    }

    setSelectedField(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedField || previewMode) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setTextFields((fields) =>
      fields.map((field) =>
        field.id === selectedField
          ? { ...field, x: x - dragOffset.x, y: y - dragOffset.y }
          : field
      )
    )
  }

  const addTextField = () => {
    const newField: TextField = {
      id: `field_${Date.now()}`,
      label: "New Field",
      value: "Sample Text",
      x: 421,
      y: 300,
      fontSize: 16,
      fontWeight: "normal",
      color: "#000000",
      align: "center"
    }
    setTextFields([...textFields, newField])
    setSelectedField(newField.id)
  }

  const updateField = (updates: Partial<TextField>) => {
    if (!selectedField) return
    setTextFields((fields) =>
      fields.map((field) =>
        field.id === selectedField ? { ...field, ...updates } : field
      )
    )
  }

  const deleteField = (id: string) => {
    setTextFields((fields) => fields.filter((field) => field.id !== id))
    if (selectedField === id) {
      setSelectedField(null)
    }
  }

  const handleSave = async () => {
    if (!templateImage) {
      alert("Please upload a template image first")
      return
    }

    setSaving(true)
    try {
      let imageUrl = templateImage

      // If there's a new file to upload, upload it first
      if (templateFile) {
        const uploadedUrl = await uploadImageToStorage(templateFile)
        if (!uploadedUrl) {
          alert("❌ Failed to upload image")
          setSaving(false)
          return
        }
        imageUrl = uploadedUrl
        setTemplateFile(null) // Clear after successful upload
      }

      const response = await fetch("/api/certificate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          imageUrl: imageUrl,
          fields: textFields
        })
      })

      if (response.ok) {
        alert("✅ Template saved successfully!")
        onClose()
      } else {
        alert("❌ Failed to save template")
      }
    } catch (error) {
      console.error("Error saving template:", error)
      alert("❌ Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  const currentField = textFields.find((f) => f.id === selectedField)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Certificate Template Editor</DialogTitle>
          <DialogDescription>
            Upload a template and customize text fields for your certificates
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Preview</h3>
              <div className="flex gap-2">
                <Button
                  variant={previewMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMode ? "Edit Mode" : "Preview"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden bg-gray-50">
              {templateImage ? (
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair"
                  onClick={handleCanvasClick}
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => setIsDragging(false)}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Upload a certificate template to get started</p>
                    <p className="text-xs mt-1">Recommended: 842x595 pixels (A4 landscape)</p>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="space-y-4">
            <Tabs defaultValue="fields" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields">Text Fields</TabsTrigger>
                <TabsTrigger value="edit">Edit Field</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="space-y-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addTextField}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Text Field
                </Button>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {textFields.map((field) => (
                    <div
                      key={field.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedField === field.id
                          ? "border-blue-500 bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedField(field.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{field.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {field.value}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteField(field.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="edit" className="space-y-4 mt-4">
                {currentField ? (
                  <>
                    <div>
                      <Label>Field Label</Label>
                      <Input
                        value={currentField.label}
                        onChange={(e) => updateField({ label: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Text / Placeholder</Label>
                      <Input
                        value={currentField.value}
                        onChange={(e) => updateField({ value: e.target.value })}
                        placeholder="Use {{attendee_name}}, {{event_name}}, etc."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Available: {"{"}{"{"} attendee_name {"}"}{"}"},
                        {"{"}{"{"} event_name {"}"}{"}"},
                        {"{"}{"{"} event_date {"}"}{"}"},
                        {"{"}{"{"} event_venue {"}"}{"}"} 
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>X Position</Label>
                        <Input
                          type="number"
                          value={Math.round(currentField.x)}
                          onChange={(e) =>
                            updateField({ x: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label>Y Position</Label>
                        <Input
                          type="number"
                          value={Math.round(currentField.y)}
                          onChange={(e) =>
                            updateField({ y: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Font Size: {currentField.fontSize}px</Label>
                      <Slider
                        value={[currentField.fontSize]}
                        onValueChange={([value]) =>
                          updateField({ fontSize: value })
                        }
                        min={8}
                        max={72}
                        step={1}
                      />
                    </div>

                    <div>
                      <Label>Font Weight</Label>
                      <Select
                        value={currentField.fontWeight}
                        onValueChange={(value: "normal" | "bold") =>
                          updateField({ fontWeight: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Text Align</Label>
                      <Select
                        value={currentField.align}
                        onValueChange={(value: "left" | "center" | "right") =>
                          updateField({ align: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={currentField.color}
                          onChange={(e) => updateField({ color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={currentField.color}
                          onChange={(e) => updateField({ color: e.target.value })}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a field to edit
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}