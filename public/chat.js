const socket = io();
let currentUsername = "";

const messageForm = document.getElementById("chat-form");
const messageInput = document.getElementById("msg");
const messagesContainer = document.querySelector(".chat-messages");
const usersList = document.getElementById("users");
const leaveBtn = document.getElementById("leave-btn");
const privateMessageBtn = document.getElementById("private-msg-btn");

socket.on("connect", () => {
  currentUsername = prompt("Enter your name:") || "Anonymous";
  socket.emit("joinRoom", { username: currentUsername });
});

socket.on("message", (msg) => {
  outputMessage(msg, false);
  scrollToBottom();
});

socket.on("privateMessage", (msg) => {
  outputMessage(msg, true);
  scrollToBottom();
});

socket.on("messageHistory", (messages) => {
  messages.forEach((msg) => {
    outputMessage(
      {
        username: msg.user,
        text: msg.text,
        recipient: msg.recipient,
        createdAt: msg.createdAt,
        isPrivate: msg.isPrivate,
      },
      msg.isPrivate && msg.recipient !== currentUsername
    );
  });
  scrollToBottom();
});

socket.on("roomUsers", ({ users }) => {
  usersList.innerHTML = users
    .map(
      (user) => `
      <li>
        ${user.username}
        ${
          user.username !== currentUsername
            ? `<button class="private-btn" data-username="${user.username}">
            <i class="fas fa-envelope"></i>
          </button>`
            : ""
        }
      </li>
    `
    )
    .join("");

  document.querySelectorAll(".private-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const recipient = btn.getAttribute("data-username");
      const message = prompt(`Private message to ${recipient}:`);
      if (message) {
        socket.emit("sendPrivateMessage", {
          sender: currentUsername,
          recipient: recipient,
          text: message,
        });
      }
    });
  });
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value;
  if (message.trim()) {
    if (message.startsWith("/pm ")) {
      // Handle private message command: /pm username message
      const parts = message.split(" ");
      if (parts.length >= 3) {
        const recipient = parts[1];
        const privateMessage = parts.slice(2).join(" ");
        socket.emit("sendPrivateMessage", {
          sender: currentUsername,
          recipient: recipient,
          text: privateMessage,
        });
      }
    } else {
      socket.emit("sendMessage", {
        username: currentUsername,
        text: message,
      });
    }
    messageInput.value = "";
    messageInput.focus();
  }
});

function outputMessage(msg, isPrivate) {
  const div = document.createElement("div");
  div.classList.add("message");
  if (isPrivate) {
    div.classList.add("private-message");
  }

  const metaContent = isPrivate
    ? `Private from ${msg.username} to ${msg.recipient}`
    : msg.username;

  div.innerHTML = `
    <p class="meta">${metaContent} <span>${new Date(
    msg.createdAt
  ).toLocaleString()}</span></p>
    <p class="text">${msg.text}</p>
  `;
  document.querySelector(".chat-messages").appendChild(div);
}

function scrollToBottom() {
  const chatMessages = document.querySelector(".chat-messages");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

leaveBtn.addEventListener("click", () => {
  socket.emit("leaveRoom");
  window.location.href = "/";
});
