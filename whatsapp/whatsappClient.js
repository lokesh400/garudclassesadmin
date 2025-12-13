const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");

let io = null;

let waStatus = {
  connected: false,
  authenticated: false,
  ready: false,
  qr: null,
};

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "default",
  }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

/* ---------------- WhatsApp Events ---------------- */
client.on("qr", async (qr) => {
  waStatus.qr = qr;
  waStatus.authenticated = false;
  waStatus.ready = false;

  if (io) {
    const qrImage = await qrcode.toDataURL(qr);
    io.emit("qr", qrImage);
    io.emit("status", waStatus);
  }
});

client.on("authenticated", () => {
  waStatus.authenticated = true;
  io?.emit("status", waStatus);
});

client.on("ready", () => {
  console.log("✅ WhatsApp ready");
  waStatus.ready = true;
  waStatus.connected = true;
  waStatus.qr = null;
  io?.emit("status", waStatus);
});

client.on("disconnected", () => {
  console.log("❌ WhatsApp disconnected");
  waStatus = {
    connected: false,
    authenticated: false,
    ready: false,
    qr: null,
  };
  io?.emit("status", waStatus);
  client.initialize();
});

client.initialize();

/* ---------------- Socket.IO Init ---------------- */
const initSocket = (socketIO) => {
  io = socketIO;

  io.on("connection", (socket) => {
    socket.emit("status", waStatus);

    if (waStatus.qr) {
      qrcode.toDataURL(waStatus.qr).then((qr) => {
        socket.emit("qr", qr);
      });
    }
  });
};

module.exports = {
  client,
  initSocket,
  waStatus,
};
