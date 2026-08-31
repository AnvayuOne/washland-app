const net = require("net");

const hosts = [
  { host: "db.llhrfddkjwbyhljiafee.supabase.co", port: 5432 },
  { host: "db.llhrfddkjwbyhljiafee.supabase.co", port: 6543 },
  { host: "aws-0-ap-south-1.pooler.supabase.com", port: 6543 },
  { host: "aws-0-ap-southeast-1.pooler.supabase.com", port: 6543 },
  { host: "aws-0-us-east-1.pooler.supabase.com", port: 6543 },
  { host: "aws-0-eu-central-1.pooler.supabase.com", port: 6543 },
];

async function checkHost(target) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.on("connect", () => {
      console.log(`[SUCCESS] Connected to ${target.host}:${target.port}`);
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      console.log(`[TIMEOUT] ${target.host}:${target.port}`);
      socket.destroy();
      resolve(false);
    });
    socket.on("error", (err) => {
      console.log(`[ERROR] ${target.host}:${target.port} - ${err.message}`);
      socket.destroy();
      resolve(false);
    });
    socket.connect(target.port, target.host);
  });
}

async function run() {
  for (const h of hosts) {
    await checkHost(h);
  }
}

run();
