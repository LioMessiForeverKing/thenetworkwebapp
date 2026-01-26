# QR Code Setup

## Installation

To enable scannable QR codes, install the QR code library:

```bash
npm install react-qr-code
```

## What We're Generating

1. **Unique Ticket Code**: 8-character alphanumeric code (e.g., "ABC12345")
2. **QR Code**: Scannable barcode that encodes the ticket code
3. **Display**: Shows both QR code (for scanning) and text code (as backup)

## How It Works

### On the Page (`/glowdown-invitation`)
- After registration, displays a QR code that can be scanned
- QR code encodes the ticket code (e.g., "ABC12345")
- Also shows text code below QR for manual entry

### In the Email
- Includes QR code image (generated via API: qrserver.com)
- QR code encodes the ticket code
- Also includes text code for backup

### At the Door
- Staff can scan the QR code with any QR scanner app
- QR code decodes to the ticket code (e.g., "ABC12345")
- Staff can verify the code against the database
- Or use text code for manual verification

## QR Code Content

The QR code encodes just the ticket code string (e.g., "ABC12345"). When scanned, it will return that exact code.

## Alternative: Use Your Own QR Service

If you prefer to use your own QR code generation service, you can:
1. Generate QR codes server-side in the Edge Function
2. Store QR code images in Supabase Storage
3. Use a different QR code API

The current implementation uses `qrserver.com` for email QR codes (free, no API key needed) and `react-qr-code` for the web page display.
