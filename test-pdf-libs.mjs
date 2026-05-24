// Quick test to verify jsPDF and html2canvas can be imported
console.log("Testing PDF library imports...\n")

try {
  const jspdfModule = await import("jspdf")
  console.log("✓ jsPDF imported successfully")
  console.log("  - jsPDF constructor:", typeof jspdfModule.jsPDF)
  console.log("  - Module keys:", Object.keys(jspdfModule).join(", "))
} catch (error) {
  console.error("✗ Failed to import jsPDF:", error.message)
}

try {
  const html2canvasModule = await import("html2canvas")
  console.log("\n✓ html2canvas imported successfully")
  console.log("  - default export:", typeof html2canvasModule.default)
} catch (error) {
  console.error("\n✗ Failed to import html2canvas:", error.message)
}

console.log("\nTest complete!")
