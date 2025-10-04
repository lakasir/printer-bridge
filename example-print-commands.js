const { printer: ThermalPrinter, types: PrinterTypes } = require("node-thermal-printer");
const printerDriver = require("@thiagoelg/node-printer"); // 👈 use new driver

let printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: "printer:POS_PRINTER", // CUPS name
  driver: printerDriver,            // 👈 pass the driver object
  width: 48,
});

async function run() {
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    console.error("Printer couldn't connect")
    return
  }
  printer.pdf417("PDF417", {
    rowHeight: 3,            // 2 - 8
    width: 3,                // 2 - 8
    correction: 1,           // Ratio: 1 - 40
    truncated: false,        // boolean
    columns: 0               // 1 - 30, 0 auto
  });
  printer.cut();
  try {
    await printer.execute();
    console.log("Printed!");
  } catch (err) {
    console.error("Error printing:", err);
  }
}

run();

