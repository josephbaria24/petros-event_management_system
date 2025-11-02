import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "./ui/button"
import type { Event } from "@/types/event"

function RegistrationForm({ event, onClose }: { event: Event, onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Register for {event.name}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Personal Name" className="border rounded p-2 col-span-1" />
            <input placeholder="Middle Name" className="border rounded p-2 col-span-1" />
            <input placeholder="Last Name" className="border rounded p-2 col-span-1" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Email" className="border rounded p-2" />
            <input placeholder="Mobile Number" className="border rounded p-2" />
            <input type="date" placeholder="Date of Birth" className="border rounded p-2" />
          </div>
          <input placeholder="Address" className="border rounded p-2 w-full" />

          <hr />

          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Company Name" className="border rounded p-2" />
            <input placeholder="Position" className="border rounded p-2" />
          </div>
          <input placeholder="Company Address" className="border rounded p-2 w-full" />

          <Button className="w-full bg-green-600 text-white mt-4">Submit</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
