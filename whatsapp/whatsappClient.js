// const { Client, LocalAuth } = require("whatsapp-web.js");
// const qrcode = require("qrcode");
// let io = null;
// let initializing = false;

// let waStatus = {
//   connected: false,
//   authenticated: false,
//   ready: false,
//   qr: null,
// };

// process.on("unhandledRejection", (reason) => {
//   if (
//     String(reason).includes("Execution context was destroyed")
//   ) {
//     console.warn("⚠️ Puppeteer context destroyed — ignored");
//     return;
//   }
//   throw reason;
// });

// /* ---------------- WhatsApp Client ---------------- */
// const client = new Client({
//   authStrategy: new LocalAuth({
//     clientId: "default",
//   }),
//   puppeteer: {
//     headless: true,
//     executablePath: undefined, // force bundled Chromium
//     args: [
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--disable-dev-shm-usage",
//       "--disable-gpu",
//       "--disable-features=IsolateOrigins",
//       "--disable-site-isolation-trials",
//     ],
//   },
// });

// /* ---------------- Delay Injection (CRITICAL) ---------------- */
// const originalInject = client.inject.bind(client);
// client.inject = async () => {
//   await new Promise((res) => setTimeout(res, 3000));
//   return originalInject();
// };

// /* ---------------- WhatsApp Events ---------------- */
// client.on("qr", async (qr) => {
//   waStatus.qr = qr;
//   waStatus.authenticated = false;
//   waStatus.ready = false;

//   if (io) {
//     const qrImage = await qrcode.toDataURL(qr);
//     io.emit("qr", qrImage);
//     io.emit("status", waStatus);
//   }
// });

// client.on("authenticated", () => {
//   waStatus.authenticated = true;
//   io?.emit("status", waStatus);
// });

// client.on("ready", () => {
//   console.log("✅ WhatsApp ready");
//   waStatus.ready = true;
//   waStatus.connected = true;
//   waStatus.qr = null;
//   initializing = false;
//   io?.emit("status", waStatus);
// });

// client.on("disconnected", () => {
//   console.log("❌ WhatsApp disconnected");

//   waStatus = {
//     connected: false,
//     authenticated: false,
//     ready: false,
//     qr: null,
//   };

//   io?.emit("status", waStatus);

//   // Prevent re-init loop
//   if (!initializing) {
//     initializing = true;
//     setTimeout(() => client.initialize(), 5000);
//   }
// });

// /* ---------------- Init Client Safely ---------------- */
// if (!initializing) {
//   initializing = true;
//   client.initialize();
// }

// /* ---------------- Socket.IO Init ---------------- */
// const initSocket = (socketIO) => {
//   io = socketIO;

//   io.on("connection", (socket) => {
//     socket.emit("status", waStatus);

//     if (waStatus.qr) {
//       qrcode.toDataURL(waStatus.qr).then((qr) => {
//         socket.emit("qr", qr);
//       });
//     }
//   });
// };

// module.exports = {
//   client,
//   initSocket,
//   waStatus,
// };
