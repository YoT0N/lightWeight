const app = require("./app");
const http = require("http");
const initializeSocket = require("./services/socketService");

const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
