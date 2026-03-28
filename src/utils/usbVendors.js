export const KNOWN_USB_VENDORS = {
  0x0403: 'FTDI',
  0x067B: 'Prolific',
  0x10C4: 'Silicon Labs',
  0x1A86: 'CH340',
  0x2341: 'Arduino',
  0x239A: 'Adafruit',
  0x303A: 'Espressif',
  0x1366: 'SEGGER'
}

export const getVendorName = (vendorId) => KNOWN_USB_VENDORS[vendorId] || ''

export const getPortDisplayName = (info, index = 0) => {
  const vendorName = getVendorName(info?.usbVendorId)
  if (vendorName) return `串口 ${index + 1} (${vendorName})`
  if (info?.usbVendorId) return `串口 ${index + 1} (VID:${info.usbVendorId.toString(16).toUpperCase()})`
  return `串口 ${index + 1}`
}
