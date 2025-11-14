// /lib/textHelpers.ts

export function capitalizeFirstLetter(str: string): string {
    if (!str || typeof str !== "string") return "";
  
    return str
      .trim()
      .split(/\s+/)
      .map(word =>
        word
          .split("-")
          .map(part =>
            part.length > 0
              ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
              : part
          )
          .join("-")
      )
      .join(" ");
  }
  
  export function formatEventDate(startDate: string, endDate: string): string {
    if (!startDate) return "";
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
  
    const optsFull: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
  
    const optsMonthDay: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
    };
  
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString("en-US", optsFull);
    }
  
    if (
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      return `${start.toLocaleDateString("en-US", optsMonthDay)}–${end.getDate()}, ${end.getFullYear()}`;
    }
  
    if (start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString("en-US", optsMonthDay)}–${end.toLocaleDateString("en-US", optsFull)}`;
    }
  
    return `${start.toLocaleDateString("en-US", optsFull)} – ${end.toLocaleDateString("en-US", optsFull)}`;
  }
  